import { Group, Mesh, CircleGeometry, PlaneGeometry, MeshStandardMaterial, MeshBasicMaterial, DataTexture, RGBAFormat, SRGBColorSpace, AdditiveBlending } from 'three'
import TyrellVKMotion from './TyrellVKMotion'
import TyrellVKArrival from './TyrellVKArrival'
import placement from './vkPlacement.generated.json'

export default class TyrellVKDevice {
    constructor(scene) {
        this.group = new Group()
        this.group.name = 'Voight-Kampff / colocación del auxiliar'
        this.group.position.fromArray(placement.position)
        this.group.quaternion.fromArray(placement.quaternion).normalize()
        this.group.scale.fromArray(placement.scale)
        this.group.add(scene)
        this.root = scene.getObjectByName('VK_Root')
        if (!this.root) throw new Error('El recurso VK no contiene su raíz mecánica.')
        this.motion = new TyrellVKMotion(this.root)
        this.arrival = new TyrellVKArrival()
        this.reflectionAge = 0
        this.reflectionNeedsRefresh = false
        this.materials = new Set()
        this.meshes = 0; this.triangles = 0
        this.root.traverse(object => {
            if (!object.isMesh) return
            this.meshes++
            this.triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3
            object.receiveShadow = true
            object.castShadow = !object.name.startsWith('VK_Cable') && object.name !== 'VK_Bellows_Skirt'
            for (const material of [].concat(object.material)) this.materials.add(material)
        })
        // A separate optical surface leaves the shared PBR atlas untouched.
        // Its local plane follows the actual lens, including the closed pose.
        this.optics = new Group()
        this.optics.name = 'VK / óptica roja'
        this.optics.position.z = -.0172
        this.optics.rotation.y = Math.PI
        this.root.getObjectByName('VK_Lens_Pivot').add(this.optics)
        this.coreMaterial = new MeshStandardMaterial({ color: 0x230302, metalness: .15, roughness: .22, emissive: 0xff0802, emissiveIntensity: 0 })
        const core = new Mesh(new CircleGeometry(.012, 32), this.coreMaterial)
        core.name = 'VK / cristal emisor'; this.optics.add(core)
        const size = 64, pixels = new Uint8Array(size * size * 4)
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const r2 = ((x + .5) / size * 2 - 1) ** 2 + ((y + .5) / size * 2 - 1) ** 2
            const offset = (y * size + x) * 4
            pixels.set([255, 25, 6, Math.round(255 * Math.max(0, Math.exp(-r2 * 7) - Math.exp(-7)))], offset)
        }
        const haloMap = new DataTexture(pixels, size, size, RGBAFormat)
        haloMap.colorSpace = SRGBColorSpace; haloMap.needsUpdate = true
        this.haloMaterial = new MeshBasicMaterial({ map: haloMap, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false })
        const halo = new Mesh(new PlaneGeometry(.085, .085), this.haloMaterial)
        halo.name = 'VK / halo local'; halo.position.z = .0002
        this.optics.add(halo)
        this.updateOptics()
    }
    toggle() {
        if (this.motion.moving) return false
        this.arrival.manual()
        return this.motion.setOpen(this.motion.state !== 'open')
    }
    update(seconds, settledP1) {
        const previousState = this.motion.state
        if (this.arrival.update(seconds, settledP1)) this.motion.setOpen(true)
        const changed = this.motion.update(seconds)
        if (changed) this.updateOptics()
        this.reflectionNeedsRefresh = false
        if (changed) {
            this.reflectionAge += Math.min(Math.max(seconds, 0), .1)
            if (this.reflectionAge >= .1 || this.motion.state !== previousState) {
                this.reflectionNeedsRefresh = true; this.reflectionAge = 0
            }
        }
        return changed
    }
    updateOptics() {
        const light = this.motion.light
        this.coreMaterial.emissiveIntensity = 8 * light
        this.haloMaterial.opacity = .28 * light
        this.optics.visible = light > .0001
        // Existing screen emission powers down together with the instrument.
        for (const material of this.materials) material.emissiveIntensity = light
    }
    diagnostics() {
        return { ...this.motion.diagnostics(), autoDeploy: this.arrival.enabled, autoConsumed: this.arrival.consumed,
            meshes: this.meshes, triangles: this.triangles, placementSourceSha256: placement.sourceSha256,
            opticalMeshes: 2, opticalTriangles: 34,
            position: this.group.position.toArray(), quaternion: this.group.quaternion.toArray(), scale: this.group.scale.toArray() }
    }
}
