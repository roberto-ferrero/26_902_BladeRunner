import { Object3D } from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { reflector, normalWorldGeometry, normalView, normalViewGeometry, positionViewDirection,
    materialRoughness, screenUV, vec2, float } from 'three/tsl'

// Planar radiance with a bounded, art-directed specular contribution; retains the direct PBR light.
export default class TyrellFloorReflection {
    constructor(root) {
        this.enabled = false
        this.mode = 'stone'
        this.target = new Object3D()
        this.target.name = 'Tyrell / plano de reflexion del pavimento'
        this.target.rotation.x = -Math.PI / 2
        root.add(this.target)
        this.node = reflector({ target: this.target, resolutionScale: .5, generateMipmaps: true, bounces: false, samples: 0 })
        // Captures and live views can render different cameras within the same animation frame.
        this.node.reflector.updateBeforeType = 'render'
        this.contribution = this.node.rgb.mul(.18).mul(normalWorldGeometry.y.greaterThan(.99))
        const rough = materialRoughness.clamp(0, 1)
        const fresnel = float(.04).add(float(.96).mul(float(1).sub(normalView.dot(positionViewDirection).clamp(0, 1)).pow(5)))
        // Perturb the reflected image using the same mapped normal/normalScale as the PBR surface.
        const distortion = normalView.sub(normalViewGeometry).xy.mul(vec2(-1, 1)).mul(.045)
        const reflected = this.node.sample(screenUV.flipX().add(distortion).clamp(.001, .999)).level(rough.mul(10).clamp(0, 5))
        this.stoneContribution = reflected.rgb.mul(fresnel).mul(.32).mul(float(1).sub(rough.mul(.65)))
            .mul(normalWorldGeometry.y.greaterThan(.99))
        this.materials = new Map()
        this.meshes = []
        root.traverse(object => {
            if (!object.isMesh || !object.name.startsWith('Pavimento_')) return
            const original = object.material
            if (!original.isMeshStandardMaterial) return
            let material = this.materials.get(original)
            if (!material) {
                material = new MeshStandardNodeMaterial()
                // Copy standard PBR properties and retain the existing maps by identity.
                for (const key of ['name', 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'aoMapIntensity',
                    'roughness', 'metalness', 'side', 'transparent', 'opacity', 'depthWrite', 'depthTest']) material[key] = original[key]
                material.color.copy(original.color)
                material.normalScale.copy(original.normalScale)
                material.emissive.copy(original.emissive)
                material.emissiveIntensity = original.emissiveIntensity
                this.materials.set(original, material)
            }
            object.material = material
            this.meshes.push({ object, original })
        })
    }
    setEnabled(enabled) {
        this.enabled = Boolean(enabled)
        for (const material of this.materials.values()) {
            material.emissiveNode = this.enabled ? (this.mode === 'stone' ? this.stoneContribution : this.contribution) : null
            material.needsUpdate = true
        }
    }
    setMode(mode) {
        if (!['stone', 'prototype'].includes(mode)) return
        this.mode = mode
        this.setEnabled(this.enabled)
    }
    diagnostics() {
        return { enabled: this.enabled, mode: this.mode, status: '5.2 art-directed planar specular; Schlick, roughness mip blur and mapped-normal distortion',
            planeY: 0, gain: this.mode === 'stone' ? .32 : .18, fresnelF0: .04, roughnessLodScale: 10,
            maxLod: 5, normalDistortion: .045, resolutionScale: .5, mipmaps: true, bounces: false,
            meshes: this.meshes.length, sharedMaterials: this.materials.size,
            targets: [...this.node.reflector.renderTargets.values()].map(rt => ({ width: rt.width, height: rt.height })) }
    }
    dispose() {
        this.node.dispose()
        this.node.reflector.renderTargets.clear()
        this.target.removeFromParent()
        for (const { object, original } of this.meshes) object.material = original
        for (const material of this.materials.values()) material.dispose()
        this.materials.clear()
        this.meshes.length = 0
    }
}
