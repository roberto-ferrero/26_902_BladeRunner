import { AdditiveBlending, BoxGeometry, BufferGeometry, CatmullRomCurve3, DataTexture, Float32BufferAttribute, LinearFilter,
    Group, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createBeaconGlow } from './TyrellBuildingLights'
import { airStrobe } from './TyrellAirTraffic'

export const NEAR_TRAFFIC = Object.freeze({ enabled: true, duration: 40, minDuration: 20, maxDuration: 60,
    capacity: 1, vehicleScale: .25, altitude: 10.5, maxBank: 20 * Math.PI / 180,
    initialDelay: 2, reflectionHz: 8, environmentHz: 1 })
const vertical = new Vector3(0, 1, 0), forward = new Vector3(0, 0, 1)
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }

// Level foreground passage: upper left to right in the reference views. The
// gentle arc is confined to XZ; its height stays above the office roof (6.8 m).
// Both ends extend beyond the frame so a single vehicle can repeat invisibly.
export function createNearRoutes() {
    return [new CatmullRomCurve3([[-90, 4], [-36, -38], [22, -74], [155, -142]]
        .map(([x, z]) => new Vector3(x, NEAR_TRAFFIC.altitude, z)), false, 'centripetal')]
}

// Separate heading from bank: a shortest-arc +Z-to-tangent quaternion can roll
// almost upside down when a departing vehicle points toward -Z.
export function nearVehicleRotation(tangent, progress, target = new Quaternion()) {
    target.setFromAxisAngle(vertical, Math.atan2(tangent.x, tangent.z))
    const bank = -NEAR_TRAFFIC.maxBank * Math.sin(Math.PI * progress) ** 2
    return target.multiply(new Quaternion().setFromAxisAngle(forward, bank))
}

export function createNearFlareTexture() {
    const size = 128, pixels = new Uint8Array(size * size * 4)
    const angle = 35 * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const u = (x + .5) / size * 2 - 1, v = (y + .5) / size * 2 - 1
        const r = Math.hypot(u, v)
        // A soft peripheral lens ring and one faint NW-SE streak, locked to
        // the screen rather than the vehicle's bank. Keep the dark hull legible.
        const along = u * c - v * s, across = u * s + v * c
        const diffuse = .09 * Math.exp(-r * r * 4)
        const ring = .065 * Math.exp(-(((r - .68) / .12) ** 2))
        const streak = .22 * Math.exp(-((across / .03) ** 2) - Math.abs(along) * 2.3)
            + .045 * Math.exp(-((across / .095) ** 2) - Math.abs(along) * 3)
        const alpha = (diffuse + ring + streak) * smooth((1 - r) / .25)
        const i = (y * size + x) * 4
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 255; pixels[i + 3] = Math.round(alpha * 255)
    }
    const texture = new DataTexture(pixels, size, size)
    texture.name = 'Near traffic / peripheral lens ring and subtle diagonal streak'
    texture.minFilter = texture.magFilter = LinearFilter; texture.needsUpdate = true
    return texture
}

// Shared, deliberately economical spinner silhouette: two forward pods, a low
// chassis and a long glazed wedge. Dimensions are metres, approximately 4.3 x 5.3.
export function createNearVehicleGeometries() {
    const parts = { body: [], trim: [], glass: [], lamps: [] }
    const part = (kind, geometry, scale, position) => {
        geometry.scale(...scale); geometry.translate(...position); parts[kind].push(geometry)
    }
    const oval = (kind, scale, position) => part(kind, new SphereGeometry(1, 12, 6), scale, position)
    const box = (kind, scale, position) => part(kind, new BoxGeometry(1, 1, 1), scale, position)
    oval('body', [1.4, .34, 2.25], [0, -.06, -.3])
    oval('trim', [1.32, .18, 2.12], [0, -.31, -.3])
    for (const side of [-1, 1]) {
        oval('body', [.6, .48, 1.04], [side * 1.55, -.05, 1.45])
        oval('trim', [.63, .49, .2], [side * 1.55, -.05, 1.12])
        box('body', [.46, .3, 1.9], [side * 1.1, -.05, -.3])
        oval('body', [.55, .42, .75], [side * 1.12, .08, -1.72])
        box('trim', [.12, .13, 2.55], [side * .92, .4, -.35])
        oval('lamps', [.16, .11, .06], [side * 1.55, .03, 2.45])
    }
    // Sloped windscreen and tapered sides, with opaque dark glass to keep cost
    // and readability stable at distance (no transmissive render pass).
    const vertices = [
        [-.9, .22, 1.6], [.9, .22, 1.6], [.95, .22, -1.65], [-.95, .22, -1.65],
        [-.61, .62, .65], [.61, .62, .65], [.7, .92, -1.22], [-.7, .92, -1.22]
    ]
    const glass = new BufferGeometry()
    glass.setAttribute('position', new Float32BufferAttribute(vertices.flat(), 3))
    glass.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6,
        3, 0, 4, 3, 4, 7, 4, 5, 6, 4, 6, 7])
    glass.computeVertexNormals()
    // Give all parts compatible attributes before batching by finish.
    parts.glass.push(glass)
    box('body', [1.5, .13, .5], [0, .91, -1.25])
    box('trim', [.08, .12, 2.1], [0, .58, -.35])
    box('lamps', [.7, .13, .08], [0, .13, -2.48])
    return Object.fromEntries(Object.entries(parts).map(([key, list]) => {
        list.forEach(geometry => geometry.deleteAttribute('uv'))
        const geometry = mergeGeometries(list)
        list.forEach(item => item.dispose())
        geometry.computeBoundingSphere()
        return [key, geometry]
    }))
}

