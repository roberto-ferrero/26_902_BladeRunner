// Offline planning audit. No rendering, occlusion test, asset mutation or GPU measurement.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import * as THREE from 'three'
import * as WEBGPU from 'three/webgpu'
import * as TSL from 'three/tsl'
import * as utilities from 'three/addons/utils/BufferGeometryUtils.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.resolve(project, '../../../../..')
const output = path.join(project, 'docs/optimization')
const require = createRequire(import.meta.url), cache = new Map()
const externals = { three: THREE, 'three/webgpu': WEBGPU, 'three/tsl': TSL,
    'three/addons/utils/BufferGeometryUtils.js': utilities }
function source(name) {
    if (cache.has(name)) return cache.get(name)
    const file = path.join(project, name)
    if (name.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'))
    const { code } = require('@babel/core').transformSync(fs.readFileSync(file, 'utf8'), {
        configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(id => {
        if (externals[id]) return externals[id]
        if (!id.startsWith('./')) throw new Error(`Unmapped import: ${id}`)
        return source(id.slice(2) + (path.extname(id) ? '' : '.js'))
    }, module, module.exports)
    cache.set(name, module.exports); return module.exports
}
function family(name) {
    if (/^VK_/.test(name)) return 'Voight-Kampff'
    if (/^(Licorera|Tapon|Vaso)$/.test(name)) return 'Cristaleria importada'
    if (/^Columna/.test(name)) return 'Columnas'
    if (/^Pavimento/.test(name)) return 'Pavimento'
    if (/^Mortero/.test(name)) return 'Mortero'
    if (/^Relieves/.test(name)) return 'Relieves y celosias'
    if (/^Sillon/.test(name)) return 'Sillones'
    if (/^Mesa|^Table_Slab$|^Foot_[45]$/.test(name)) return 'Mesa y soportes'
    if (/^Door_Frame$/.test(name)) return 'Marco de puerta'
    if (/crystal|Crystal/.test(name)) return 'Cristaleria original sustituida'
    if (/^Tyrell_Corporation/.test(name)) return 'Exterior original combinado'
    if (/^Cielo|^Sol/.test(name)) return 'Cielo y sol originales'
    if (/^Leather|^Paper/.test(name)) return 'Carpeta y papel'
    if (/^Wall|^Wing|^Ceiling|^Podest|^Parapet|^Lintel|^Beam|^Alfeizar/.test(name)) return 'Arquitectura restante'
    return 'Pedestales y ornamentos (clasificacion por confirmar visualmente)'
}
function metadata(file) {
    const bytes = fs.readFileSync(path.join(repo, 'static/glbs/E26902_BladeRunner', file))
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
    const rows = []
    const walk = (index, parent) => {
        const node = json.nodes[index], local = new THREE.Matrix4()
        if (node.matrix) local.fromArray(node.matrix)
        else local.compose(new THREE.Vector3().fromArray(node.translation || [0, 0, 0]),
            new THREE.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]), new THREE.Vector3().fromArray(node.scale || [1, 1, 1]))
        const world = parent.clone().multiply(local)
        if (node.mesh !== undefined) {
            const mesh = json.meshes[node.mesh], bounds = new THREE.Box3()
            let triangles = 0
            for (const p of mesh.primitives) {
                if ((p.mode ?? 4) !== 4) throw new Error('Audit requires triangle primitives')
                const a = json.accessors[p.attributes.POSITION]
                triangles += (p.indices === undefined ? a.count : json.accessors[p.indices].count) / 3
                bounds.union(new THREE.Box3(new THREE.Vector3().fromArray(a.min), new THREE.Vector3().fromArray(a.max)).applyMatrix4(world))
            }
            rows.push({ node: index, name: node.name, family: family(node.name), triangles,
                primitives: mesh.primitives.length, mesh: node.mesh,
                materials: [...new Set(mesh.primitives.map(p => json.materials?.[p.material]?.name ?? '(default)'))],
                bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } })
        }
        for (const child of node.children || []) walk(child, world)
    }
    for (const root of json.scenes[json.scene ?? 0].nodes) walk(root, new THREE.Matrix4())
    return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
        nodes: rows.length, primitives: rows.reduce((s, r) => s + r.primitives, 0),
        triangles: rows.reduce((s, r) => s + r.triangles, 0),
        materials: json.materials?.length, images: json.images?.length, rows, bytesData: bytes }
}
const assets = ['BladeRunner_5_6_High_v3_phase2.glb', 'Glassware.glb', 'VK_Device.glb'].map(metadata)
// GLTFLoader is used for the exact current procedural city roof; image decoding is stubbed.
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })
const bytes = assets[0].bytesData
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const city = new (source('TyrellCity.js').default)(scene)
const lights = new (source('TyrellBuildingLights.js').default)(scene)
const air = new (source('TyrellAirTraffic.js').default)(scene)
const near = new (source('TyrellNearTraffic.js').default)(scene)
const cores = source('TyrellColumnCores.js').addColumnCores(scene)
const flames = source('TyrellFlames.js')
const states = source('cameraStates.generated.json').cameraStates
const gui = JSON.parse(fs.readFileSync(path.join(repo, 'static/config/E26902_BladeRunner/gui.initial.json'), 'utf8'))
const objects = assets[0].rows.map(row => ({ ...row }))
for (const [i, tower] of flames.FLAME_TOWERS.entries()) {
    const b = flames.flameBounds(tower)
    objects.push({ name: `Llamarada ${i + 1} (envolvente por defecto)`, family: 'Llamaradas',
        triangles: 0, primitives: 0, bounds: { min: b.min.toArray(), max: b.max.toArray() } })
}
function pan(state) { return { ...gui.camera.mousePan.default, ...gui.camera.mousePan.states[state.cameraStateId] } }
function frustum(a, b, t, px, py, aspect) {
    const camera = new THREE.PerspectiveCamera(THREE.MathUtils.lerp(a.fov, b.fov, t), aspect, a.near, a.far)
    camera.position.fromArray(a.position).lerp(new THREE.Vector3().fromArray(b.position), t)
    const target = new THREE.Vector3().fromArray(a.target).lerp(new THREE.Vector3().fromArray(b.target), t)
    camera.lookAt(target)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    camera.position.addScaledVector(right, px * THREE.MathUtils.lerp(pan(a).horizontalTravelMeters, pan(b).horizontalTravelMeters, t))
        .addScaledVector(up, py * THREE.MathUtils.lerp(pan(a).verticalTravelMeters, pan(b).verticalTravelMeters, t))
    camera.up.copy(up); camera.lookAt(target); camera.updateMatrixWorld(true)
    return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
}
const views = {}
for (const state of states) views[state.cameraStateId] = [state, state, 1]
for (let i = 0; i < states.length; i++) for (let j = i + 1; j < states.length; j++)
    views[`${states[i].cameraStateId}<->${states[j].cameraStateId}`] = [states[i], states[j], 101]
