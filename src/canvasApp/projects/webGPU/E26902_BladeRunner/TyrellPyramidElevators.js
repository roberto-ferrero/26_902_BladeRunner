import { AdditiveBlending, Color, ConeGeometry, DoubleSide, InstancedMesh, Matrix4, Quaternion, Sprite, Vector3 } from 'three'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial, SpriteNodeMaterial } from 'three/webgpu'
import { Fn, Loop, uniform, uniformArray, uv, float, positionGeometry, positionView, positionWorld, normalGeometry, normalView,
    normalWorld, vec3, materialColor } from 'three/tsl'
import { ELEVATORS, hexToComponents } from './TyrellPyramidDefaults'

// Elevator lane of the v3 building: darker rails and, per cabin ('Piramide | ascensor*' in Tyrell_Pyramid_v3.glb),
// a darkened body with one elongated light strip, two small lamps lighting up and down the rail with a visible beam
// cone that decays with distance, and a position strobe. The lamps are analytic spot lights evaluated only in the rail
// material: no scene lights are added, so the office materials keep their light count.
// Cabins and beams are instanced (one draw call each): every render pass, including the six faces of the room probe
// and the planar reflection, pays for two objects instead of eighteen.
const NH = 0.7103, NY = 0.7039
const RAIL_Y = [150, 1690]               // tracks run between these heights (pyramid local units, Blender axes)
const DOWN = new Vector3(0, -1, 0)
const _m = new Matrix4(), _t = new Matrix4(), _q = new Quaternion(), _s = new Vector3(), _p = new Vector3()

function cloneStandard(source) {
    const m = new MeshStandardNodeMaterial()
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (source[key]) m[key] = source[key]
    m.color.copy(source.color); m.roughness = source.roughness; m.metalness = source.metalness; m.side = source.side
    if (source.normalScale) m.normalScale.copy(source.normalScale)
    m.name = source.name
    return m
}

