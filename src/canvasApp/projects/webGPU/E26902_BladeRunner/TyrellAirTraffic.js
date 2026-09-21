import { AdditiveBlending, CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, OctahedronGeometry, Quaternion, Sprite, SpriteMaterial, Vector3 } from 'three'
import { createBeaconGlow } from './TyrellBuildingLights'

export const AIR_TRAFFIC = Object.freeze({ density: .8, capacity: 10, reflectionHz: 5, environmentHz: 1,
    vehicleScale: 1.25, foregroundScale: .25, foregroundLowering: 2.5,
    corridorPeriods: Object.freeze([60, 68, 40]) })
const forward = new Vector3(0, 0, 1)
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }
const scaleForRoute = route => AIR_TRAFFIC.vehicleScale * (route === 2 ? AIR_TRAFFIC.foregroundScale : 1)

// World metres: two distant corridors and a smaller, lower right-to-left
// crossing between the room and the nearest pyramid vertex (Z = -172.65).
export function createAirRoutes() {
    const curve = points => new CatmullRomCurve3(points.map(p => new Vector3(...p)), false, 'centripetal')
    return [
        curve([[-420, 61, -560], [-190, 58, -525], [180, 62, -550], [420, 66, -610]]),
        curve([[520, 81, -760], [180, 74, -705], [-190, 72, -730], [-520, 78, -810]]),
        curve([[230, 15, -159], [75, 13, -155], [-75, 12, -157], [-240, 14, -163]]
            .map(([x, y, z]) => [x, y - AIR_TRAFFIC.foregroundLowering, z]))
    ]
}

export function airStrobe(time, offset = 0) {
    const phase = ((time + offset) % 2.7 + 2.7) % 2.7
    const pulse = (start, duration) => phase >= start && phase <= start + duration
        ? Math.sin((phase - start) / duration * Math.PI) ** 2 : 0
    return pulse(0, .12) + pulse(.23, .12)
}

