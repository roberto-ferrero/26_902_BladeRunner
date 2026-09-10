import { Color } from 'three'
import { Fn, texture, uniform, normalWorldGeometry, cameraWorldMatrix, equirectUV, vec2, vec3, vec4, mix, renderGroup } from 'three/tsl'

// One continuous spherical sky. The original plane is retained only for comparison/probes.
export default class TyrellSky {
    constructor(scene, originalSky, panorama) {
        this.scene = scene; this.originalSky = originalSky; this.panorama = panorama
        this.previous = scene.backgroundNode
        this.originalVisible = originalSky.visible
        this.enabled = true; this.studio = false
        const radiance = uniform(new Color()).setGroup(renderGroup).onRenderUpdate(() => originalSky.material.emissive)
        const sky = texture(panorama)
        const original = texture(originalSky.material.emissiveMap)
        this.node = Fn(() => {
            // Tilt the panorama 25 degrees to frame the detailed cloud bank above the sun.
            const ray = normalWorldGeometry.normalize()
            const direction = vec3(ray.x, ray.y.mul(0.906307787).sub(ray.z.mul(0.422618262)), ray.y.mul(0.422618262).add(ray.z.mul(0.906307787)))
            const uv = equirectUV(vec3(direction.z.negate(), direction.y, direction.x))
            const raw = sky.sample(uv).rgb
            // Fade the longitude join and poles instead of exposing a bitmap edge.
            const seam = uv.x.min(uv.x.oneMinus()).smoothstep(0, 0.025)
            const joined = mix(sky.sample(vec2(0.001, uv.y)).rgb.add(sky.sample(vec2(0.999, uv.y)).rgb).mul(0.5), raw, seam)
            const poles = uv.y.min(uv.y.oneMinus()).smoothstep(0, 0.04)
            const panoramic = mix(sky.sample(vec2(0.5, uv.y)).rgb, joined, poles)
            // Recover the authored projection, including translation during camera pan.
            // Blend INSIDE the photo perimeter, never extend clamped border pixels.
            const camera = cameraWorldMatrix.element(3).xyz
            const t = camera.z.add(900).div(ray.z.negate().max(0.00001))
            const point = camera.add(ray.mul(t))
            const photoUV = vec2(point.x.add(500).div(1000), point.y.negate().add(260).div(500))
            const edge = photoUV.min(photoUV.oneMinus())
            const weight = edge.x.min(edge.y).smoothstep(0, 0.12)
                .mul(ray.z.lessThan(-0.00001).select(1, 0))
                .mul(camera.z.greaterThan(-900).select(1, 0))
            const authored = original.sample(photoUV.clamp(0.0001, 0.9999)).rgb
            return vec4(mix(panoramic, authored, weight).mul(radiance), 1)
        })()
        this.apply()
    }
    setEnabled(enabled) { this.enabled = Boolean(enabled); this.apply() }
    setStudio(studio) { this.studio = studio; this.apply() }
    apply() {
        this.scene.backgroundNode = this.enabled && !this.studio ? this.node : this.previous
        this.originalSky.visible = this.originalVisible && !this.enabled && !this.studio
    }
    withOriginalBackground(callback) {
        const current = this.scene.backgroundNode, visible = this.originalSky.visible
        this.scene.backgroundNode = this.previous
        this.originalSky.visible = this.originalVisible && !this.studio
        try { return callback() } finally { this.scene.backgroundNode = current; this.originalSky.visible = visible }
    }
    diagnostics() { return { enabled: this.enabled, studio: this.studio, coverage: '360 x 180 degrees', version: 3, panoramaPitchDegrees: 25, originalProjection: true, interiorBlendUV: 0.12, originalPlaneVisible: this.originalSky.visible, originalRectanglePreserved: false, source: 'textures/E26902_BladeRunner/sky-panorama-v2.png', size: [this.panorama.image.width, this.panorama.image.height], visualOnly: true, probeUsesOriginalBackground: true } }
    dispose() { this.scene.backgroundNode = this.previous; this.originalSky.visible = this.originalVisible; this.node.dispose(); this.panorama.dispose() }
}