export default class TyrellPyramidElevators {
    constructor(world, building, defaults = ELEVATORS) {
        this.settings = { ...defaults }
        const U = this.uniforms = {}
        for (const [key, value] of Object.entries(defaults)) {
            if (typeof value === 'string') U[key] = uniform(new Color().setRGB(...hexToComponents(value)))
            else if (typeof value === 'number') U[key] = uniform(value)
        }
        U.lampCosOuter = uniform(1); U.lampCosInner = uniform(1)
        this.time = 0
        this.materials = []
        world.updateMatrixWorld(true)

        // --- cabins: face frame from the pyramid's Blender local axes (Y up), converted to glTF local and world
        const cabins = []
        world.traverse(o => { if (o.isMesh && /ascensor/.test(o.name) && !/carriles/.test(o.name)) cabins.push(o) })
        const toGltf = v => new Vector3(v.x, v.z, -v.y)
        this.items = cabins.map((mesh, index) => {
            mesh.geometry.computeBoundingBox()
            const centre = mesh.geometry.boundingBox.getCenter(new Vector3()).applyMatrix4(mesh.matrixWorld)
            const t = building.worldToLocal(centre.clone())
            const local = new Vector3(t.x, -t.z, t.y)
            let upL, nL, latL
            if (Math.abs(local.x) >= Math.abs(local.z)) {
                const s = Math.sign(local.x) || 1
                upL = new Vector3(-s * NY / NH, 1, 0); nL = new Vector3(s * NH, NY, 0); latL = new Vector3(0, 0, 1)
            } else {
                const s = Math.sign(local.z) || 1
                upL = new Vector3(0, 1, -s * NY / NH); nL = new Vector3(0, NY, s * NH); latL = new Vector3(1, 0, 0)
            }
            const up = toGltf(upL.normalize()).transformDirection(building.matrixWorld)
            const normal = toGltf(nL.normalize()).transformDirection(building.matrixWorld)
            const lateral = toGltf(latL).transformDirection(building.matrixWorld)
            const metres = building.matrixWorld.getMaxScaleOnAxis() * Math.hypot(1, NY / NH)
            const range = [(RAIL_Y[0] + 60 - local.y) * metres, (RAIL_Y[1] - 60 - local.y) * metres]
            const lamps = [1, -1].map(dir => {
                const d = up.clone().multiplyScalar(dir)
                // 1.4 m along the rail and 0.35 m off the face; aimed slightly at the rail, 20 m ahead
                return { offset: d.clone().multiplyScalar(1.4).addScaledVector(normal, 0.35), axis: d,
                    direction: d.clone().multiplyScalar(20).addScaledVector(normal, -0.8).normalize() }
            })
            return { mesh, index, matrix: mesh.matrixWorld.clone(), centre, up, normal, lateral, range, lamps, phase: index * 0.53 }
        })
        const parent = cabins[0]?.parent
        this.parent = parent

        if (this.items.length) {
            // All cabins are copies of one mesh: their own axes share the same face frame, so one material serves all.
            const first = this.items[0], toCabin = first.matrix.clone().invert()
            const [upC, nC, latC] = [first.up, first.normal, first.lateral].map(v => v.clone().transformDirection(toCabin))
            const m = cloneStandard(first.mesh.material)
            const k = first.matrix.getMaxScaleOnAxis()
            // raw geometry attributes: with instancing, positionLocal/normalLocal already include the instance matrix
            const p = positionGeometry.sub(vec3(...first.mesh.geometry.boundingBox.getCenter(new Vector3()).toArray()))
            const a = p.dot(vec3(...latC.toArray())).mul(k).abs(), b = p.dot(vec3(...upC.toArray())).mul(k).abs()
            const front = normalGeometry.dot(vec3(...nC.toArray())).smoothstep(0.5, 0.8)
            const inside = (x, size) => x.smoothstep(size.mul(0.5).sub(0.02), size.mul(0.5)).oneMinus()
            m.colorNode = materialColor.mul(U.cabinBase)
            m.emissiveNode = U.stripColor.mul(U.stripIntensity).mul(inside(a, U.stripWidth).mul(inside(b, U.stripLength)).mul(front))
            this.materials.push(m)
            this.cabins = new InstancedMesh(first.mesh.geometry, m, this.items.length)
            this.cabins.name = 'Tyrell / cabinas de ascensor'
            this.cabins.frustumCulled = false
            this.cabins.userData.noCastShadow = true   // instanced at the scene origin: keep it out of the room's shadow pass
            for (const it of this.items) it.mesh.removeFromParent()
            parent.add(this.cabins)

            const geometry = new ConeGeometry(1, 1, 32, 1, true)
            geometry.translate(0, -0.5, 0)                      // apex at the origin, opening along -Y
            const bm = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false })
            const along = positionGeometry.y.negate().clamp(0, 1)
            const facing = normalView.dot(positionView.normalize()).abs().pow(1.5)
            bm.colorNode = U.lampColor.mul(U.beam).mul(along.mul(U.beamDecay).negate().exp()).mul(facing).mul(along.smoothstep(0, 0.04))
            this.materials.push(bm)
            this.beams = new InstancedMesh(geometry, bm, this.items.length * 2)
            this.beams.name = 'Tyrell / haces de ascensor'
            this.beams.frustumCulled = false
            this.beams.renderOrder = 10
            this.beams.userData.noCastShadow = true
            parent.add(this.beams)