for (const object of objects) object.potentialVisibility = {}
for (const [key, [a, b, steps]] of Object.entries(views)) {
    const candidates = new Set()
    for (let i = 0; i < steps; i++) for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
        const f = frustum(a, b, steps === 1 ? 0 : i / (steps - 1), x, y, 2.4)
        for (const o of objects) if (!candidates.has(o.name) && f.intersectsBox(new THREE.Box3(
            new THREE.Vector3().fromArray(o.bounds.min), new THREE.Vector3().fromArray(o.bounds.max)))) candidates.add(o.name)
    }
    for (const o of objects) o.potentialVisibility[key] = candidates.has(o.name)
}
const families = {}
for (const row of assets[0].rows) {
    const f = families[row.family] ??= { nodes: 0, primitives: 0, triangles: 0 }
    f.nodes++; f.primitives += row.primitives; f.triangles += row.triangles
}
const report = { date: '2026-09-25', threeRevision: THREE.REVISION,
    scope: 'Offline source GLB inventory plus current procedural constructors; no GPU or occlusion measurement. Frustum AABB sampling only, 2.4 aspect, 9 pan positions, 101 route points, no interrupted routes, shadows, reflection or mobile aspect coverage. False does not authorize hiding.',
    assets: assets.map(({ bytesData, ...asset }) => asset), families,
    procedural: { city: city.diagnostics(), buildingLights: lights.diagnostics(), air: air.diagnostics(), near: near.diagnostics(), cores: cores.userData.columnRepair },
    cameraStates: states, potentialVisibility: objects }
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(report, null, 2) + '\n')
const columns = ['family', 'name', 'triangles', 'primitives', ...Object.keys(views)]
const quote = value => '"' + String(value).replaceAll('"', '""') + '"'
fs.writeFileSync(path.join(output, 'inventory.csv'), '\uFEFF' + [columns, ...objects.map(o => [o.family, o.name, o.triangles, o.primitives,
    ...Object.keys(views).map(v => o.potentialVisibility[v] ? 'POTENCIAL' : 'FUERA_MUESTRAS')])].map(r => r.map(quote).join(';')).join('\n') + '\n')
console.log(JSON.stringify({ families, city: city.stats, lights: lights.diagnostics().beaconCount,
    air: air.diagnostics().capacity, near: near.diagnostics().trianglesPerVehicle, cores: cores.userData.columnRepair,
    excluded: Object.fromEntries(Object.keys(views).map(v => [v, objects.filter(o => !o.potentialVisibility[v]).map(o => o.name)])) }, null, 2))
