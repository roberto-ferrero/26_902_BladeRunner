import { Color } from 'three'
import { Fn, cameraPosition, positionWorld, uniform, output, vec4 } from 'three/tsl'

// Art-directed depth, in metres. The back opening separates two half-spaces.
// Interior path is capped: this is not an enclosed volume or shadowed scattering.
export const ATMOSPHERE = Object.freeze({ boundary: -14.4, interiorPath: 24, exteriorDensity: 0.00025, interiorDensity: 0.0015 })

export default class TyrellAtmosphere {
    constructor(scene, world) {
        this.scene = scene
        this.original = scene.fogNode
        this.settings = { exterior: false, interior: false, exteriorStrength: 1, interiorStrength: 1 }
        this.exterior = uniform(0)
        this.interior = uniform(0)
        this.materials = new Map()
        // The photographed sky already includes aerial perspective; keep its sun intact.
        world.traverse(object => {
            if (!object.isMesh || !/^(Cielo|Sol)/.test(object.name)) return
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                if (!this.materials.has(material)) this.materials.set(material, material.fog)
                material.fog = false
                material.needsUpdate = true
            }
        })
        const exteriorColor = uniform(new Color('#ae8050'))
        const interiorColor = uniform(new Color('#635344'))
        this.node = Fn(() => {
            const ray = positionWorld.sub(cameraPosition)
            const distance = ray.length()
            const start = cameraPosition.z.negate().add(ATMOSPHERE.boundary)
            const end = positionWorld.z.negate().add(ATMOSPHERE.boundary)
            // Integral of the exterior half-space along the actual camera ray.
            // Works for reverse views, a camera outside, and reflected cameras too.
            const fraction = ray.z.abs().lessThan(0.00001).select(
                start.greaterThan(0).select(1, 0),
                end.max(0).sub(start.max(0)).abs().div(ray.z.abs().max(0.00001)).clamp(0, 1)
            )
            const exteriorPath = distance.mul(fraction)
            const interiorPath = distance.sub(exteriorPath).clamp(0, ATMOSPHERE.interiorPath)
            const exteriorFactor = exteriorPath.mul(this.exterior).negate().exp().oneMinus().min(0.35)
            const interiorFactor = interiorPath.mul(this.interior).negate().exp().oneMinus().min(0.065)
            const distant = exteriorFactor.mix(output.rgb, exteriorColor)
            return vec4(interiorFactor.mix(distant, interiorColor), output.a)
        })()
        // Disabled by default, preserving the archived R01 comparison on reload.
    }
    configure(values) {
        for (const key of ['exterior', 'interior']) if (typeof values[key] === 'boolean') this.settings[key] = values[key]
        for (const key of ['exteriorStrength', 'interiorStrength']) {
            if (Number.isFinite(values[key])) this.settings[key] = Math.max(0, Math.min(2, values[key]))
        }
        this.exterior.value = this.settings.exterior ? ATMOSPHERE.exteriorDensity * this.settings.exteriorStrength : 0
        this.interior.value = this.settings.interior ? ATMOSPHERE.interiorDensity * this.settings.interiorStrength : 0
        this.scene.fogNode = this.settings.exterior || this.settings.interior ? this.node : this.original
    }
    diagnostics() {
        return { ...this.settings, ...ATMOSPHERE, effectiveDensity: [this.exterior.value, this.interior.value], excludedMaterials: [...this.materials.keys()].map(m => m.name), method: 'Analytic split depth; no light shafts, dust or volumetric occlusion', extraRenderPasses: 0 }
    }
    dispose() {
        this.scene.fogNode = this.original
        for (const [material, fog] of this.materials) { material.fog = fog; material.needsUpdate = true }
        this.materials.clear()
    }
}
