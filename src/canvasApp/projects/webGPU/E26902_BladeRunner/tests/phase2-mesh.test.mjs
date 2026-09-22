import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'

function glb(suffix) {
    const bytes = fs.readFileSync(`static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_${suffix}.glb`)
    const length = bytes.readUInt32LE(12)
    const doc = JSON.parse(bytes.subarray(20, 20 + length)), bin = bytes.subarray(28 + length)
    const view = id => { const v = doc.bufferViews[id]; return bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength) }
    const values = id => {
        const a = doc.accessors[id], v = doc.bufferViews[a.bufferView]
        const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
        const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType]
        const method = { 5126: 'readFloatLE', 5125: 'readUInt32LE', 5123: 'readUInt16LE', 5121: 'readUInt8' }[a.componentType]
        return Array.from({ length: a.count }, (_, i) => Array.from({ length: n }, (_, k) =>
            bin[method]((v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || size * n) + k * size)))
    }
    return { bytes, doc, view, values }
}
const source = glb('edited'), clean = glb('phase2')

test('Index cleanup preserves source resources and all nodes except the two reviewed auxiliary transforms', () => {
    assert.equal(crypto.createHash('sha256').update(source.bytes).digest('hex'), '7b860e4fa93da9380d7cdc3f38116d6905f5907d68086c1fd36c6ba895ba334c')
    for (const key of ['asset', 'scene', 'scenes', 'cameras', 'materials', 'textures', 'images', 'samplers', 'extensions', 'extensionsUsed', 'extensionsRequired', 'animations', 'skins']) {
        assert.deepEqual(clean.doc[key], source.doc[key], key)
    }
    // Saved AUXILIAR.blend poses, 2026-09-22; Blender Z-up converted to glTF Y-up.
    const poses = new Map([
        ['Sillon 01 | frente', { position: [1.4130348, 0, -8.4719200], yaw: -131.6136882 }],
        ['Sillon 02 | fondo', { position: [-.2358851, 0, -11.7200003], yaw: 0 }]
    ])
    assert.equal(clean.doc.nodes.length, source.doc.nodes.length)
    clean.doc.nodes.forEach((node, i) => {
        const expected = poses.get(node.name), original = source.doc.nodes[i]
        if (!expected) return assert.deepEqual(node, original)
        const stripTransform = ({ translation, rotation, scale, matrix, ...rest }) => rest
        assert.deepEqual(stripTransform(node), stripTransform(original))
        assert.equal(node.matrix, undefined)
        node.translation.forEach((x, k) => assert.ok(Math.abs(x - expected.position[k]) < 1e-6))
        node.scale.forEach(x => assert.ok(Math.abs(x - .74) < 1e-6))
        const angle = expected.yaw * Math.PI / 360, q = node.rotation
        const dot = Math.abs(q[1] * Math.sin(angle) + q[3] * Math.cos(angle))
        assert.ok(Math.abs(dot - 1) < 1e-6)
        assert.ok(Math.abs(q[0]) < 1e-6 && Math.abs(q[2]) < 1e-6)
        poses.delete(node.name)
    })
    assert.equal(poses.size, 0)
    assert.equal(clean.doc.meshes.length, source.doc.meshes.length)
    source.doc.meshes.forEach((mesh, mi) => {
        const other = clean.doc.meshes[mi]
        assert.deepEqual({ ...other, primitives: undefined }, { ...mesh, primitives: undefined })
        assert.equal(other.primitives.length, mesh.primitives.length)
        mesh.primitives.forEach((p, pi) => {
            assert.deepEqual({ ...other.primitives[pi], indices: undefined }, { ...p, indices: undefined })
            for (const id of Object.values(p.attributes)) {
                assert.deepEqual(clean.doc.accessors[id], source.doc.accessors[id])
                const viewId = source.doc.accessors[id].bufferView
                assert.deepEqual(clean.view(viewId), source.view(viewId))
            }
        })
    })
    for (const image of source.doc.images) assert.deepEqual(clean.view(image.bufferView), source.view(image.bufferView))
})

test('Cleanup adds no faces, retains non-sliver faces and aligns winding with authored normals', () => {
    let removed = 0, sourceScene = 0, cleanScene = 0
    const triangleKey = ids => [...ids].sort((a, b) => a - b).join(',')
    source.doc.meshes.forEach((mesh, mi) => mesh.primitives.forEach((p, pi) => {
        const positions = source.values(p.attributes.POSITION), normals = source.values(p.attributes.NORMAL)
        const before = source.values(p.indices).flat(), after = clean.values(clean.doc.meshes[mi].primitives[pi].indices).flat()
        const faces = new Map()
        for (let i = 0; i < before.length; i += 3) {
            const ids = before.slice(i, i + 3), key = triangleKey(ids)
            const entry = faces.get(key) || { count: 0, ids }; entry.count++; faces.set(key, entry)
        }
        const faceVector = ([a, b, c]) => {
            const u = positions[b].map((x, k) => x - positions[a][k]), v = positions[c].map((x, k) => x - positions[a][k])
            return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        }
        for (let i = 0; i < after.length; i += 3) {
            const ids = after.slice(i, i + 3), entry = faces.get(triangleKey(ids))
            assert.ok(entry?.count > 0, `Unexpected face in mesh ${mi}`); entry.count--
            const face = faceVector(ids), magnitude = Math.hypot(...face)
            assert.ok(magnitude > 2e-10)
            const normal = [0, 1, 2].map(k => ids.reduce((sum, id) => sum + normals[id][k], 0))
            const cosine = face.reduce((sum, x, k) => sum + x * normal[k], 0) / (magnitude * Math.hypot(...normal))
            assert.ok(cosine >= -0.10001, `Opposing face in mesh ${mi}`)
        }
        for (const entry of faces.values()) if (entry.count) {
            // Independent conservative bound: every removed face has area below 0.01 mm².
            assert.ok(Math.hypot(...faceVector(entry.ids)) / 2 < 1e-8, `Non-sliver removed in mesh ${mi}`)
            removed += entry.count
        }
    }))
    for (const node of source.doc.nodes) if (node.mesh !== undefined) {
        sourceScene += source.doc.meshes[node.mesh].primitives.reduce((n, p) => n + source.doc.accessors[p.indices].count / 3, 0)
        cleanScene += clean.doc.meshes[node.mesh].primitives.reduce((n, p) => n + clean.doc.accessors[p.indices].count / 3, 0)
    }
    assert.equal(removed, 5396)
    assert.ok(cleanScene < sourceScene)
    console.log(`Scene triangles: ${sourceScene} → ${cleanScene}; removed unique faces: ${removed}`)
})
