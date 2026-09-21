import { AdditiveBlending, Box3, DataTexture, Group, LinearFilter, Sprite, SpriteMaterial, Vector3 } from 'three'

export const FLAME_TOWERS = Object.freeze([
    Object.freeze({ x: 400, z: -460, top: 28 }),
    Object.freeze({ x: -680, z: -700, top: 24 }),
    Object.freeze({ x: -900, z: -830, top: 15 })
])
export const FLAMES = Object.freeze({ enabled: true, interval: 4.5, intensity: .65, size: 3.5, rise: 2, initialDelay: 2.5,
    duration: 4.4, particles: 9, reflectionHz: 8, environmentHz: 1 })
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
// Includes all billboards at their maximum extent, not just their centres.
export const flameBounds = (tower, size = FLAMES.size, rise = FLAMES.rise) => {
    // Conservative sphere radius includes every rotated sprite, including the
    // elevated glow and bottom-anchored narrow jet, at any camera orientation.
    const radius = Math.max(8, Math.hypot(12, 18 * rise / 3.5) / 2) * size + 5
    return new Box3(new Vector3(tower.x - radius, tower.top - radius, tower.z - radius),
        new Vector3(tower.x + radius, tower.top + 1 + 28 * rise * size / 3.5 + radius, tower.z + radius))
}

export function createFlameTexture() {
    const size = 128, data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const u = (x + .5) / size * 2 - 1, v = (y + .5) / size * 2 - 1
        const angle = Math.atan2(v, u), radius = Math.hypot(u, v)
        const edge = .75 + .09 * Math.sin(angle * 5 + .8) + .055 * Math.sin(angle * 9 - .4)
        const noise = .64 + .18 * Math.sin(u * 19 + Math.sin(v * 13) * 2)
            + .12 * Math.sin(v * 31 + Math.sin(u * 21))
        const alpha = smooth((edge - radius) / .26) * (.55 + .45 * noise) * smooth((1 - radius) / .18)
        const hot = Math.max(0, 1 - radius * 1.25) * noise
        const i = (y * size + x) * 4
        data[i] = 255; data[i + 1] = Math.round(80 + hot * 170)
        data[i + 2] = Math.round(8 + hot * 95); data[i + 3] = Math.round(alpha * 255)
    }
    const texture = new DataTexture(data, size, size)
    texture.name = 'City / turbulent warm flare lobes'
    texture.minFilter = texture.magFilter = LinearFilter; texture.needsUpdate = true
    return texture
}

