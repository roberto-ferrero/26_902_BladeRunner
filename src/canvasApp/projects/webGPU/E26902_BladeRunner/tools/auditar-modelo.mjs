// Phase 2 model audit. Reads the shipped GLB directly, with no DOM and no texture decoding,
// so the result is deterministic and reproducible outside the browser.
//
//   node src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/auditar-modelo.mjs
//
// Writes docs/phase2/auditoria.json and prints a summary. Exits non-zero only on a read failure,
// never on a finding: the findings are the deliverable and are judged by a person.
import fs from 'node:fs'
import path from 'node:path'
import { Matrix4, Vector3, Box3, Quaternion } from 'three'

const GLB = 'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb'
const OUT = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase2/auditoria.json'
const WELD = 1e-5          // metres; vertex welding tolerance for topology tests
const CONTACT = 0.005      // metres; tolerated gap or overlap against a supporting surface
const CLUSTER = 0.03       // metres; parts within this distance count as one piece of furniture

const COMPONENT = {
    5120: { get: 'getInt8', bytes: 1 }, 5121: { get: 'getUint8', bytes: 1 },
    5122: { get: 'getInt16', bytes: 2 }, 5123: { get: 'getUint16', bytes: 2 },
    5125: { get: 'getUint32', bytes: 4 }, 5126: { get: 'getFloat32', bytes: 4 }
}
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

// ---------------------------------------------------------------- GLB reading

