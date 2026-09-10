import { Vector2, Vector3 } from 'three'
import { Fn, uniform, vec2, vec3, float, screenUV, perspectiveDepthToViewZ } from 'three/tsl'

// Camera optics only; neither the reflection probes nor scene illumination see this light.
export default class TyrellLensFlare {
    constructor(disc, isActive = () => true) {
        this.disc = disc; this.isActive = isActive
        this.settings = { enabled: true, intensity: 0.18, size: 1 }
        this.center = uniform(new Vector2(.5, .5)); this.radius = uniform(new Vector2())
        this.depth = uniform(1); this.near = uniform(.1); this.far = uniform(2000)
        this.aspect = uniform(1); this.energy = uniform(0); this.size = uniform(1)
    }
    configure(values) {
        if (typeof values.enabled === 'boolean') this.settings.enabled = values.enabled
        for (const [key, min, max] of [['intensity', 0, .6], ['size', .5, 2]]) {
            if (Number.isFinite(values[key])) this.settings[key] = Math.max(min, Math.min(max, values[key]))
        }
    }
    update(camera) {
        this.energy.value = 0
        if (!this.settings.enabled || !this.isActive() || !this.disc.visible) return
        camera.updateMatrixWorld(); this.disc.updateWorldMatrix(true, false)
        this.disc.geometry.computeBoundingSphere()
        const sphere = this.disc.geometry.boundingSphere.clone().applyMatrix4(this.disc.matrixWorld)
        const view = sphere.center.clone().applyMatrix4(camera.matrixWorldInverse)
        if (view.z >= -camera.near) return
        const ndc = sphere.center.clone().project(camera)
        const u = ndc.x * .5 + .5, v = .5 - ndc.y * .5
        const edge = Math.min(u, 1-u, v, 1-v)
        if (edge <= 0) return
        const fade = Math.min(1, edge / .08)
        this.center.value.set(u, v); this.depth.value = -view.z
        this.radius.value.set(sphere.radius * camera.projectionMatrix.elements[0] / (-view.z * 2), sphere.radius * camera.projectionMatrix.elements[5] / (-view.z * 2))
        this.near.value = camera.near; this.far.value = camera.far
        this.aspect.value = camera.aspect; this.size.value = this.settings.size
        this.energy.value = this.settings.intensity * fade * fade * (3 - 2 * fade)
    }
    createNode(depthTexture) {
        return Fn(() => {
            const visibility = float(0).toVar()
            const samples = [[0, 0]]
            for (let i = 0; i < 12; i++) {
                const angle = i * Math.PI / 6, r = i % 2 ? .78 : .42
                samples.push([Math.cos(angle)*r, Math.sin(angle)*r])
            }
            for (const offset of samples) {
                const uv = this.center.add(this.radius.mul(vec2(...offset))).clamp(.0001, .9999)
                const distance = perspectiveDepthToViewZ(depthTexture.sample(uv).r, this.near, this.far).negate()
                visibility.addAssign(distance.smoothstep(this.depth.sub(3), this.depth.sub(1)))
            }
            const metric = vec2(this.aspect, 1)
            const delta = screenUV.sub(this.center).mul(metric)
            const halo = delta.length().div(this.size.mul(.032)).pow(2).negate().exp().mul(.5)
            const glow = vec3(1, .65, .3).mul(halo).toVar()
            for (const [position, radius, strength] of [[.35,.013,.09],[.8,.022,.045],[1.3,.009,.07]]) {
                const center = vec2(.5).add(vec2(.5).sub(this.center).mul(position))
                const r = screenUV.sub(center).mul(metric).length().div(this.size.mul(radius))
                const ghost = r.pow(2).mul(-3).exp().mul(strength)
                glow.addAssign(vec3(1,.72,.42).mul(ghost))
            }
            return glow.mul(visibility.div(samples.length)).mul(this.energy)
        })()
    }
    diagnostics() { return { ...this.settings, source: 'visible solar disc only', screenPosition: this.center.value.toArray(), energyBeforeOcclusion: this.energy.value, occlusion: '13 scene-depth samples over solar disc; partial coverage', extraRenderPasses: 0 } }
}
