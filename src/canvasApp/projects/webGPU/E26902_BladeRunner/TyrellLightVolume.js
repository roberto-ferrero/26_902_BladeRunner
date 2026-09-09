import { Color, Vector3 } from 'three'
import { Fn, renderGroup, If, Loop, float, vec2, vec3, vec4, uniform, texture, cameraWorldMatrix, positionWorld } from 'three/tsl'
const cameraPosition = cameraWorldMatrix.element(3).xyz

// Single scattering integrated up to the visible surface, using the existing solar depth map.
export default class TyrellLightVolume {
    constructor(getSun) {
        this.getSun = getSun
        this.settings = { enabled: false, dust: true, strength: 1, speed: 1 }
        this.strength = uniform(0).setGroup(renderGroup).setName('tyrellVolumeStrength')
        this.dust = uniform(1).setGroup(renderGroup)
        this.clock = uniform(0).setGroup(renderGroup)
        this.steps = uniform(40, 'int').setGroup(renderGroup)
        this.direction = uniform(new Vector3()).setGroup(renderGroup)
        this.radiance = uniform(new Color()).setGroup(renderGroup)
        this.node = null
        this.lastReflectionTick = -1
        this.reflectionClock = 0
    }
    configure(values) {
        for (const key of ['enabled', 'dust']) if (typeof values[key] === 'boolean') this.settings[key] = values[key]
        for (const key of ['strength', 'speed']) if (Number.isFinite(values[key])) this.settings[key] = Math.max(0, Math.min(2, values[key]))
        this.strength.value = this.settings.enabled ? this.settings.strength : 0
        this.dust.value = this.settings.dust ? 1 : 0
    }
    setQuality(quality) { this.steps.value = { Baja: 24, Media: 40, Alta: 64 }[quality] || 40 }
    update(dt) {
        if (!this.settings.enabled) return false
        const sun = this.getSun()
        if (!sun?.shadow.map) return false
        if (!this.node) this.createNode(sun)
        const target = sun.target.getWorldPosition(new Vector3())
        this.direction.value.copy(sun.getWorldPosition(new Vector3())).sub(target).normalize()
        this.radiance.value.copy(sun.color).multiplyScalar(sun.visible ? sun.intensity * 0.18 : 0)
        const animated = this.settings.dust && this.settings.speed > 0
        if (animated) this.clock.value += Math.min(Math.max(dt, 0), 0.05) * this.settings.speed
        // Density drifts very slowly: refresh its planar contribution at 10 Hz.
        // Camera motion still invalidates the reflector independently every render.
        this.reflectionClock += Math.min(Math.max(dt, 0), 0.05)
        const tick = Math.floor(this.reflectionClock * 10)
        const refresh = animated && tick !== this.lastReflectionTick
        this.lastReflectionTick = tick
        return refresh
    }
    createNode(sun) {
        const depth = texture(sun.shadow.map.depthTexture)
        depth.onRenderUpdate(() => {
            const map = this.getSun()?.shadow.map
            if (map) depth.value = map.depthTexture
        })
        const matrix = uniform(sun.shadow.matrix.clone()).setGroup(renderGroup).onRenderUpdate(() => this.getSun().shadow.matrix)
        this.node = Fn(() => {
            const delta = positionWorld.sub(cameraPosition)
            const distance = delta.length().max(0.0001)
            const ray = delta.div(distance)
            const safe = vec3(...['x', 'y', 'z'].map(axis => ray[axis].abs().lessThan(0.00001).select(0.00001, ray[axis])))
            const a = vec3(-9, 0.08, -14.4).sub(cameraPosition).div(safe)
            const b = vec3(9, 8, 2).sub(cameraPosition).div(safe)
            const low = a.min(b), high = a.max(b)
            const entry = low.x.max(low.y).max(low.z).max(0)
            const exit = high.x.min(high.y).min(high.z).min(distance)
            const step = exit.sub(entry).max(0).div(this.steps)
            const integral = float(0).toVar()
            If(this.strength.greaterThan(0), () => {
            Loop(this.steps, ({ i }) => {
                const p = cameraPosition.add(ray.mul(entry.add(float(i).add(0.5).mul(step))))
                const projected = matrix.mul(vec4(p, 1))
                const coord = projected.xyz.div(projected.w)
                const uv = vec2(coord.x, coord.y.oneMinus())
                const inside = coord.greaterThanEqual(vec3(0)).all().and(coord.lessThanEqual(vec3(1)).all())
                const lit = depth.sample(uv.clamp(0.001, 0.999)).compare(coord.z.sub(0.00015)).r.mul(inside.select(1, 0))
                // Slow world-space density variation: suspended dust, not screen-space grain.
                const drift = this.clock.mul(0.075)
                const variation = p.x.mul(2.3).add(drift).sin().mul(p.y.mul(3.1).sub(drift).sin()).mul(p.z.mul(1.7).add(drift).sin())
                const density = variation.mul(this.dust).mul(0.28).add(1)
                const edge = p.y.smoothstep(0.08, 0.55).mul(p.y.smoothstep(6, 8).oneMinus())
                integral.addAssign(lit.mul(density).mul(edge).mul(step))
            })
            })
            const phase = ray.dot(this.direction).max(0).pow(4).mul(0.65).add(0.35)
            const amount = integral.mul(this.strength).mul(0.004).negate().exp().oneMinus().mul(phase).min(0.38)
            return vec4(this.radiance.mul(amount), amount)
        })()
    }
    diagnostics() {
        return { ...this.settings, ready: !!this.node, steps: this.steps.value, bounds: [[-9, 0.08, -14.4], [9, 8, 2]], time: this.clock.value, reflectionRefreshHz: 10, scatteringDensity: 0.004, solarRadianceScale: 0.18, source: 'solar shadow depth; bounded single scattering; procedural dust density', extraRenderPasses: 0 }
    }
    dispose() { this.node = null } // Shadow texture belongs to the light; never dispose it here.
}