function readGLB(file) {
    const bytes = fs.readFileSync(file)
    if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a GLB.`)
    const jsonLength = bytes.readUInt32LE(12)
    const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
    let offset = 20 + jsonLength, bin = null
    while (offset < bytes.length) {
        const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4)
        if (type === 0x004e4942) bin = bytes.subarray(offset + 8, offset + 8 + length)
        offset += 8 + length
    }
    if (!bin) throw new Error('GLB has no BIN chunk.')
    return { json, bin, view: new DataView(bin.buffer, bin.byteOffset, bin.byteLength), bytes: bytes.length }
}

function readAccessor(gltf, index) {
    const acc = gltf.json.accessors[index]
    if (acc.sparse) throw new Error(`Accessor ${index} is sparse; unsupported by this audit.`)
    const size = NUM[acc.type], comp = COMPONENT[acc.componentType]
    const out = comp.get === 'getFloat32' ? new Float32Array(acc.count * size) : new Uint32Array(acc.count * size)
    if (acc.bufferView === undefined) return out
    const bv = gltf.json.bufferViews[acc.bufferView]
    const base = (bv.byteOffset || 0) + (acc.byteOffset || 0)
    const stride = bv.byteStride || size * comp.bytes
    for (let i = 0; i < acc.count; i++) {
        const start = base + i * stride
        for (let c = 0; c < size; c++) out[i * size + c] = gltf.view[comp.get](start + c * comp.bytes, true)
    }
    return out
}

// ---------------------------------------------------------------- scene graph

function buildNodes(gltf) {
    const nodes = gltf.json.nodes.map((node, index) => ({
        index, name: node.name || `node_${index}`, raw: node, mesh: node.mesh, camera: node.camera,
        children: node.children || [], parent: null, world: new Matrix4()
    }))
    for (const node of nodes) for (const child of node.children) nodes[child].parent = node.index
    const local = node => {
        const m = new Matrix4()
        if (node.raw.matrix) return m.fromArray(node.raw.matrix)
        return m.compose(
            new Vector3().fromArray(node.raw.translation || [0, 0, 0]),
            new Quaternion().fromArray(node.raw.rotation || [0, 0, 0, 1]),
            new Vector3().fromArray(node.raw.scale || [1, 1, 1]))
    }
    const walk = (index, parentMatrix) => {
        const node = nodes[index]
        node.world.multiplyMatrices(parentMatrix, local(node))
        for (const child of node.children) walk(child, node.world)
    }
    const scene = gltf.json.scenes[gltf.json.scene ?? 0]
    for (const root of scene.nodes) walk(root, new Matrix4())
    return nodes
}

// ---------------------------------------------------------------- geometry

function primitiveData(gltf, primitive) {
    const position = readAccessor(gltf, primitive.attributes.POSITION)
    const normal = primitive.attributes.NORMAL !== undefined ? readAccessor(gltf, primitive.attributes.NORMAL) : null
    const hasTangent = primitive.attributes.TANGENT !== undefined
    const count = position.length / 3
    let index
    if (primitive.indices !== undefined) index = readAccessor(gltf, primitive.indices)
    else { index = new Uint32Array(count); for (let i = 0; i < count; i++) index[i] = i }
    return { position, normal, hasTangent, index, vertexCount: count }
}

// Welds by quantised position so seam-split vertices do not read as holes.
function topology({ position, index, normal }) {
    const map = new Map(), welded = new Uint32Array(position.length / 3)
    for (let v = 0; v < welded.length; v++) {
        const key = `${Math.round(position[v * 3] / WELD)},${Math.round(position[v * 3 + 1] / WELD)},${Math.round(position[v * 3 + 2] / WELD)}`
        let id = map.get(key)
        if (id === undefined) { id = map.size; map.set(key, id) }
        welded[v] = id
    }
    const edges = new Map()
    let triangles = 0, degenerate = 0, flipped = 0, normalChecked = 0
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), ab = new Vector3(), ac = new Vector3(), face = new Vector3(), avg = new Vector3()
    for (let t = 0; t + 2 < index.length; t += 3) {
        const i0 = index[t], i1 = index[t + 1], i2 = index[t + 2]
        triangles++
        a.fromArray(position, i0 * 3); b.fromArray(position, i1 * 3); c.fromArray(position, i2 * 3)
        ab.subVectors(b, a); ac.subVectors(c, a); face.crossVectors(ab, ac)
        const area = face.length() / 2
        if (area < 1e-12) { degenerate++; continue }
        face.divideScalar(area * 2)
        if (normal) {
            avg.set(0, 0, 0)
            for (const i of [i0, i1, i2]) avg.add(new Vector3().fromArray(normal, i * 3))
            if (avg.lengthSq() > 1e-12) { normalChecked++; if (avg.dot(face) < 0) flipped++ }
        }
        const w = [welded[i0], welded[i1], welded[i2]]
        if (w[0] === w[1] || w[1] === w[2] || w[0] === w[2]) continue
        for (let e = 0; e < 3; e++) {
            const x = w[e], y = w[(e + 1) % 3]
            const key = x < y ? `${x}_${y}` : `${y}_${x}`
            edges.set(key, (edges.get(key) || 0) + 1)
        }
    }
    let boundary = 0, nonManifold = 0
    for (const uses of edges.values()) { if (uses === 1) boundary++; else if (uses > 2) nonManifold++ }
    return { triangles, degenerate, flipped, normalChecked, boundary, nonManifold, weldedVertices: map.size }
}

// Silhouette radius per 1 mm of height, taken from triangle spans so vertical faces fill the
// bins between their vertices. Joint recesses show up as periodic dips in this profile.
function radiusProfile(points, index, box, binMetres) {
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2
    const y0 = box.min.y, height = box.max.y - y0
    const bins = Math.max(1, Math.round(height / binMetres))
    const radius = new Float64Array(bins)
    const bin = y => Math.min(bins - 1, Math.max(0, Math.floor((y - y0) / height * bins)))
    for (let t = 0; t + 2 < index.length; t += 3) {
        let low = Infinity, high = -Infinity, rmax = 0
        for (let k = 0; k < 3; k++) {
            const v = index[t + k] * 3
            const x = points[v], y = points[v + 1], z = points[v + 2]
            if (y < low) low = y
            if (y > high) high = y
            const r = Math.hypot(x - cx, z - cz)
            if (r > rmax) rmax = r
        }
        for (let b = bin(low); b <= bin(high); b++) if (rmax > radius[b]) radius[b] = rmax
    }
    return { radius, y0, height, bins }
}

// A joint is a run of bins sitting inside the courses immediately above and below it. The
// baseline has to be local: the shaft tapers, so a single reference radius reads the whole
// upper half as recessed.
function jointBands(profile, minDepth = 0.0015, windowBins = 60) {
    const { radius } = profile
    const baseline = new Float64Array(radius.length)
    for (let b = 0; b < radius.length; b++) {
        const from = Math.max(0, b - windowBins), to = Math.min(radius.length - 1, b + windowBins)
        const window = []
        for (let i = from; i <= to; i++) if (radius[i] > 0) window.push(radius[i])
        window.sort((x, y) => x - y)
        baseline[b] = window.length ? window[Math.floor(window.length * 0.8)] : 0
    }
    const bands = []
    let start = -1
    for (let b = 0; b < radius.length; b++) {
        const inset = radius[b] > 0 && baseline[b] - radius[b] >= minDepth
        if (inset && start < 0) start = b
        else if (!inset && start >= 0) { bands.push([start, b - 1]); start = -1 }
    }
    if (start >= 0) bands.push([start, radius.length - 1])
    const metresPerBin = profile.height / profile.bins
    // Ignore the capital and base mouldings; joints are the repeated interior bands.
    const interior = bands.filter(([a, b]) => a > 2 && b < radius.length - 3)
    const centres = interior.map(([a, b]) => (a + b) / 2 * metresPerBin)
    const spacings = centres.slice(1).map((c, i) => c - centres[i])
    const mean = list => list.reduce((n, v) => n + v, 0) / list.length
    // One joint shows up as two bands, one per microbevel, so bands closer than 60 mm are one
    // joint. The course pitch is then the longest run of consecutive, near-equal spacings; the
    // base and capital mouldings sit outside that run and do not distort it.
    const joints = []
    for (const centre of centres) {
        if (joints.length && centre - joints[joints.length - 1].last <= 0.06) {
            const j = joints[joints.length - 1]
            j.last = centre; j.centre = (j.first + centre) / 2; j.bands++
        } else joints.push({ first: centre, last: centre, centre, bands: 1 })
    }
    const jointCentres = joints.map(j => j.centre)
    const gaps = jointCentres.slice(1).map((c, i) => c - jointCentres[i])
    let best = { start: 0, length: 0, pitch: 0 }
    for (let s = 0; s < gaps.length; s++) {
        let sum = gaps[s], n = 1
        for (let e = s + 1; e < gaps.length; e++) {
            const mean = sum / n
            if (Math.abs(gaps[e] - mean) / mean > 0.1) break
            sum += gaps[e]; n++
        }
        if (n > best.length) best = { start: s, length: n, pitch: sum / n }
    }
    return {
        bands: interior.length,
        bandCentresM: centres.map(v => +v.toFixed(4)),
        jointCount: joints.length, jointCentresM: jointCentres.map(v => +v.toFixed(4)),
        pitchM: +best.pitch.toFixed(4), regularJoints: best.length + 1, totalJoints: joints.length,
        coursedFromM: +(jointCentres[best.start] ?? 0).toFixed(4),
        coursedToM: +(jointCentres[best.start + best.length] ?? 0).toFixed(4),
        widthMm: interior.length ? +(mean(interior.map(([a, b]) => b - a + 1)) * metresPerBin * 1000).toFixed(2) : 0,
        depthMm: interior.length ? +(mean(interior.map(([a, b]) => {
            let deepest = 0
            for (let i = a; i <= b; i++) deepest = Math.max(deepest, baseline[i] - radius[i])
            return deepest
        })) * 1000).toFixed(2) : 0,
        spacingM: spacings.length ? +mean(spacings).toFixed(4) : 0,
        spacingSpreadMm: spacings.length ? +((Math.max(...spacings) - Math.min(...spacings)) * 1000).toFixed(2) : 0
    }
}

// Normalised profile so two columns can be compared upright and mirrored.
function normalisedProfile(profile, samples = 120) {
    const out = new Float64Array(samples)
    const peak = Math.max(...profile.radius)
    for (let s = 0; s < samples; s++) {
        const b = Math.min(profile.bins - 1, Math.floor(s / samples * profile.bins))
        out[s] = peak > 0 ? profile.radius[b] / peak : 0
    }
    return out
}
function profileDistance(a, b) {
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
    return Math.sqrt(sum / a.length)
}

function normalHealth({ normal }) {
    if (!normal) return { present: false }
    let bad = 0, zero = 0
    for (let v = 0; v < normal.length; v += 3) {
        const length = Math.hypot(normal[v], normal[v + 1], normal[v + 2])
        if (length < 1e-6) zero++
        else if (Math.abs(length - 1) > 1e-3) bad++
    }
    return { present: true, notUnit: bad, zeroLength: zero }
}

// ---------------------------------------------------------------- audit

const gltf = readGLB(GLB)
const nodes = buildNodes(gltf)
const materials = gltf.json.materials || []
const meshNodes = nodes.filter(node => node.mesh !== undefined)

const report = { generated: new Date().toISOString(), source: GLB, bytes: gltf.bytes, checks: {}, findings: [] }
const finding = (severity, area, text) => report.findings.push({ severity, area, text })

// Per-node geometry pass.
const box = new Box3(), point = new Vector3()
for (const node of meshNodes) {
    const mesh = gltf.json.meshes[node.mesh]
    node.meshName = mesh.name
    node.stats = { triangles: 0, degenerate: 0, flipped: 0, normalChecked: 0, boundary: 0, nonManifold: 0, notUnitNormals: 0, zeroNormals: 0, missingNormals: 0, primitives: mesh.primitives.length }
    node.materials = []
    node.box = new Box3()
    const keepGeometry = /^Columna \d+/.test(node.name)
    const worldPoints = [], worldIndex = []
    for (const primitive of mesh.primitives) {
        const data = primitiveData(gltf, primitive)
        if (keepGeometry) {
            const base = worldPoints.length / 3
            for (let v = 0; v < data.vertexCount; v++) {
                point.fromArray(data.position, v * 3).applyMatrix4(node.world)
                worldPoints.push(point.x, point.y, point.z)
            }
            for (const i of data.index) worldIndex.push(base + i)
        }
        const topo = topology(data), health = normalHealth(data)
        node.stats.triangles += topo.triangles; node.stats.degenerate += topo.degenerate
        node.stats.flipped += topo.flipped; node.stats.normalChecked += topo.normalChecked
        node.stats.boundary += topo.boundary; node.stats.nonManifold += topo.nonManifold
        if (!health.present) node.stats.missingNormals++
        else { node.stats.notUnitNormals += health.notUnit; node.stats.zeroNormals += health.zeroLength }
        const material = primitive.material !== undefined ? materials[primitive.material] : null
        node.materials.push({ index: primitive.material ?? null, name: material?.name ?? 'default', hasNormalMap: Boolean(material?.normalTexture), hasTangent: data.hasTangent })
        box.makeEmpty()
        for (let v = 0; v < data.vertexCount; v++) box.expandByPoint(point.fromArray(data.position, v * 3))
        box.applyMatrix4(node.world)
        node.box.union(box)
    }
    node.worldScale = new Vector3().setFromMatrixScale(node.world)
    node.determinant = node.world.determinant()
    if (keepGeometry) {
        node.profile = radiusProfile(new Float32Array(worldPoints), Uint32Array.from(worldIndex), node.box, 0.001)
        node.joints = jointBands(node.profile)
        node.shape = normalisedProfile(node.profile)
    }
}

const totals = meshNodes.reduce((acc, node) => {
    for (const key of ['triangles', 'degenerate', 'flipped', 'boundary', 'nonManifold', 'notUnitNormals', 'zeroNormals', 'missingNormals']) acc[key] += node.stats[key]
    return acc
}, { triangles: 0, degenerate: 0, flipped: 0, boundary: 0, nonManifold: 0, notUnitNormals: 0, zeroNormals: 0, missingNormals: 0 })
report.checks.totals = { meshNodes: meshNodes.length, ...totals }

// --- 1. Columns, courses and inverted profiles -------------------------------
const columnNodes = meshNodes.filter(node => /^Columna \d+/.test(node.name)).sort((a, b) => a.name.localeCompare(b.name))

// Two columns share a profile family when their normalised silhouettes match; a match against
// the reversed silhouette is an inverted specimen. This is how "perfiles invertidos" is verified,
// because the inversion is baked into the mesh and never appears in the node transform.
const families = []
for (const node of columnNodes) {
    const reversed = Float64Array.from(node.shape).reverse()
    let placed = false
    for (const family of families) {
        if (profileDistance(node.shape, family.reference) < 0.05) { family.upright.push(node.name); placed = true; break }
        if (profileDistance(reversed, family.reference) < 0.05) { family.inverted.push(node.name); placed = true; break }
    }
    if (!placed) families.push({ reference: node.shape, upright: [node.name], inverted: [] })
}

const columns = columnNodes.map(node => {
    const size = node.box.getSize(new Vector3()), centre = node.box.getCenter(new Vector3())
    const family = families.findIndex(f => f.upright.includes(node.name) || f.inverted.includes(node.name))
    return {
        name: node.name, triangles: node.stats.triangles, primitives: node.stats.primitives,
        materials: node.materials.map(m => m.name),
        height: +size.y.toFixed(4), footprint: [+size.x.toFixed(4), +size.z.toFixed(4)],
        jointBands: node.joints.bands, jointWidthMm: node.joints.widthMm, jointDepthMm: node.joints.depthMm,
        pitchM: node.joints.pitchM, regularJoints: node.joints.regularJoints, totalJoints: node.joints.totalJoints,
        coursedSpan: [node.joints.coursedFromM, node.joints.coursedToM],
        jointCentresM: node.joints.jointCentresM,
        profileFamily: family, inverted: families[family]?.inverted.includes(node.name) ?? false,
        centre: centre.toArray().map(v => +v.toFixed(3)),
        yawDegrees: +(Math.atan2(node.world.elements[8], node.world.elements[10]) * 180 / Math.PI).toFixed(2),
        mirrored: node.determinant < 0,
        boundaryEdges: node.stats.boundary, nonManifoldEdges: node.stats.nonManifold, flippedTriangles: node.stats.flipped
    }
})
const yaws = new Map()
for (const c of columns) { const key = Math.round(c.yawDegrees); yaws.set(key, (yaws.get(key) || 0) + 1) }
report.checks.columns = {
    count: columns.length, expected: 18,
    orientations: Object.fromEntries([...yaws].map(([deg, n]) => [`${deg}°`, n])),
    mirroredByTransform: columns.filter(c => c.mirrored).length,
    profileFamilies: families.map((f, i) => ({ family: i, upright: f.upright.length, inverted: f.inverted.length, uprightNames: f.upright, invertedNames: f.inverted })),
    // Distance of every family reference against every other, upright and reversed, so the
    // "no inverted specimens" conclusion can be checked instead of trusted.
    familyDistances: families.map((f, i) => families.map((g, j) => ({
        pair: `${i}-${j}`, upright: +profileDistance(f.reference, g.reference).toFixed(4),
        reversed: +profileDistance(f.reference, Float64Array.from(g.reference).reverse()).toFixed(4)
    }))).flat().filter(d => d.pair[0] !== d.pair[2]),
    selfSymmetry: columnNodes.map(node => ({ name: node.name, distanceToOwnReverse: +profileDistance(node.shape, Float64Array.from(node.shape).reverse()).toFixed(4) })),
    invertedProfiles: columns.filter(c => c.inverted).length,
    withJoints: columns.filter(c => c.jointBands > 0).length,
    jointNote: 'La banda medida incluye el microbisel de la hilada superior, la junta y el microbisel de la inferior, así que su anchura supera los 6 mm de la junta pura. El paso se mide, no se supone, porque las hiladas ocupan el fuste y no la columna entera.',
    pitchRange: [Math.min(...columns.map(c => c.pitchM)), Math.max(...columns.map(c => c.pitchM))],
    jointCountRange: [Math.min(...columns.map(c => c.totalJoints)), Math.max(...columns.map(c => c.totalJoints))],
    regularity: columns.map(c => `${c.regularJoints}/${c.totalJoints}`),
    jointBandRange: [Math.min(...columns.map(c => c.jointBands)), Math.max(...columns.map(c => c.jointBands))],
    jointWidthRangeMm: [Math.min(...columns.map(c => c.jointWidthMm)), Math.max(...columns.map(c => c.jointWidthMm))],
    heightRange: [Math.min(...columns.map(c => c.height)), Math.max(...columns.map(c => c.height))],
    items: columns
}
if (columns.length !== 18) finding('alta', 'columnas', `Se esperaban 18 columnas y hay ${columns.length}.`)
if (columns.some(c => c.jointBands === 0)) finding('alta', 'columnas', 'Alguna columna no presenta juntas medibles en su silueta.')
if (report.checks.columns.invertedProfiles === 0) {
    finding('media', 'columnas', `Ninguna columna es el reflejo vertical de otra: hay ${families.length} familias de perfil distintas (${families.map(f => f.upright.length).join(' + ')}) y ninguna coincide con otra invertida. La documentación del modelo y el nombre de CAM 03 hablan de perfiles invertidos, así que conviene confirmarlo mirando CAM 03 contra Blender.`)
}

// --- 2. Chairs sharing one mesh ----------------------------------------------
const chairs = meshNodes.filter(node => /^Sillon \d+/.test(node.name))
const chairMeshes = new Set(chairs.map(node => node.mesh))
report.checks.chairs = {
    count: chairs.length, expected: 4, sharedMeshResources: chairMeshes.size,
    items: chairs.map(node => ({
        name: node.name, mesh: node.mesh,
        scale: node.worldScale.toArray().map(v => +v.toFixed(4)),
        yawDegrees: +(Math.atan2(node.world.elements[8], node.world.elements[10]) * 180 / Math.PI).toFixed(2),
        centre: node.box.getCenter(new Vector3()).toArray().map(v => +v.toFixed(3)),
        floorGap: null
    }))
}
if (chairs.length !== 4) finding('alta', 'sillones', `Se esperaban 4 sillones y hay ${chairs.length}.`)
if (chairMeshes.size !== 1) finding('media', 'sillones', `Los sillones usan ${chairMeshes.size} recursos de malla en vez de compartir uno.`)

// --- 3. Lattices and reliefs --------------------------------------------------
const lattices = meshNodes.filter(node => /Relieves y celosias/.test(node.name))
report.checks.lattices = {
    count: lattices.length,
    triangles: lattices.reduce((n, node) => n + node.stats.triangles, 0),
    sectors: lattices.map(node => node.name.replace(/.*sector /, '')).sort(),
    boundaryEdges: lattices.reduce((n, node) => n + node.stats.boundary, 0),
    items: lattices.map(node => ({ name: node.name, triangles: node.stats.triangles, box: node.box.min.toArray().map(v => +v.toFixed(2)).concat(node.box.max.toArray().map(v => +v.toFixed(2))) }))
}

// --- 4. Exterior building, sky and sun disc, with measured parallax ------------
const exteriorNames = ['Tyrell_Corporation_Pyramid', 'Cielo | fondo a 900 m', 'Sol | disco a 650 m']
const cameraNodes = nodes.filter(node => node.camera !== undefined)
const compareCameras = ['CAM 01', 'CAM 02', 'CAM 04'].map(prefix => cameraNodes.find(node => node.name.startsWith(prefix))).filter(Boolean)

function ndc(cameraNode, worldPoint) {
    const camera = gltf.json.cameras[cameraNode.camera].perspective
    const viewMatrix = new Matrix4().copy(cameraNode.world).invert()
    const v = worldPoint.clone().applyMatrix4(viewMatrix)
    if (v.z >= -1e-6) return null                       // behind the camera
    const f = 1 / Math.tan(camera.yfov / 2)
    return { x: +((f / (camera.aspectRatio || 2.4)) * v.x / -v.z).toFixed(4), y: +(f * v.y / -v.z).toFixed(4), distance: +(-v.z).toFixed(2) }
}

// An object, not a bare array: JSON.stringify drops properties hung off an array.
report.checks.exterior = { items: exteriorNames.map(name => {
    const node = meshNodes.find(n => n.name === name)
    if (!node) { finding('alta', 'exterior', `Falta el objeto "${name}".`); return { name, present: false } }
    const size = node.box.getSize(new Vector3()), centre = node.box.getCenter(new Vector3())
    return {
        name, present: true, triangles: node.stats.triangles,
        size: size.toArray().map(v => +v.toFixed(2)),
        centre: centre.toArray().map(v => +v.toFixed(2)),
        distanceFromOrigin: +centre.length().toFixed(2),
        flat: Math.min(size.x, size.y, size.z) < 0.01,
        withinCameraFar: centre.length() + size.length() / 2 < 2500,
        projection: Object.fromEntries(compareCameras.map(cam => [cam.name.split(' |')[0], ndc(cam, centre)]))
    }
}) }
const pyramid = report.checks.exterior.items.find(e => e.name === 'Tyrell_Corporation_Pyramid')
if (pyramid?.present) {
    const shots = Object.values(pyramid.projection).filter(Boolean)
    const spread = shots.length > 1 ? Math.max(...shots.map(s => s.x)) - Math.min(...shots.map(s => s.x)) : 0
    report.checks.exterior.parallax = {
        note: 'Desplazamiento del centro de la pirámide en coordenadas normalizadas de dispositivo entre las cámaras de comparación. Un fondo pegado a la cámara daría cero.',
        ndcSpreadX: +spread.toFixed(4), cameras: shots.length
    }
    if (pyramid.flat) finding('alta', 'exterior', 'La pirámide exterior es plana; no puede dar paralaje.')
}

// --- 5. Tangents wherever a normal map is used --------------------------------
const missingTangents = []
for (const node of meshNodes) for (const m of node.materials) if (m.hasNormalMap && !m.hasTangent) missingTangents.push(`${node.name} · ${m.name}`)
report.checks.tangents = { meshesWithNormalMap: meshNodes.reduce((n, node) => n + node.materials.filter(m => m.hasNormalMap).length, 0), missing: missingTangents }
if (missingTangents.length) finding('alta', 'tangentes', `${missingTangents.length} primitivas usan mapa normal sin tangentes.`)

// --- 6. Normals, missing faces and degenerate geometry ------------------------
const openMeshes = meshNodes.filter(node => node.stats.boundary > 0)
    .map(node => ({ name: node.name, boundaryEdges: node.stats.boundary, triangles: node.stats.triangles, nonManifold: node.stats.nonManifold }))
    .sort((a, b) => b.boundaryEdges - a.boundaryEdges)
const flippedMeshes = meshNodes.filter(node => node.stats.flipped > 0)
    .map(node => ({ name: node.name, flipped: node.stats.flipped, triangles: node.stats.triangles, share: +(node.stats.flipped / node.stats.triangles).toFixed(3) }))
    .sort((a, b) => b.flipped - a.flipped)
report.checks.surfaces = {
    note: 'Aristas de contorno tras soldar posiciones a 0,01 mm. Un valor alto sólo es defecto en sólidos cerrados; planos, cartelas de follaje y fondos están abiertos por diseño.',
    meshesWithBoundary: openMeshes.length, meshesClosed: meshNodes.length - openMeshes.length,
    degenerateTriangles: totals.degenerate, flippedTriangles: totals.flipped,
    nonManifoldEdges: totals.nonManifold, missingNormalAttribute: totals.missingNormals,
    nonUnitNormals: totals.notUnitNormals, zeroNormals: totals.zeroNormals,
    worstByBoundary: openMeshes.slice(0, 15),
    flippedNote: 'Normal de vértice promediada frente a la normal del devanado. Una cartela de doble cara declara la mitad de sus triángulos como invertidos por definición y no es un defecto.',
    meshesWithFlipped: flippedMeshes.length, worstByFlipped: flippedMeshes.slice(0, 15)
}
if (totals.missingNormals) finding('alta', 'normales', `${totals.missingNormals} primitivas sin atributo NORMAL.`)
if (totals.flipped) finding('media', 'normales', `${totals.flipped} triángulos con normal opuesta a su devanado, repartidos en ${flippedMeshes.length} mallas.`)
if (totals.degenerate) finding('baja', 'geometria', `${totals.degenerate} triángulos degenerados.`)

// --- 7. Scales ----------------------------------------------------------------
const scales = meshNodes.map(node => ({
    name: node.name, scale: node.worldScale.toArray().map(v => +v.toFixed(4)),
    uniform: Math.abs(node.worldScale.x - node.worldScale.y) < 1e-4 && Math.abs(node.worldScale.y - node.worldScale.z) < 1e-4,
    negative: node.determinant < 0
}))
report.checks.scales = {
    nonUniform: scales.filter(s => !s.uniform),
    negative: scales.filter(s => s.negative).map(s => s.name),
    distinctScales: [...new Set(scales.map(s => s.scale.join('×')))].sort()
}
if (report.checks.scales.negative.length) finding('media', 'escalas', `${report.checks.scales.negative.length} nodos con escala negativa; invierten el devanado de las caras.`)

// --- 8. Transparency and face culling -----------------------------------------
const transparency = materials.map((material, index) => ({
    index, name: material.name,
    alphaMode: material.alphaMode || 'OPAQUE', alphaCutoff: material.alphaCutoff,
    doubleSided: Boolean(material.doubleSided),
    transmission: material.extensions?.KHR_materials_transmission?.transmissionFactor ?? null,
    ior: material.extensions?.KHR_materials_ior?.ior ?? null,
    emissiveStrength: material.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? null,
    baseColorAlpha: material.pbrMetallicRoughness?.baseColorFactor?.[3] ?? 1
}))
report.checks.transparency = {
    materials: materials.length,
    doubleSided: transparency.filter(m => m.doubleSided).length,
    blended: transparency.filter(m => m.alphaMode === 'BLEND').map(m => m.name),
    masked: transparency.filter(m => m.alphaMode === 'MASK').map(m => m.name),
    transmissive: transparency.filter(m => m.transmission).map(m => ({ name: m.name, transmission: m.transmission, ior: m.ior })),
    emissive: transparency.filter(m => m.emissiveStrength).map(m => ({ name: m.name, strength: m.emissiveStrength })),
    items: transparency
}
if (report.checks.transparency.doubleSided === materials.length) {
    finding('media', 'materiales', `Los ${materials.length} materiales son doubleSided. Sin descarte de caras traseras se paga relleno de más y las sombras necesitan más sesgo.`)
}

// --- 9. Furniture contact and screening for interpenetration -------------------
const architecture = /^(Wall_|Parapet|Lintel|Wing_|Ceiling_|Door_Frame|Pavimento|Mortero|Relieves|Columna|Alfeizar|Beam|Cielo|Sol \||Tyrell_Corporation)/
const furniture = meshNodes.filter(node => !architecture.test(node.name) && node.stats.triangles > 0)
const floorTop = Math.max(...meshNodes.filter(node => node.name.startsWith('Pavimento')).map(node => node.box.max.y))

// Parts whose boxes touch belong to one piece of furniture. Judging a carved skirt or a bonsai
// canopy against the floor on its own produces false alarms, so contact is judged per assembly.
const parent = furniture.map((_, i) => i)
const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] } return i }
const near = (a, b) =>
    Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > -CLUSTER &&
    Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y) > -CLUSTER &&
    Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) > -CLUSTER
for (let i = 0; i < furniture.length; i++) for (let j = i + 1; j < furniture.length; j++) {
    if (near(furniture[i].box, furniture[j].box)) parent[find(i)] = find(j)
}
const clusters = new Map()
furniture.forEach((node, i) => {
    const key = find(i)
    if (!clusters.has(key)) clusters.set(key, { parts: [], box: new Box3() })
    const cluster = clusters.get(key)
    cluster.parts.push(node.name)
    cluster.box.union(node.box)
})
const contacts = [...clusters.values()].map(cluster => {
    const members = new Set(cluster.parts)
    // An assembly may rest on the podium or the sill rather than the floor; measure against
    // whatever surface is actually underneath it.
    let support = null
    for (const other of meshNodes) {
        if (members.has(other.name)) continue
        const overlapX = Math.min(cluster.box.max.x, other.box.max.x) - Math.max(cluster.box.min.x, other.box.min.x)
        const overlapZ = Math.min(cluster.box.max.z, other.box.max.z) - Math.max(cluster.box.min.z, other.box.min.z)
        if (overlapX <= 0 || overlapZ <= 0) continue
        if (other.box.max.y > cluster.box.min.y + CONTACT) continue
        if (!support || other.box.max.y > support.box.max.y) support = other
    }
    const surface = support ? support.box.max.y : floorTop
    const gap = cluster.box.min.y - surface
    return {
        assembly: cluster.parts.slice().sort()[0], parts: cluster.parts.length, partNames: cluster.parts,
        restsOn: support ? support.name : 'pavimento', supportTopY: +surface.toFixed(4),
        bottomY: +cluster.box.min.y.toFixed(4), gap: +gap.toFixed(4),
        gapToFloor: +(cluster.box.min.y - floorTop).toFixed(4),
        verdict: Math.abs(gap) <= CONTACT ? 'apoyado' : gap > 0 ? 'flotando' : 'hundido'
    }
}).sort((a, b) => a.gap - b.gap)
const floating = contacts.filter(c => c.verdict === 'flotando')
const sunken = contacts.filter(c => c.verdict === 'hundido')
report.checks.contacts = {
    note: `Las piezas cuyas cajas distan menos de ${CLUSTER * 1000} mm se agrupan en un conjunto y el conjunto se mide contra el pavimento. Las cajas están alineadas a los ejes, así que esto señala dónde mirar y no sustituye la revisión en pantalla.`,
    clusterToleranceMm: CLUSTER * 1000, contactToleranceMm: CONTACT * 1000,
    floorTopY: +floorTop.toFixed(4), assemblies: contacts.length, items: contacts,
    floating: floating.map(c => ({ assembly: c.assembly, gap: c.gap, restsOn: c.restsOn, parts: c.parts })),
    sunken: sunken.map(c => ({ assembly: c.assembly, gap: c.gap, restsOn: c.restsOn, parts: c.parts }))
}
if (sunken.length) finding('media', 'mobiliario', `${sunken.length} conjuntos penetran su apoyo más de ${CONTACT * 1000} mm.`)
if (floating.length) finding('media', 'mobiliario', `${floating.length} conjuntos quedan separados de su apoyo más de ${CONTACT * 1000} mm: ${floating.map(c => `${c.assembly} (${(c.gap * 1000).toFixed(0)} mm sobre ${c.restsOn})`).join(', ')}.`)

// Pairwise AABB screening between separate assemblies; parts of one piece overlap by design.
const clusterOf = new Map()
furniture.forEach((node, i) => clusterOf.set(node.name, find(i)))
const overlaps = []
for (let i = 0; i < furniture.length; i++) for (let j = i + 1; j < furniture.length; j++) {
    const a = furniture[i], b = furniture[j]
    if (clusterOf.get(a.name) === clusterOf.get(b.name)) continue
    const dx = Math.min(a.box.max.x, b.box.max.x) - Math.max(a.box.min.x, b.box.min.x)
    const dy = Math.min(a.box.max.y, b.box.max.y) - Math.max(a.box.min.y, b.box.min.y)
    const dz = Math.min(a.box.max.z, b.box.max.z) - Math.max(a.box.min.z, b.box.min.z)
    if (dx <= 0 || dy <= 0 || dz <= 0) continue
    const smaller = Math.min(
        (a.box.max.x - a.box.min.x) * (a.box.max.y - a.box.min.y) * (a.box.max.z - a.box.min.z),
        (b.box.max.x - b.box.min.x) * (b.box.max.y - b.box.min.y) * (b.box.max.z - b.box.min.z))
    const share = smaller > 0 ? (dx * dy * dz) / smaller : 0
    overlaps.push({ a: a.name, b: b.name, extents: [+dx.toFixed(3), +dy.toFixed(3), +dz.toFixed(3)], shareOfSmaller: +share.toFixed(3) })
}
overlaps.sort((x, y) => y.shareOfSmaller - x.shareOfSmaller)
report.checks.overlaps = {
    note: 'Cribado por cajas alineadas a los ejes entre conjuntos distintos. Una silla recogida bajo la mesa solapa de forma legítima; sólo indica dónde comprobar la malla real.',
    pairs: overlaps.length, deep: overlaps.filter(o => o.shareOfSmaller > 0.5).length, worst: overlaps.slice(0, 20)
}

// --- 10. Cameras --------------------------------------------------------------
report.checks.cameras = cameraNodes.map(node => {
    const camera = gltf.json.cameras[node.camera].perspective
    const position = new Vector3().setFromMatrixPosition(node.world)
    return {
        node: node.name, glTFName: gltf.json.cameras[node.camera].name,
        fovDegrees: +(camera.yfov * 180 / Math.PI).toFixed(3), aspectRatio: camera.aspectRatio,
        near: camera.znear, far: camera.zfar,
        position: position.toArray().map(v => +v.toFixed(3)),
        displayScale: +new Vector3().setFromMatrixScale(node.world).x.toFixed(4),
        comparison: ['CAM 01', 'CAM 02', 'CAM 04'].some(prefix => node.name.startsWith(prefix))
    }
}).sort((a, b) => a.node.localeCompare(b.node))
const badAspect = report.checks.cameras.filter(c => Math.abs((c.aspectRatio || 0) - 2.4) > 1e-6)
if (badAspect.length) finding('media', 'camaras', `${badAspect.length} cámaras no declaran 2,4:1.`)

// ---------------------------------------------------------------- output

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(report, null, 2))

const c = report.checks
console.log(`GLB ${gltf.bytes.toLocaleString('es')} bytes · ${c.totals.meshNodes} nodos de malla · ${c.totals.triangles.toLocaleString('es')} triángulos con repeticiones`)
console.log(`Columnas ${c.columns.count}/18 · altura ${c.columns.heightRange.map(v => v.toFixed(3)).join(' a ')} m · con juntas ${c.columns.withJoints}/${c.columns.count}`)
console.log(`  juntas por columna ${c.columns.jointCountRange.join(' a ')} · paso medido ${c.columns.pitchRange.map(v => v.toFixed(4)).join(' a ')} m · banda ${c.columns.jointWidthRangeMm.join(' a ')} mm con microbiseles`)
console.log(`  juntas en serie regular / totales: ${c.columns.regularity.join(' ')}`)
console.log(`  familias de perfil ${JSON.stringify(c.columns.profileFamilies.map(f => ({ derecho: f.upright, invertido: f.inverted })))} · invertidas ${c.columns.invertedProfiles} · giro ${JSON.stringify(c.columns.orientations)}`)
console.log(`Sillones ${c.chairs.count}/4 compartiendo ${c.chairs.sharedMeshResources} malla · celosías ${c.lattices.count} sectores, ${c.lattices.triangles.toLocaleString('es')} triángulos`)
for (const e of c.exterior.items) if (e.present) console.log(`Exterior ${e.name}: ${e.triangles.toLocaleString('es')} tri, tamaño ${e.size.join(' × ')} m, centro a ${e.distanceFromOrigin} m, plano=${e.flat}`)
console.log(`Paralaje de la pirámide entre cámaras de comparación: ${c.exterior.parallax?.ndcSpreadX} NDC en X`)
console.log(`Normales: ${c.surfaces.missingNormalAttribute} primitivas sin atributo, ${c.surfaces.nonUnitNormals} no unitarias, ${c.surfaces.flippedTriangles} triángulos invertidos`)
console.log(`Superficies: ${c.surfaces.meshesClosed} mallas cerradas, ${c.surfaces.meshesWithBoundary} con contorno abierto, ${c.surfaces.degenerateTriangles} triángulos degenerados, ${c.surfaces.nonManifoldEdges} aristas no manifold`)
console.log(`Tangentes: ${c.tangents.meshesWithNormalMap} primitivas con mapa normal, ${c.tangents.missing.length} sin tangentes`)
console.log(`Materiales: ${c.transparency.materials}, doubleSided ${c.transparency.doubleSided}, mezcla ${c.transparency.blended.length}, máscara ${c.transparency.masked.length}, transmisión ${c.transparency.transmissive.length}`)
console.log(`Escalas: ${c.scales.nonUniform.length} no uniformes, ${c.scales.negative.length} negativas`)
console.log(`Mobiliario: ${c.contacts.assemblies} conjuntos, ${c.contacts.floating.length} flotando, ${c.contacts.sunken.length} hundidos · solapes entre conjuntos ${c.overlaps.pairs}, profundos ${c.overlaps.deep}`)
for (const f of c.contacts.floating) console.log(`  flota ${f.gap.toFixed(3)} m: ${f.assembly} (${f.parts} piezas)`)
console.log(`\n${report.findings.length} hallazgos:`)
for (const f of report.findings) console.log(`  [${f.severity}] ${f.area}: ${f.text}`)
console.log(`\nInforme completo: ${OUT}`)
