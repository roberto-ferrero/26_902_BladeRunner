import { AdditiveBlending, DataTexture, LinearFilter, Sprite, SpriteMaterial, Vector3 } from 'three'
import { attribute, normalWorld, uniform, vec3, renderGroup } from 'three/tsl'
import { facadeGeometry } from './TyrellFacadeLayout'
import TyrellElevatorRails from './TyrellElevatorRails'

// A compact white core with a broad Gaussian falloff; no hard disc edge.
export function createBeaconGlow() {
    const size = 64, pixels = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const r2 = ((x + .5) / size * 2 - 1) ** 2 + ((y + .5) / size * 2 - 1) ** 2
        const alpha = Math.min(1, .42 * Math.exp(-r2 * 7) + .78 * Math.exp(-r2 * 65))
        const i = (y * size + x) * 4
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
        pixels[i + 3] = Math.round(alpha * 255)
    }
    const texture = new DataTexture(pixels, size, size)
    texture.name = 'City / soft white beacon'
    texture.magFilter = texture.minFilter = LinearFilter
    texture.needsUpdate = true
    return texture
}

// World-metric emissive masks: no new lamps, shadow maps or night exposure.
export default class TyrellBuildingLights {
    constructor(world) {
        this.settings = { intensity: .22, beacons: .7 }
        this.strength = uniform(this.settings.intensity).setGroup(renderGroup)
        this.originals = []
        this.geometries = []
        this.beacons = []
        this.time = 0
        const panel = attribute('tyrellPanel', 'vec4')
        const surfaceX = panel.x, surfaceY = panel.y
        const hash = (x, y) => x.mul(127.1).add(y.mul(311.7)).sin().mul(43758.5453).fract()
        const rectangle = (coordinate, lo, hi) => {
            // Integrate each periodic band over the pixel footprint. Derivatives
            // of fract() used to swell tiny windows at cell boundaries.
            const width = coordinate.fwidth().max(.002)
            const integral = t => t.floor().mul(hi - lo).add(t.fract().sub(lo).clamp(0, hi - lo))
            return integral(coordinate.add(width.mul(.5)))
                .sub(integral(coordinate.sub(width.mul(.5)))).div(width).clamp(0, 1)
        }
        const u = surfaceX.div(.42), v = surfaceY.div(.9)
        const random = hash(u.floor(), v.floor())
        // Fine windows cluster horizontally by office, leaving wide dark floor bands.
        const offices = hash(u.div(7).floor(), v.floor()).greaterThan(.22)
        const windows = rectangle(u, .2, .48).mul(rectangle(v, .42, .49))
            .mul(offices).mul(random.greaterThan(.13)).mul(random.mul(.3).add(.7))
        const shaft = surfaceX.div(18)
        const lift = rectangle(shaft, .475, .482).mul(rectangle(surfaceY.div(5.4), .14, .16))
        const hangar = rectangle(surfaceX.div(27), .3, .34)
            .mul(rectangle(surfaceY.div(12), .305, .313))
            .mul(hash(surfaceX.div(27).floor(), surfaceY.div(12).floor()).greaterThan(.78))
        const facade = normalWorld.y.abs().lessThan(.88)
        const sideMargin = panel.z.mul(.025).clamp(.45, 1.7)
        const endMargin = panel.w.mul(.06).clamp(.16, 1.3)
        const edges = panel.x.min(panel.z.sub(panel.x)).smoothstep(sideMargin, sideMargin.add(.25))
            .mul(panel.y.min(panel.w.sub(panel.y)).smoothstep(endMargin, endMargin.add(.2)))
            .mul(panel.z.greaterThan(3)).mul(panel.w.greaterThan(1))
        const columns = rectangle(panel.x.div(panel.z.max(.01)).mul(panel.z.div(7).floor().max(2)), .12, .88)
        const crossBand = panel.y.div(panel.w.max(.01)).sub(.46).abs().smoothstep(.012, .026)
        const centreX = panel.x.sub(panel.z.mul(.5))
        const centre = centreX.abs().smoothstep(3.3, 3.8).oneMinus().mul(attribute('tyrellCentral', 'float'))
        const structure = edges.mul(columns).mul(crossBand).mul(centre.oneMinus())
        // Soft surface washes widen and fade upwards inside the window-free spine.
        const spread = surfaceY.mul(.045).add(.32)
        const cone = offset => centreX.sub(offset).div(spread).pow(2).negate().exp()
        const wash = cone(-2.2).add(cone(0)).add(cone(2.2)).mul(surfaceY.mul(-.055).exp())
            .mul(centre).mul(edges).mul(.5)
        const emission = vec3(.85, .79, .61).mul(windows)
            .add(vec3(1, .13, .015).mul(lift).mul(.65))
            .add(vec3(1, .83, .53).mul(hangar).mul(1.2))
            .mul(structure).add(vec3(.83, .72, .51).mul(wash))
            .mul(facade).mul(this.strength)
        world.updateMatrixWorld(true)
        const targets = []
        world.traverse(object => {
            if (object.isMesh && (object.name === 'Tyrell_Corporation_Pyramid' || /^City \/ [012]$/.test(object.name))) targets.push(object)
        })
        if (targets.some(object => object.name === 'Tyrell_Corporation_Pyramid'))
            this.elevatorRails = new TyrellElevatorRails()
        for (const object of targets) {
            if (!object.geometry.hasAttribute('tyrellPanel')) {
                const originalGeometry = object.geometry
                object.geometry = facadeGeometry(object)
                this.geometries.push({ object, original: originalGeometry, layout: object.geometry })
            }
            const original = object.material
            const materials = [].concat(original).map(material => {
                const copy = material.clone()
                copy.emissiveNode = emission
                if (object.name === 'Tyrell_Corporation_Pyramid') this.elevatorRails.apply(copy, emission)
                copy.needsUpdate = true
                return copy
            })
            object.material = Array.isArray(original) ? materials : materials[0]
            this.originals.push({ object, original, materials })
            if (object.name !== 'Tyrell_Corporation_Pyramid') continue
            // Actual upper GLB vertices, separated by footprint band, not floating markers.
            const peaks = new Map(), point = new Vector3()
            const positions = object.geometry.attributes.position
            for (let i = 0; i < positions.count; i++) {
                point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld)
                if (point.y < 16) continue
                const key = Math.floor(point.x / 30)
                if (!peaks.has(key) || peaks.get(key).y < point.y) peaks.set(key, point.clone())
            }
            const glow = createBeaconGlow()
            for (const point of peaks.values()) {
                const material = new SpriteMaterial({ map: glow, color: 0xffffff,
                    blending: AdditiveBlending, depthWrite: false, depthTest: true })
                const beacon = new Sprite(material)
                beacon.name = 'City / navigation beacon'
                beacon.position.copy(world.worldToLocal(point.clone().add(new Vector3(0, .17, 0))))
                beacon.scale.set(1.8, 1.8, 1)
                world.add(beacon)
                this.beacons.push(beacon)
            }
            if (!this.beacons.length) glow.dispose()
        }
        this.update(0)
    }
    configure(values) {
        for (const key of ['intensity', 'beacons']) if (Number.isFinite(values[key]))
            this.settings[key] = Math.max(0, Math.min(2, values[key]))
        this.strength.value = this.settings.intensity
        this.update(0)
    }
    update(delta) {
        this.time += Math.max(0, Math.min(delta || 0, .1))
        let changed = false
        this.beacons.forEach((beacon, index) => {
            const phase = (this.time + index * .37) % 2.4
            const visible = this.settings.beacons > 0 && (phase < .09 || phase > .21 && phase < .27)
            changed ||= beacon.visible !== visible
            beacon.visible = visible
            beacon.material.color.setScalar(this.settings.beacons * 3)
        })
        return changed
    }
    diagnostics() { return { ...this.settings, materials: this.originals.reduce((n, item) => n + item.materials.length, 0),
        beaconCount: this.beacons.length, windowPitch: [.42, .9], windowSize: [.1176, .063],
        beaconHaloSize: 1.8, facadeLayouts: this.geometries.map(item => item.layout.userData.facadeLayout),
        elevatorRails: this.elevatorRails?.diagnostics() || null,
        method: 'Facade-aligned columns and floor rows; edge margins; window-free uplight spine; Gaussian beacons', realLights: 0 } }
    dispose() {
        for (const { object, original, materials } of this.originals) {
            object.material = original
            materials.forEach(material => material.dispose())
        }
        this.originals.length = 0
        for (const { object, original, layout } of this.geometries) {
            object.geometry = original
            layout.dispose()
        }
        this.geometries.length = 0
        // Beacon resources remain under world and are disposed by disposeScene.
    }
}
