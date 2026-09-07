// Deterministic index-only cleanup. The authored export remains untouched.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.resolve(project, '../../../../..')
const assetDir = path.join(repo, 'static/glbs/E26902_BladeRunner')
const input = path.join(assetDir, 'BladeRunner_5_6_High_v3_edited.glb')
const output = path.join(assetDir, 'BladeRunner_5_6_High_v3_phase2.glb')
const raw = fs.readFileSync(input), jsonLength = raw.readUInt32LE(12)
const doc = JSON.parse(raw.subarray(20, 20 + jsonLength))
const binary = Buffer.from(raw.subarray(28 + jsonLength))
function accessor(id) {
    const a = doc.accessors[id], view = doc.bufferViews[a.bufferView]
    if (a.sparse || view.buffer !== undefined && view.buffer !== 0) throw new Error('Unsupported accessor')
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
    const component = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType]
    const read = { 5126: 'readFloatLE', 5125: 'readUInt32LE', 5123: 'readUInt16LE', 5121: 'readUInt8' }[a.componentType]
    const offset = (view.byteOffset || 0) + (a.byteOffset || 0)
    const stride = view.byteStride || n * component
    return { a, offset, stride, component, values: Array.from({ length: a.count }, (_, i) => Array.from({ length: n }, (_, k) => binary[read](offset + i * stride + k * component))) }
}
const report = { input, inputSha256: crypto.createHash('sha256').update(raw).digest('hex'),
    method: 'Index-only: discard triangles of area <=1e-10 m2 (local coordinates, float64 or float32 cross product); reverse winding where normalized mean exported normal dot face normal < -0.1. No position/normal/UV/material/camera edits.', meshes: [] }
// Read everything before writing: some primitives share index accessors.
const jobs = doc.meshes.flatMap((mesh, meshIndex) => mesh.primitives.map((p, primitiveIndex) => {
    if (p.mode !== undefined && p.mode !== 4 || p.indices === undefined || p.attributes.NORMAL === undefined) throw new Error('Expected indexed triangles with normals')
    return { mesh, meshIndex, primitiveIndex, p, positions: accessor(p.attributes.POSITION).values, normals: accessor(p.attributes.NORMAL).values, indices: accessor(p.indices) }
}))
const writes = new Map()
const appended = []
let binaryLength = binary.length
for (const job of jobs) {
    const { mesh, meshIndex, primitiveIndex, p, positions, normals, indices } = job
    const result = [], record = { meshIndex, primitiveIndex, name: mesh.name, inputTriangles: indices.values.length / 3, removed: 0, reversed: 0 }
    for (let i = 0; i < indices.values.length; i += 3) {
        const [a, b, c] = indices.values.slice(i, i + 3).map(v => v[0])
        const u = positions[b].map((v, k) => v - positions[a][k]), v = positions[c].map((v, k) => v - positions[a][k])
        const face = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        const length = Math.hypot(...face)
        // Also reject slivers that collapse at the float32 precision used by the GPU.
        const f = Math.fround, uf = u.map(f), vf = v.map(f)
        const face32 = [f(f(uf[1]*vf[2])-f(uf[2]*vf[1])), f(f(uf[2]*vf[0])-f(uf[0]*vf[2])), f(f(uf[0]*vf[1])-f(uf[1]*vf[0]))]
        if (length <= 2e-10 || Math.hypot(...face32) <= 2e-10) { record.removed++; continue }
        const normal = normals[a].map((v, k) => v + normals[b][k] + normals[c][k])
        const dot = face.reduce((sum, v, k) => sum + v * normal[k], 0) / (length * Math.hypot(...normal))
        if (dot < -0.1) { result.push(a, c, b); record.reversed++ }
        else result.push(a, b, c)
    }
    if (!result.length) throw new Error('Cleanup would empty a primitive')
    if (writes.has(p.indices) && JSON.stringify(writes.get(p.indices).result) !== JSON.stringify(result)) {
        // Mirrored primitives can share source indices but require distinct winding.
        const length = result.length * indices.component
        const buffer = Buffer.alloc(Math.ceil(length / 4) * 4)
        const write = { 5125: 'writeUInt32LE', 5123: 'writeUInt16LE', 5121: 'writeUInt8' }[indices.a.componentType]
        result.forEach((value,i)=>buffer[write](value,i*indices.component))
        const view = doc.bufferViews.push({ buffer: 0, byteOffset: binaryLength, byteLength: length, target: 34963 }) - 1
        p.indices = doc.accessors.push({ ...indices.a, bufferView: view, byteOffset: 0, count: result.length,
            min:[result.reduce((a,b)=>Math.min(a,b),Infinity)], max:[result.reduce((a,b)=>Math.max(a,b),-Infinity)] }) - 1
        appended.push(buffer); binaryLength += buffer.length
    } else writes.set(p.indices, { result, indices })
    report.meshes.push(record)
}
for (const { result, indices } of writes.values()) {
    const write = { 5125: 'writeUInt32LE', 5123: 'writeUInt16LE', 5121: 'writeUInt8' }[indices.a.componentType]
    result.forEach((value, i) => binary[write](value, indices.offset + i * indices.stride))
    indices.a.count = result.length
    indices.a.min = [result.reduce((a,b)=>Math.min(a,b),Infinity)]
    indices.a.max = [result.reduce((a,b)=>Math.max(a,b),-Infinity)]
}
doc.buffers[0].byteLength = binaryLength
let json = Buffer.from(JSON.stringify(doc))
json = Buffer.concat([json, Buffer.alloc((4-json.length%4)%4, 32)])
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8)
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binaryLength, 8)
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
binHeader.writeUInt32LE(binaryLength, 0); binHeader.writeUInt32LE(0x004e4942, 4)
const bytes = Buffer.concat([header, json, binHeader, binary, ...appended])
fs.writeFileSync(output, bytes)
report.output = output; report.outputBytes = bytes.length
report.outputSha256 = crypto.createHash('sha256').update(bytes).digest('hex')
report.removedUniqueTriangles = report.meshes.reduce((a,m)=>a+m.removed,0)
report.reversedUniqueTriangles = report.meshes.reduce((a,m)=>a+m.reversed,0)
fs.mkdirSync(path.join(project, 'docs/phase2/surfaces'), { recursive: true })
fs.writeFileSync(path.join(project, 'docs/phase2/surfaces/cleanup.json'), JSON.stringify(report,null,2))
console.log(JSON.stringify({ output, bytes: bytes.length, sha256: report.outputSha256, removed: report.removedUniqueTriangles, reversed: report.reversedUniqueTriangles }))
