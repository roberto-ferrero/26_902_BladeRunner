import { BufferAttribute, Vector3 } from 'three'
import { createTowerWindows, createFaceWindows } from './TyrellPyramidWindows'
import TyrellPyramidElevators from './TyrellPyramidElevators'

// Tyrell pyramid v3 (Blender: Carpeta trabajo Claude/Edificio piramide/piramide_v3.blend): replaces the original
// building of the scene GLB with Tyrell_Pyramid_v3.glb (same world placement), with procedural office windows on the
// towers and on the pyramid faces, and the elevator lane (darker rails, moving cabins, lamps, beams and strobes).
export const PYRAMID = Object.freeze({
    asset: 'glbs/E26902_BladeRunner/Tyrell_Pyramid_v3.glb?v=1',
    replaces: 'Tyrell_Corporation_Pyramid',
    building: 'Tyrell_Pyramid_v1',
    leaning: 'Tyrell_Pyramid_v1001'   // the leaning buildings (glTF 'Tyrell_Pyramid_v1.001', sanitized by GLTFLoader): the only part kept with { main: false }
})

// The -X and -Z faces (and the leaning buildings on them) face away from every camera of the scene,
// which all sit on the +Z side of the pyramid. Keep only triangles touching the visible half: drop
// those entirely in the half-plane (x - cx) + (z - cz) < 0 around the pyramid axis. Runs before the
// elevators and the beacons, so neither is placed on the removed faces.
function cullHiddenFaces(scene, building) {
    const centre = building.getWorldPosition(new Vector3()), v = new Vector3()
    const side = (positions, i, matrix) => { v.fromBufferAttribute(positions, i).applyMatrix4(matrix); return v.x - centre.x + v.z - centre.z }
    let removed = 0
    scene.traverse(object => {
        if (!object.isMesh || object.name === PYRAMID.leaning || /ascensor/.test(object.name)) return
        const geometry = object.geometry, positions = geometry.attributes.position
        const index = geometry.index ? geometry.index.array : Array.from({ length: positions.count }, (_, i) => i)
        const keep = []
        for (let t = 0; t < index.length; t += 3) {
            const a = side(positions, index[t], object.matrixWorld), b = side(positions, index[t + 1], object.matrixWorld)
            const c = side(positions, index[t + 2], object.matrixWorld)
            if (Math.max(a, b, c) <= .01 && a + b + c < -.03) removed++
            else keep.push(index[t], index[t + 1], index[t + 2])
        }
        if (keep.length === index.length) return
        // Compact the vertex buffers too: the beacons scan every vertex, not only the indexed ones.
        const remap = new Map(), order = []
        for (const i of keep) if (!remap.has(i)) { remap.set(i, order.length); order.push(i) }
        for (const [name, attribute] of Object.entries(geometry.attributes)) {
            // glTF attributes may be interleaved: copy the raw (possibly normalized) components.
            const size = attribute.itemSize, interleaved = attribute.isInterleavedBufferAttribute
            const source = interleaved ? attribute.data.array : attribute.array
            const stride = interleaved ? attribute.data.stride : size, offset = interleaved ? attribute.offset : 0
            const array = new source.constructor(order.length * size)
            order.forEach((i, j) => { for (let k = 0; k < size; k++) array[j * size + k] = source[i * stride + offset + k] })
            geometry.setAttribute(name, new BufferAttribute(array, size, attribute.normalized))
        }
        geometry.setIndex(keep.map(i => remap.get(i)))
        geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    })
    return removed
}

export default class TyrellPyramid {
    constructor(world, scene, { windows = true, main = true, cullHidden = false } = {}) {
        const old = world.getObjectByName(PYRAMID.replaces)
        this.removed = old ? old.name : null
        if (old) { old.removeFromParent(); old.traverse(object => object.geometry?.dispose()) }   // its concrete material may be shared
        this.root = scene
        scene.name = 'Tyrell / pirámide v3'
        world.add(scene)
        scene.updateMatrixWorld(true)
        // Same weathered concrete as the scene GLB: reuse its GPU textures and drop the copies of the building GLB.
        const source = old && [].concat(old.material).find(material => material.map)
        this.sharedTextures = 0
        if (source) {
            const copies = new Set()
            scene.traverse(object => {
                for (const material of object.isMesh ? [].concat(object.material) : []) {
                    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
                        if (!material[key] || !source[key] || material[key] === source[key]) continue
                        copies.add(material[key]); material[key] = source[key]; material.needsUpdate = true
                    }
                }
            })
            for (const texture of copies) { texture.source?.data?.close?.(); texture.dispose() }
            this.sharedTextures = copies.size
        }
        this.building = scene.getObjectByName(PYRAMID.building)
        if (!this.building) throw new Error(`Falta ${PYRAMID.building} en el GLB de la pirámide.`)
        this.culled = cullHidden ? cullHiddenFaces(scene, this.building) : 0
        this.windows = { towerWindows: createTowerWindows(), faceWindows: createFaceWindows() }
        const systems = windows ? { 'Torres | ventanas': this.windows.towerWindows, 'Piramide | ventanas': this.windows.faceWindows } : {}
        const replaced = new Map()
        this.stats = { meshes: 0, triangles: 0 }
        scene.traverse(object => {
            if (!object.isMesh) return
            this.stats.meshes++
            const geometry = object.geometry
            this.stats.triangles += (geometry.index?.count || geometry.attributes.position.count) / 3
            // The rail mesh has no UVs but shares the textured concrete: planar coordinates in metres.
            if (!geometry.attributes.uv && [].concat(object.material).some(material => material.map)) {
                const p = geometry.attributes.position, uv = new Float32Array(p.count * 2)
                for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) + p.getZ(i)) / 400; uv[2 * i + 1] = p.getY(i) / 400 }
                geometry.setAttribute('uv', new BufferAttribute(uv, 2))
            }
            const swap = material => {
                const system = systems[material.name]
                if (!system) return material
                if (!replaced.has(material)) replaced.set(material, system.material(material))
                return replaced.get(material)
            }
            object.material = Array.isArray(object.material) ? object.material.map(swap) : swap(object.material)
        })
        this.materials = [...replaced.values()]
        this.elevators = new TyrellPyramidElevators(scene, this.building)
        // Temporary: without the main building, only the leaning buildings stay (no elevators, windows or beacons).
        this.main = main
        if (!main) {
            this.elevators.dispose()
            for (const object of [...scene.children]) {
                if (object.name === PYRAMID.leaning) continue
                object.removeFromParent(); object.traverse(child => child.geometry?.dispose())
            }
        }
    }
    configure(group, values) {
        if (group === 'elevators') { if (this.main) this.elevators.configure(values) }
        else this.windows[group]?.configure(values)
    }
    update(delta) { return this.main ? this.elevators.update(delta) : false }
    diagnostics() {
        return { asset: PYRAMID.asset, replaced: this.removed, ...this.stats, windowMaterials: this.materials.length, sharedTextures: this.sharedTextures,
            main: this.main, culledTriangles: this.culled, elevators: this.main ? this.elevators.diagnostics() : null }
    }
    dispose() {
        if (this.main) this.elevators.dispose()
        this.materials.forEach(material => material.dispose())
        // Geometry, textures and the remaining materials belong to the GLB scene (disposeScene).
    }
}