export default class TyrellFlames {
    constructor(world, city) {
        this.city = city
        this.settings = { enabled: FLAMES.enabled, interval: FLAMES.interval,
            intensity: FLAMES.intensity, size: FLAMES.size, rise: FLAMES.rise }
        this.group = new Group(); this.group.name = 'Tyrell / industrial flares 9.5'
        this.texture = createFlameTexture(); this.time = 0; this.nextIn = FLAMES.initialDelay
        this.emissions = 0; this.active = null; this.dirty = true
        this.emitters = FLAME_TOWERS.map((tower, index) => {
            const group = new Group(); group.name = `City / flare ${index + 1}`
            group.position.set(tower.x, tower.top, tower.z); group.visible = false
            const sprites = Array.from({ length: FLAMES.particles + 2 }, (_, i) => {
                const material = new SpriteMaterial({ map: this.texture, blending: AdditiveBlending,
                    depthTest: true, depthWrite: false, fog: false, opacity: 0 })
                material.name = `City / flame ${index + 1} layer ${i}`
                const sprite = new Sprite(material); sprite.visible = false; group.add(sprite)
                return sprite
            })
            sprites[FLAMES.particles].center.set(.5, 0)
            this.group.add(group)
            return { group, sprites, tower }
        })
        world.add(this.group)
    }
    configure(values) {
        if (typeof values.enabled === 'boolean') this.settings.enabled = values.enabled
        if (Number.isFinite(values.interval)) {
            const interval = Math.max(2, Math.min(60, values.interval))
            this.nextIn *= interval / this.settings.interval; this.settings.interval = interval
        }
        if (Number.isFinite(values.intensity)) this.settings.intensity = Math.max(0, Math.min(1.5, values.intensity))
        if (Number.isFinite(values.size)) this.settings.size = Math.max(1, Math.min(5, values.size))
        if (Number.isFinite(values.rise)) this.settings.rise = Math.max(1, Math.min(3, values.rise))
        this.dirty = true
    }
    update(delta) {
        const dt = Number.isFinite(delta) ? Math.max(0, Math.min(.1, delta)) : 0
        const enabled = this.settings.enabled && this.settings.intensity > 0 && this.city.group.visible
        const wasActive = !!this.active
        this.group.visible = enabled
        if (!enabled) {
            this.active = null; this.nextIn = FLAMES.initialDelay
            this.emitters.forEach(e => { e.group.visible = false })
        } else {
            this.time += dt; this.nextIn -= dt
            if (!this.active && this.nextIn <= 1e-8) {
                const index = [0, 1, 0, 2, 1, 0, 2][this.emissions % 7]
                this.active = { index, age: Math.max(0, -this.nextIn) }; this.emissions++
                this.nextIn += this.settings.interval * (.85 + .3 * ((this.emissions * .61803398875) % 1))
            } else if (this.active) this.active.age += dt
            if (this.active && this.active.age >= FLAMES.duration) this.active = null
            this.emitters.forEach((emitter, index) => {
                emitter.group.visible = this.active?.index === index
                if (!emitter.group.visible) return
                const age = this.active.age, strength = this.settings.intensity * (index ? .8 : 1)
                emitter.sprites.forEach((sprite, k) => {
                    if (k < FLAMES.particles) {
                        const offset = k * .14, elapsed = age - offset, cycle = Math.floor(elapsed / 1.5)
                        const birth = offset + cycle * 1.5, p = (elapsed / 1.5) - cycle
                        sprite.visible = elapsed >= 0 && birth <= 2.6
                        if (!sprite.visible) return
                        const rise = p * 28 * this.settings.rise * this.settings.size / 3.5
                        const spread = p * p * 3
                        sprite.position.set(Math.sin(k * 2.4 + cycle) * spread + p * p * 2,
                            1 + rise, Math.cos(k * 1.7 + cycle) * spread)
                        // Narrow at the nozzle; the broadest lobes form aloft.
                        const size = (.55 + 8.5 * smooth(p / .8)) * (.85 + .12 * Math.sin(k))
                        sprite.scale.set(size * this.settings.size, size * 1.2 * this.settings.size, 1)
                        sprite.material.rotation = Math.sin(k * 2 + age * .7) * .45
                        sprite.material.color.setRGB(2.4 - p, 1.65 - p, .75 - p * .5)
                        sprite.material.opacity = strength * smooth(p / .08) * smooth((1 - p) / .3) * .55
                    } else {
                        const envelope = smooth(age / .28) * smooth((3.1 - age) / .9)
                        sprite.visible = envelope > 0
                        const jet = k === FLAMES.particles
                        const heightScale = this.settings.rise * this.settings.size / 3.5
                        sprite.position.set(0, jet ? 0 : 15 * heightScale, 0)
                        sprite.scale.set((jet ? 1.1 : 12) * this.settings.size,
                            (jet ? 10 : 18) * heightScale, 1)
                        sprite.material.color.setRGB(jet ? 3 : .5, jet ? 2.1 : .2, jet ? .8 : .04)
                        sprite.material.opacity = strength * envelope * (jet ? .75 : .08)
                    }
                })
            })
        }
        const changing = wasActive || !!this.active
        const transition = wasActive !== !!this.active
        const reflectionTick = Math.floor(this.time * FLAMES.reflectionHz)
        const environmentTick = Math.floor(this.time * FLAMES.environmentHz)
        this.environmentNeedsRefresh = this.dirty || transition || changing && environmentTick !== this.environmentTick
        const refresh = this.dirty || transition || changing && reflectionTick !== this.reflectionTick
        this.environmentTick = environmentTick; this.reflectionTick = reflectionTick; this.dirty = false
        return refresh
    }
    diagnostics() {
        return { ...this.settings, visible: this.group.visible, emissions: this.emissions, nextIn: this.nextIn,
            active: this.active ? { ...this.active } : null, towers: FLAME_TOWERS,
            maximumSimultaneous: 1, spritesPerEmitter: FLAMES.particles + 2, realLights: 0,
            bounds: FLAME_TOWERS.map(t => ({ min: flameBounds(t, this.settings.size, this.settings.rise).min.toArray(),
                max: flameBounds(t, this.settings.size, this.settings.rise).max.toArray() })) }
    }
    // Sprite maps and materials belong to the scene's shared disposal traversal.
}