            const r = uv().sub(0.5).length().mul(2)
            const strobeMaterial = new SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false })
            strobeMaterial.colorNode = U.strobeColor.mul(U.strobe).mul(r.smoothstep(U.strobeHardness.mul(0.95), 1).oneMinus()
                .add(r.mul(r).mul(-30).exp().mul(U.strobeHardness.oneMinus()).mul(0.6)))
            this.materials.push(strobeMaterial)
            for (const it of this.items) {
                it.strobe = new Sprite(strobeMaterial)
                it.strobe.name = 'Tyrell / estrobo de ascensor'
                parent.add(it.strobe)
            }
        }

        // --- rails: darker, lit by the analytic lamps of every cabin
        const count = this.items.length * 2
        this.lampPositions = Array.from({ length: Math.max(count, 1) }, () => new Vector3(0, -1e5, 0))
        this.lampDirections = Array.from({ length: Math.max(count, 1) }, () => new Vector3(0, -1, 0))
        const lampPosition = uniformArray(this.lampPositions, 'vec3'), lampDirection = uniformArray(this.lampDirections, 'vec3')
        const irradiance = Fn(() => {
            const sum = float(0).toVar()
            Loop(count, ({ i }) => {
                const toLamp = lampPosition.element(i).sub(positionWorld)
                const distance = toLamp.length().max(0.05)
                const l = toLamp.div(distance)
                const cone = l.negate().dot(lampDirection.element(i)).smoothstep(U.lampCosOuter, U.lampCosInner)
                const range = distance.div(U.lampDistance).pow(4).oneMinus().clamp(0, 1).pow(2)
                sum.addAssign(cone.mul(range).mul(distance.pow(U.lampDecay).reciprocal()).mul(normalWorld.dot(l).max(0)))
            })
            return sum
        })()
        this.rails = []
        world.traverse(o => {
            if (!o.isMesh || !/carriles/.test(o.name)) return
            const m = cloneStandard(o.material)
            const albedo = materialColor.mul(U.railColor).mul(U.railDark.oneMinus())
            m.colorNode = albedo
            // Lambert response to the lamps, as three.js punctual lights: albedo / PI * I * cone * attenuation * N.L
            m.emissiveNode = albedo.mul(U.lampColor).mul(U.lampIntensity).mul(irradiance).div(Math.PI)
            o.material = m
            this.rails.push(o)
            this.materials.push(m)
        })
        this.configure({})
    }
    configure(values) {
        const S = this.settings, U = this.uniforms
        for (const [key, value] of Object.entries(values)) {
            if (!(key in S) || typeof value !== typeof S[key]) continue
            S[key] = value
            if (typeof value === 'string') U[key].value.setRGB(...hexToComponents(value))
            else if (typeof value === 'number') U[key].value = value
        }
        const half = S.lampAngle * Math.PI / 180
        U.lampCosOuter.value = Math.cos(half); U.lampCosInner.value = Math.cos(half * 0.4)   // penumbra 0.6
        for (const it of this.items) it.strobe?.scale.setScalar(S.strobeSize)
        this.update(0)
    }
    // Always false: strobe flashes and moving cabins must not invalidate the planar reflection or the room probe
    // (each probe capture renders the whole scene six times; tiny distant sprites are not worth it).
    update(delta) {
        this.time += Math.max(0, Math.min(delta || 0, 0.1))
        if (!this.items.length) return false
        const S = this.settings
        const toParent = _m.copy(this.parent.matrixWorld).invert()
        const radius = Math.tan(S.lampAngle * Math.PI / 180) * S.beamLength
        this.items.forEach((it, index) => {
            const phase = (this.time + it.phase) % S.strobePeriod
            it.strobe.visible = S.strobe > 0 && (phase < 0.06 || (phase > 0.16 && phase < 0.21))
            let offset = 0
            if (S.move) {
                const [lo, hi] = it.range, span = hi - lo, travel = this.time * S.speed + it.phase * span
                const w = (travel % (2 * span)) / span, f = w < 1 ? w : 2 - w
                offset = lo + span * (f * f * (3 - 2 * f))
            }
            const shift = _p.copy(it.up).multiplyScalar(offset)
            _t.makeTranslation(shift.x, shift.y, shift.z).multiply(it.matrix).premultiply(toParent)
            this.cabins.setMatrixAt(index, _t)
            const centre = shift.add(it.centre)
            it.strobe.position.copy(centre).addScaledVector(it.normal, 1.3).applyMatrix4(toParent)
            it.lamps.forEach((lamp, j) => {
                const position = this.lampPositions[index * 2 + j].copy(centre).add(lamp.offset)
                this.lampDirections[index * 2 + j].copy(lamp.direction)
                _q.setFromUnitVectors(DOWN, lamp.axis)
                _t.compose(position, _q, _s.set(radius, S.beamLength, radius)).premultiply(toParent)
                this.beams.setMatrixAt(index * 2 + j, _t)
            })
        })
        this.cabins.instanceMatrix.needsUpdate = true
        this.beams.instanceMatrix.needsUpdate = true
        return false
    }
    diagnostics() {
        return { ...this.settings, cabins: this.items.length, rails: this.rails.length, lamps: this.items.length * 2, drawCalls: this.items.length ? 2 : 0,
            method: 'Instanced cabins and beams; analytic rail lamps (no scene lights); sprite strobes' }
    }
    dispose() {
        this.beams?.geometry.dispose()
        this.cabins?.removeFromParent(); this.beams?.removeFromParent()
        for (const it of this.items) it.strobe?.removeFromParent()
        this.materials.forEach(material => material.dispose())
    }
}
