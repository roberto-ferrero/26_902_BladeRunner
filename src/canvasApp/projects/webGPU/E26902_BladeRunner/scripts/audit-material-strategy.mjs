// Offline inspection of GLTFLoader materials and the installed WebGPU node library.
// Image decoding is stubbed; this checks bindings, not pixels or GPU compilation.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { REVISION } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import StandardNodeLibrary from 'three/src/renderers/webgpu/nodes/StandardNodeLibrary.js'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.resolve(project, '../../../../..')
const raw = fs.readFileSync(path.join(repo, 'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb'))
const oldSelf = globalThis.self, oldBitmap = globalThis.createImageBitmap
try {
    globalThis.self = globalThis
    globalThis.createImageBitmap = async blob => {
        const bytes = Buffer.from(await blob.arrayBuffer())
        assert.equal(bytes.subarray(1, 4).toString(), 'PNG', 'Expected audited PNG images')
        return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), close() {} }
    }
    const { scene } = await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '')
    const materials = new Map(), library = new StandardNodeLibrary()
    scene.traverse(object => {
        if (!object.isMesh) return
        for (const material of [].concat(object.material)) materials.set(material, (materials.get(material) || 0) + 1)
    })
    const rows = [...materials].map(([material, instances]) => {
        const NodeClass = library.getMaterialNodeClass(material.type)
        assert.ok(NodeClass, `No WebGPU mapping: ${material.name}`)
        const adapted = library.fromMaterial(material)
        const slots = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'transmissionMap', 'thicknessMap']
        for (const slot of slots) assert.equal(adapted[slot], material[slot], `${material.name}: ${slot}`)
        for (const key of ['roughness', 'metalness', 'transmission', 'thickness', 'ior']) {
            assert.equal(adapted[key], material[key], `${material.name}: ${key}`)
        }
        return { name: material.name, instances, materialType: material.type, webgpuImplementation: NodeClass.type,
            explicitNodeMaterial: material.isNodeMaterial === true,
            maps: slots.filter(slot => material[slot]), transmission: material.transmission ?? 0,
            decision: 'Keep imported material; use built-in WebGPU adaptation' }
    })
    const counts = {}
    for (const row of rows) counts[row.materialType] = (counts[row.materialType] || 0) + 1
    const report = { threeRevision: REVISION, assetSha256: createHash('sha256').update(raw).digest('hex'),
        scope: 'Offline loader/library compatibility; no GPU rendering or image decoding',
        materialCount: rows.length, counts, preservedBindings: true, materials: rows }
    const out = path.join(project, 'docs/phase3/3.5')
    fs.mkdirSync(out, { recursive: true })
    fs.writeFileSync(path.join(out, 'material-strategy.json'), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify({ threeRevision: REVISION, materialCount: rows.length, counts, preservedBindings: true }))
} finally {
    if (oldSelf === undefined) delete globalThis.self; else globalThis.self = oldSelf
    if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap
}