export default class TyrellAirTraffic {
    constructor(world) {
        this.settings = { density: AIR_TRAFFIC.density }
        this.group = new Group()
        this.group.name = 'Tyrell / distant air traffic 9.3'
        this.routes = createAirRoutes()
        this.lengths = this.routes.map(route => route.getLength())
        this.time = 0; this.lastReflectionTick = -1; this.lastEnvironmentTick = -1; this.dirty = true
        this.environmentNeedsRefresh = true
        this.geometry = new OctahedronGeometry(1, 0)
        this.geometry.scale(1.15, .24, 1.45)
        this.glow = createBeaconGlow()
        this.glow.name = 'Traffic / soft white position and strobe lights'
        this.flights = Array.from({ length: AIR_TRAFFIC.capacity }, (_, i) => {
            const corridor = [0, 1, 2, 0, 1, 2, 0, 1, 0, 1][i]
            const slot = Math.floor(i / 3)
            const group = new Group()
            group.name = `Traffic / vehicle ${i + 1}`
            const material = new MeshStandardMaterial({ color: '#20231f', roughness: 1, metalness: 0,
                transparent: true, opacity: 0, depthWrite: false })
            material.name = 'Traffic / distant silhouette'
            const body = new Mesh(this.geometry, material)
            body.name = 'City / distant traffic body'
            body.castShadow = body.receiveShadow = false
            group.add(body)
            const positionMaterial = new SpriteMaterial({ map: this.glow, color: 0xfffbf1,
                blending: AdditiveBlending, depthWrite: false, depthTest: true, fog: false, opacity: 0 })
            positionMaterial.name = 'Traffic / white position lights'
            for (const x of [-1.03, 1.03]) {
                const light = new Sprite(positionMaterial)
                light.position.set(x, .12, -.12); light.scale.setScalar(.95)
                group.add(light)
            }
            const strobeMaterial = positionMaterial.clone()
            strobeMaterial.name = 'Traffic / white double strobe'
            strobeMaterial.color.setScalar(2.6)
            const strobe = new Sprite(strobeMaterial)
            strobe.position.set(0, .32, -.48); strobe.scale.setScalar(2.1)
            group.add(strobe)
            this.group.add(group)
            // At the default density: 3 + 3 distant flights and 2 facade crossings.
            // Interleave slots so the third corridor also exists at lower density.
            const route = corridor
            // Scale the hull, light spacing and soft halos together.
            group.scale.setScalar(scaleForRoute(route))
            const progress = i < 8 ? ([.47, .1, .42][corridor] + slot / (corridor === 2 ? 2 : 3)) % 1
                : [.97, .6][i - 8]
            // Equal periods retain separation across repeated passes.
            const period = AIR_TRAFFIC.corridorPeriods[corridor]
            return { group, body, positionMaterial, strobeMaterial, strobe, corridor, slot, route, progress,
                cycle: 0, period, speed: this.lengths[route] / period, weight: 0, position: new Vector3(),
                tangent: new Vector3(), rotation: new Quaternion() }
        })
        world.add(this.group)
        this.update(0)
    }
    configure(values) {
        if (!Number.isFinite(values.density)) return
        this.settings.density = Math.max(0, Math.min(1, values.density))
        this.group.visible = this.settings.density > 0
        if (!this.group.visible) for (const flight of this.flights) {
            flight.weight = 0; flight.group.visible = false
        }
        this.dirty = true
    }
    update(delta) {
        // Clamp focus/resume gaps; motion is simulation-time based, never RAF-count based.
        const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, .1)) : 0
        const active = this.settings.density > 0 ? Math.max(1, Math.round(this.settings.density * AIR_TRAFFIC.capacity)) : 0
        if (active) this.time += dt
        this.group.visible = active > 0
        for (const [i, flight] of this.flights.entries()) {
            const target = i < active ? 1 : 0
            flight.weight += Math.max(-dt / 2, Math.min(dt / 2, target - flight.weight))
            flight.group.visible = active > 0 && flight.weight > .001
            if (!flight.group.visible) continue
            flight.progress += dt / flight.period
            if (flight.progress >= 1) {
                flight.progress %= 1; flight.cycle++

            }
            const route = this.routes[flight.route]
            route.getPointAt(flight.progress, flight.position)
            route.getTangentAt(flight.progress, flight.tangent)
            flight.rotation.setFromUnitVectors(forward, flight.tangent)
            flight.group.position.copy(flight.position); flight.group.quaternion.copy(flight.rotation)
            const edge = smooth(flight.progress / .055) * smooth((1 - flight.progress) / .055)
            const fade = smooth(flight.weight) * edge
            flight.body.material.opacity = fade
            // Sprites avoid additive fog wash; their optical attenuation approximates
            // the exterior depth while the hull uses the common scene atmosphere.
            const attenuation = Math.exp(-flight.position.length() * .00055)
            flight.positionMaterial.opacity = fade * attenuation * .85
            const flash = airStrobe(this.time, i * .413)
            flight.strobeMaterial.opacity = fade * attenuation * flash
            flight.strobe.visible = flash > .005
        }
        const tick = Math.floor(this.time * AIR_TRAFFIC.reflectionHz)
        const environmentTick = Math.floor(this.time * AIR_TRAFFIC.environmentHz)
        this.environmentNeedsRefresh = this.dirty || active > 0 && environmentTick !== this.lastEnvironmentTick
        const refresh = this.dirty || active > 0 && tick !== this.lastReflectionTick
        this.lastReflectionTick = tick; this.lastEnvironmentTick = environmentTick; this.dirty = false
        return refresh
    }
    diagnostics() {
        return { ...this.settings, enabled: this.group.visible, capacity: AIR_TRAFFIC.capacity,
            activeVehicles: this.settings.density > 0 ? Math.max(1, Math.round(this.settings.density * AIR_TRAFFIC.capacity)) : 0,
            corridors: 3,
            foregroundRoute: 'right to left in front of the exterior facades', vehicleScale: AIR_TRAFFIC.vehicleScale,
            foregroundVehicleScale: AIR_TRAFFIC.vehicleScale * AIR_TRAFFIC.foregroundScale,
            foregroundLowering: AIR_TRAFFIC.foregroundLowering,
            corridorPeriods: AIR_TRAFFIC.corridorPeriods,
            time: this.time, reflectionRefreshHz: AIR_TRAFFIC.reflectionHz, environmentRefreshHz: AIR_TRAFFIC.environmentHz,
            realLights: 0, trianglesPerVehicle: 14, sharedGeometries: 1, sharedGlowTextures: 1,
            flights: this.flights.filter(f => f.group.visible).map(f => ({ id: f.group.name, corridor: f.corridor, route: f.route,
                position: f.position.toArray(), scale: f.group.scale.x, progress: f.progress, speed: f.speed,
                period: f.period, cycles: f.cycle, strobe: f.strobe.visible })),
            method: 'Arc-length routes; pooled minimal silhouettes; white position lights and soft double strobes; depth-tested; density 0 disables all' }
    }
    // Scene traversal owns all shared geometries, materials and texture disposal.
}
