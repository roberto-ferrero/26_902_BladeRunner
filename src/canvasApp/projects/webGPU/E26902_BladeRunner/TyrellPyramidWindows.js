import { Color } from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { uv, uniform, float, select, mix, materialColor } from 'three/tsl'
import { TOWER_WINDOWS, FACE_WINDOWS, hexToComponents } from './TyrellPyramidDefaults'

// Office windows of the v3 building, procedural in TSL (no textures, no lights).
// Tyrell_Pyramid_v3.glb marks the surfaces with materials 'Torres | ventanas' and 'Piramide | ventanas' and two extra
// UV sets (Blender: piramide_v3.blend, scripts mark_windows.py / mark_pyramid_windows.py). glTF stores V flipped.
//  Towers:  uv1 = (u, v) metres inside the zone (u across, v down the slab from the zone top)
//           uv2 = (W + 100 * id, L) zone size and id (0-3 front columns, 4-5 sides); negative on the side walls
//  Pyramid: uv1 = (lateral, slant) metres on the face (sections 0-1 from the summit, 2-3 from their own top edge)
//           uv2 = (half-width of the face at that height, section + 4 * face)
// Windows sit on a metric grid of columns and floors. Each floor is split into offices of 2-7 windows;
// an office is lit or dark as a whole, some read as one continuous strip, a few are brighter.

// Lean of the slabs: their front normal is (cos, sin) = (0.774, 0.634) in the vertical plane.
const SIDE_TILT = Math.atan2(0.6337, 0.7736)
const LANE_HALF = 231 * 0.03          // elevator lane half-width in metres (sections 0 and 1)

const hashWith = seed => (x, y) => x.mul(127.1).add(y.mul(311.7)).add(seed).sin().mul(43758.5453).fract()

// Coverage of the periodic band [lo, hi] (fractions of one period) over the pixel footprint: no swollen tiny windows.
function band(t, lo, hi) {
    const w = t.fwidth().max(0.0001), span = hi.sub(lo)
    const integral = x => x.floor().mul(span).add(x.fract().sub(lo).clamp(0, span))
    return integral(t.add(w.mul(0.5))).sub(integral(t.sub(w.mul(0.5)))).div(w).clamp(0, 1)
}

// gu, gv: grid coordinates in metres; insideAt(cellCentreU, cellCentreV) -> bool node; zoneMask: 0/1 window area.
function windowPattern(P, { gu, gv, seed, insideAt, zoneMask }) {
    const hash = hashWith(P.seed.add(seed).mul(17.17))
    const U = gu.div(P.colPitch), R = gv.div(P.rowPitch)
    const col = U.floor(), row = R.floor()
    const inside = insideAt(col.add(0.5).mul(P.colPitch), row.add(0.5).mul(P.rowPitch))

    const len = hash(row, float(7.31)).mul(6).floor().add(2)
    const officeCoord = U.add(hash(row, float(3.7)).mul(len)).div(len)
    const office = officeCoord.floor()
    const lit = hash(office, row).lessThan(P.lit)
    const strip = hash(office.add(17.3), row).lessThan(P.strips)
    const on = strip.or(hash(col, row.add(91.7)).greaterThan(P.windowOff))
    const floorOn = P.darkFloors.lessThan(1).or(row.mod(P.darkFloors.max(1)).greaterThan(0.5))

    const gapU = P.width.oneMinus().mul(0.5)
    const sxWindow = band(U, gapU, P.width.add(1).mul(0.5))
    const gapStrip = gapU.div(len)
    const sxStrip = band(officeCoord, gapStrip, gapStrip.oneMinus())
    const sy = band(R, P.height.oneMinus().mul(0.5), P.height.add(1).mul(0.5))
    const insideF = select(inside, 1, 0)
    const glass = sxWindow.mul(sy).mul(insideF)
    const shape = select(strip, sxStrip, sxWindow).mul(sy).mul(insideF)

    const level = hash(office.add(5.1), row.add(2.3)).mul(0.65).add(0.35)
        .mul(select(hash(office.add(9.9), row).lessThan(P.boost), P.boostGain, 1))
        .mul(hash(col, row.add(13.1)).mul(0.25).add(0.75))
    const tint = select(hash(office.add(33.3), row).lessThan(P.warm), P.warmColor, P.coolColor)
    const pattern = tint.mul(level).mul(shape).mul(select(lit.and(on).and(floorOn), 1, 0))

    // Far away a window is smaller than a pixel: fade to the average instead of sparkling.
    const fade = U.fwidth().max(R.fwidth()).smoothstep(0.45, 1.3)
    const meanLevel = float(0.675).mul(P.boost.mul(P.boostGain.sub(1)).add(1)).mul(0.875)
    const meanCover = P.width.mul(P.height).mul(zoneMask)
    const average = mix(P.coolColor, P.warmColor, P.warm).mul(meanLevel).mul(meanCover).mul(P.lit)
        .mul(P.windowOff.oneMinus().mul(P.strips.oneMinus()).add(P.strips))
    return {
        emission: mix(pattern, average, fade).mul(P.intensity),
        glassMask: mix(glass, meanCover, fade),
        zoneMask
    }
}