export default class TyrellNearTraffic {
    constructor(world) {
        this.settings = { enabled: NEAR_TRAFFIC.enabled, duration: NEAR_TRAFFIC.duration }
        this.group = new Group(); this.group.name = 'Tyrell / near air traffic 9.4'
        this.routes = createNearRoutes()
        this.geometries = createNearVehicleGeometries()
        this.glow = createBeaconGlow()
        this.flareTexture = createNearFlareTexture()
        this.time = 0; this.delay = NEAR_TRAFFIC.initialDelay; this.passes = 0
        this.dirty = true; this.lastReflectionTick = -1; this.lastEnvironmentTick = -1
        this.flights = Array.from({ length: NEAR_TRAFFIC.capacity }, (_, i) => {
            const group = new Group(); group.name = `Near traffic / spinner ${i + 1}`; group.visible = false
            group.scale.setScalar(NEAR_TRAFFIC.vehicleScale)
            const materials = [
                new MeshStandardMaterial({ color: '#121619', roughness: .94, metalness: .08, envMapIntensity: .15 }),
                new MeshStandardMaterial({ color: '#090c0e', roughness: .96, metalness: .05, envMapIntensity: .1 }),
                new MeshStandardMaterial({ color: '#070c10', roughness: .75, metalness: .12, envMapIntensity: .15 }),
                new MeshStandardMaterial({ color: '#675643', emissive: '#ffbd79', emissiveIntensity: .65 })
            ]
            Object.entries(this.geometries).forEach(([key, geometry], index) => {
                const material = materials[index]
                material.name = `Near traffic / ${key}`
                material.transparent = true; material.opacity = 0; material.depthWrite = false
                const mesh = new Mesh(geometry, material)
                mesh.name = `City / near spinner ${key}`
                mesh.castShadow = mesh.receiveShadow = false; group.add(mesh)
            })
            const positionMaterial = new SpriteMaterial({ map: this.glow, color: '#fff1d6',
                blending: AdditiveBlending, depthTest: true, depthWrite: false, fog: false, opacity: 0 })
            for (const side of [-1, 1]) {
                const light = new Sprite(positionMaterial)
                light.position.set(side * 1.55, .04, 2.51); light.scale.setScalar(.85); group.add(light)
            }
            const rearMaterial = positionMaterial.clone(); rearMaterial.color.set('#ffb96d')
            const rear = new Sprite(rearMaterial)
            rear.position.set(0, .15, -2.55); rear.scale.set(1.25, .65, 1); group.add(rear)
            const strobeMaterial = positionMaterial.clone(); strobeMaterial.color.setScalar(2.2)
            const strobe = new Sprite(strobeMaterial)
            strobe.position.set(0, 1.04, -1.25); strobe.scale.setScalar(1.05); group.add(strobe)
            // These billboards are camera-facing optics, depth-tested against
            // architecture. The small hull does not write depth into its own halo.
            const optics = []
            for (const [name, map, size, rgb] of [
                ['hot core', this.glow, 2.2, [7, 4.2, 1.65]],
                ['warm glow', this.glow, 7.5, [.72, .29, .07]],
                ['lens halo', this.flareTexture, 9, [.62, .29, .1]]
            ]) {
                const material = new SpriteMaterial({ map, blending: AdditiveBlending,
                    depthTest: true, depthWrite: false, fog: false, opacity: 0 })
                material.name = `Near traffic / ${name}`; material.color.setRGB(...rgb)
                const sprite = new Sprite(material)
                sprite.scale.setScalar(size); sprite.position.set(0, .58, 0)
                sprite.renderOrder = 5; group.add(sprite); optics.push(sprite)
            }
            this.group.add(group)
            return { group, materials, positionMaterial, rearMaterial, strobeMaterial, strobe, optics,
                age: 0, route: 0, active: false, position: new Vector3(), tangent: new Vector3(), rotation: new Quaternion() }
        })
        world.add(this.group)
    }
    configure(values) {
        if (typeof values.enabled === 'boolean' && values.enabled !== this.settings.enabled) {
            this.settings.enabled = values.enabled; this.group.visible = values.enabled
            const flight = this.flights[0]
            flight.active = false; flight.group.visible = false; flight.age = 0
            this.delay = NEAR_TRAFFIC.initialDelay
        }
        if (Number.isFinite(values.duration)) {
            const duration = Math.max(NEAR_TRAFFIC.minDuration, Math.min(NEAR_TRAFFIC.maxDuration, values.duration))
            // Preserve position when adjusting speed; never spawn a second vehicle.
            this.flights[0].age *= duration / this.settings.duration
            this.settings.duration = duration
        }
        this.dirty = true
    }
    update(delta) {
        let dt = Number.isFinite(delta) ? Math.max(0, Math.min(.1, delta)) : 0
        const flight = this.flights[0]
        if (this.settings.enabled) {
            this.time += dt
            if (!flight.active) {
                this.delay -= dt
                if (this.delay <= 1e-9) {
                    dt = Math.max(0, -this.delay)
                    this.delay = 0; flight.active = true; flight.group.visible = true; this.passes++
                } else dt = 0
            }
            if (flight.active) {
                flight.age += dt
                if (flight.age >= this.settings.duration) {
                    flight.age %= this.settings.duration; this.passes++
                }
                const progress = flight.age / this.settings.duration
                const route = this.routes[0]
                route.getPointAt(progress, flight.position); route.getTangentAt(progress, flight.tangent)
                nearVehicleRotation(flight.tangent, progress, flight.rotation)
                flight.group.position.copy(flight.position); flight.group.quaternion.copy(flight.rotation)
                const fade = smooth(progress / .045) * smooth((1 - progress) / .045)
                flight.materials.forEach(material => { material.opacity = fade })
                const attenuation = Math.exp(-flight.position.length() * .00055)
                flight.positionMaterial.opacity = fade * attenuation * .18
                flight.rearMaterial.opacity = fade * attenuation * .2
                const flash = airStrobe(this.time)
                flight.strobeMaterial.opacity = fade * attenuation * flash * .65
                flight.strobe.visible = flash > .005
                for (const sprite of flight.optics) sprite.material.opacity = fade * attenuation
            }
        }
        const moving = this.flights.some(flight => flight.active)
        const tick = Math.floor(this.time * NEAR_TRAFFIC.reflectionHz)
        const envTick = Math.floor(this.time * NEAR_TRAFFIC.environmentHz)
        // Include the final disappearance in reflection refreshes too.
        const changed = moving || this.wasMoving
        const refresh = this.dirty || changed && tick !== this.lastReflectionTick
        this.environmentNeedsRefresh = this.dirty || changed && envTick !== this.lastEnvironmentTick
        this.wasMoving = moving; this.lastReflectionTick = tick; this.lastEnvironmentTick = envTick; this.dirty = false
        return refresh
    }
    diagnostics() {
        return { ...this.settings, time: this.time, passes: this.passes,
            nextPassIn: this.flights[0].active ? this.settings.duration - this.flights[0].age : this.delay,
            capacity: this.flights.length, vehicleScale: NEAR_TRAFFIC.vehicleScale, realLights: 0,
            maxBankDegrees: NEAR_TRAFFIC.maxBank * 180 / Math.PI,
            trianglesPerVehicle: Object.values(this.geometries).reduce((sum, g) => sum + g.index.count / 3, 14),
            routes: ['single level arc, upper left to right; repeat after completing the route'],
            optics: 'Compact warm core, soft peripheral lens ring and subtle diagonal streak around a dark hull; secondary white strobe and existing bloom',
            flights: this.flights.filter(f => f.active).map(f => ({ route: f.route, age: f.age,
                position: f.position.toArray(), scale: f.group.scale.x, quaternion: f.rotation.toArray() })),
            reflectionRefreshHz: NEAR_TRAFFIC.reflectionHz, environmentRefreshHz: NEAR_TRAFFIC.environmentHz }
    }
    // The scene's shared-resource traversal disposes meshes, materials and glow.
}