function windowSystem(defaults, build) {
    const P = {}
    for (const [key, value] of Object.entries(defaults)) {
        if (typeof value === 'string') P[key] = uniform(new Color().setRGB(...hexToComponents(value)))
        else P[key] = uniform(typeof value === 'boolean' ? Number(value) : value)
    }
    const out = build(P)
    return {
        params: P, defaults,
        configure(values) {
            for (const [key, value] of Object.entries(values)) {
                if (!(key in P)) continue
                if (typeof value === 'string') P[key].value.setRGB(...hexToComponents(value))
                else if (typeof value === 'boolean') P[key].value = Number(value)
                else if (Number.isFinite(value)) P[key].value = value
            }
        },
        material(source) {
            const m = new MeshStandardNodeMaterial()
            for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (source[key]) m[key] = source[key]
            m.color.copy(source.color); m.roughness = source.roughness; m.metalness = source.metalness
            if (source.normalScale) m.normalScale.copy(source.normalScale)
            m.side = source.side            // glTF doubleSided: part of the upper pyramid has inward-facing normals
            m.name = source.name
            m.colorNode = materialColor.mul(out.zoneMask.mul(P.zoneDark).oneMinus()).mul(out.glassMask.mul(P.offGlass).oneMinus())
            m.emissiveNode = out.emission
            return m
        }
    }
}

// --- leaning towers
export function createTowerWindows(defaults = TOWER_WINDOWS) {
    return windowSystem(defaults, P => {
        const coord = uv(1), zone = uv(2)
        const u = coord.x, v = coord.y.oneMinus()
        const side = zone.x.lessThan(0)
        const id = zone.x.abs().div(100).floor()
        const W = zone.x.abs().sub(id.mul(100)), L = zone.y.oneMinus()
        const mU = select(side, P.sideMarginU, P.zoneMarginU), mV = select(side, P.sideMarginV, P.zoneMarginV)
        // The side walls are vertical planes whose (u, v) run along the slab: rotate the grid so their floors stay horizontal.
        const C = Math.cos(SIDE_TILT), S = Math.sin(SIDE_TILT)
        const gu = select(side, u.mul(C).add(v.mul(S)), u), gv = select(side, v.mul(C).sub(u.mul(S)), v)
        const insideAt = (gcu, gcv) => {
            const cu = select(side, gcu.mul(C).sub(gcv.mul(S)), gcu), cv = select(side, gcu.mul(S).add(gcv.mul(C)), gcv)
            return cu.greaterThan(mU).and(cu.lessThan(W.sub(mU))).and(cv.greaterThan(mV)).and(cv.lessThan(L.sub(mV)))
        }
        const zoneMask = u.sub(mU).min(W.sub(mU).sub(u)).min(v.sub(mV)).min(L.sub(mV).sub(v)).step(0)
        return windowPattern(P, { gu, gv, seed: id.mul(7.31), insideAt, zoneMask })
    })
}

// --- main pyramid: panels (columns x sectors) on the four faces, each panel with its own seed
export function createFaceWindows(defaults = FACE_WINDOWS) {
    return windowSystem(defaults, P => {
        const coord = uv(1), zone = uv(2)
        const lat = coord.x, v = coord.y.oneMinus()
        const halfWidth = zone.x
        const code = zone.y.oneMinus().round()
        const face = code.div(4).floor(), section = code.sub(face.mul(4))
        const enabled = select(section.lessThan(0.5), P.section0, select(section.lessThan(1.5), P.section1,
            select(section.lessThan(2.5), P.section2, P.section3)))
        const right = lat.greaterThan(0)
        const absLat = lat.abs()
        const start = select(section.lessThan(1.5), P.laneGap.add(LANE_HALF), P.laneGap.mul(0.5))
        const x = absLat.sub(start), y = v.sub(P.topMargin)
        const pitchX = P.panelWidth.add(P.columnGap), pitchY = P.panelHeight.add(P.sectorGap)
        const column = x.div(pitchX).floor(), sector = y.div(pitchY).floor()
        const xIn = x.sub(column.mul(pitchX)), yIn = y.sub(sector.mul(pitchY))
        const limit = halfWidth.sub(P.cornerMargin)
        const panel = x.greaterThan(0).and(y.greaterThan(0)).and(xIn.lessThan(P.panelWidth)).and(yIn.lessThan(P.panelHeight))
        const mU = P.zoneMarginU, mV = P.zoneMarginV
        const zoneMask = select(panel.and(absLat.lessThan(limit)), 1, 0)
            .mul(xIn.sub(mU).min(P.panelWidth.sub(mU).sub(xIn)).min(yIn.sub(mV)).min(P.panelHeight.sub(mV).sub(yIn)).step(0))
            .mul(enabled)
        const insideAt = (cu, cv) => cu.greaterThan(mU).and(cu.lessThan(P.panelWidth.sub(mU)))
            .and(cv.greaterThan(mV)).and(cv.lessThan(P.panelHeight.sub(mV)))
            .and(start.add(column.mul(pitchX)).add(cu).add(P.colPitch.mul(0.5)).lessThan(limit))
            .and(panel).and(enabled.greaterThan(0.5))
        const seed = face.mul(13.7).add(section.mul(5.3)).add(column.mul(1.91)).add(sector.mul(3.37)).add(select(right, 23.1, 0)).add(11)
        return windowPattern(P, { gu: xIn, gv: yIn, seed, insideAt, zoneMask })
    })
}
