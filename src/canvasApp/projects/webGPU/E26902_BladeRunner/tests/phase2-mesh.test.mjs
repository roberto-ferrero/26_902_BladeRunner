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

test('Active GLB preserves retained resources, applies reviewed poses and prunes requested objects', () => {
    assert.equal(crypto.createHash('sha256').update(source.bytes).digest('hex'), '7b860e4fa93da9380d7cdc3f38116d6905f5907d68086c1fd36c6ba895ba334c')
    for (const key of ['asset', 'scene', 'cameras', 'materials', 'textures', 'samplers', 'extensions', 'extensionsUsed', 'extensionsRequired', 'animations', 'skins']) {
        assert.deepEqual(clean.doc[key], source.doc[key], key)
    }
    const removed = new Set(['Instrument case', 'Instrument lid', 'Instrument clasp', 'Instrument clasp.001', 'Foot_3', 'Base_3'])
    const cleanNodes = new Map(clean.doc.nodes.map(node => [node.name, node]))
    for (const name of removed) assert.equal(cleanNodes.has(name), false)
    assert.equal(clean.doc.nodes.length, source.doc.nodes.length - removed.size)
    assert.equal(clean.doc.meshes.length, source.doc.meshes.length - removed.size)

    // Saved AUXILIAR.blend poses, 2026-09-22; positions use glTF Y-up coordinates.
    const poses = new Map([
        ['Sillon 01 | frente', [1.23161697, 0, -8.47192001]],
        ['Sillon 02 | fondo', [-.23588508, 0, -11.72000027]],
        ['Paper on folio', [-.21653384, .77575999, -10.69042397]],
        ['Leather folio', [-.21653384, .76208001, -10.69042397]],
        ['Crystal tumbler', [.68632615, .75199997, -10.06508255]],
        ['Cut crystal decanter', [.94552624, .75199997, -10.30988312]],
        ['Crystal stopper', [.94552624, 1.09039998, -10.30988312]],
        ['Crystal tumbler.001', [1.16872621, .75199997, -10.06508255]]
    ])
    const sourceMeshes = new Map(source.doc.meshes.map((mesh, i) => [i, mesh.name]))
    const cleanMeshes = new Map(clean.doc.meshes.map((mesh, i) => [i, mesh.name]))
    for (const original of source.doc.nodes) {
        if (removed.has(original.name)) continue
        const node = cleanNodes.get(original.name)
        assert.ok(node, original.name)
        const normalize = (value, meshes) => {
            const { translation, rotation, scale, matrix, mesh, ...rest } = value
            return { ...rest, mesh: mesh === undefined ? undefined : meshes.get(mesh) }
        }
        assert.deepEqual(normalize(node, cleanMeshes), normalize(original, sourceMeshes))
        if (poses.has(node.name)) {
            node.translation.forEach((x, k) => assert.ok(Math.abs(x - poses.get(node.name)[k]) < 1e-6))
            poses.delete(node.name)
        } else {
            for (const key of ['translation', 'rotation', 'scale', 'matrix']) assert.deepEqual(node[key], original[key], `${node.name}.${key}`)
        }
    }
    assert.equal(poses.size, 0)
    const activeMeshes = new Map(clean.doc.meshes.map(mesh => [mesh.name, mesh]))
    source.doc.meshes.filter(mesh => activeMeshes.has(mesh.name)).forEach(mesh => {
        const other = activeMeshes.get(mesh.name)
        assert.deepEqual({ ...other, primitives: undefined }, { ...mesh, primitives: undefined })
        assert.equal(other.primitives.length, mesh.primitives.length)
        mesh.primitives.forEach((p, pi) => {
            const current = other.primitives[pi]
            assert.deepEqual(Object.keys(current.attributes), Object.keys(p.attributes))
            for (const semantic of Object.keys(p.attributes)) {
                const a = source.doc.accessors[p.attributes[semantic]], b = clean.doc.accessors[current.attributes[semantic]]
                assert.deepEqual({ ...b, bufferView: undefined }, { ...a, bufferView: undefined })
                assert.deepEqual(clean.values(current.attributes[semantic]), source.values(p.attributes[semantic]))
            }
        })
    })
    const cleanImages = new Map(clean.doc.images.map(image => [image.name, image]))
    for (const image of source.doc.images) {
        const current = cleanImages.get(image.name)
        assert.deepEqual({ ...current, bufferView: undefined }, { ...image, bufferView: undefined })
        assert.deepEqual(clean.view(current.bufferView), source.view(image.bufferView))
    }
})

test('Cleanup adds no faces, retains non-sliver faces and aligns winding with authored normals', () => {
    let removed = 0, sourceScene = 0, cleanScene = 0
    const triangleKey = ids => [...ids].sort((a, b) => a - b).join(',')
    const activeMeshes = new Map(clean.doc.meshes.map(mesh => [mesh.name, mesh]))
    source.doc.meshes.filter(mesh => activeMeshes.has(mesh.name)).forEach(mesh => mesh.primitives.forEach((p, pi) => {
        const cleanMesh = activeMeshes.get(mesh.name)
        const positions = source.values(p.attributes.POSITION), normals = source.values(p.attributes.NORMAL)
        const before = source.values(p.indices).flat(), after = clean.values(cleanMesh.primitives[pi].indices).flat()
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
            assert.ok(entry?.count > 0, `Unexpected face in mesh ${mesh.name}`); entry.count--
            const face = faceVector(ids), magnitude = Math.hypot(...face)
            assert.ok(magnitude > 2e-10)
            const normal = [0, 1, 2].map(k => ids.reduce((sum, id) => sum + normals[id][k], 0))
            const cosine = face.reduce((sum, x, k) => sum + x * normal[k], 0) / (magnitude * Math.hypot(...normal))
            assert.ok(cosine >= -0.10001, `Opposing face in mesh ${mesh.name}`)
        }
        for (const entry of faces.values()) if (entry.count) {
            // Independent conservative bound: every removed face has area below 0.01 mm².
            assert.ok(Math.hypot(...faceVector(entry.ids)) / 2 < 1e-8, `Non-sliver removed in mesh ${mesh.name}`)
            removed += entry.count
        }
    }))
    for (const node of source.doc.nodes) if (node.mesh !== undefined && activeMeshes.has(source.doc.meshes[node.mesh].name)) {
        const sourceMesh = source.doc.meshes[node.mesh], cleanMesh = activeMeshes.get(sourceMesh.name)
        sourceScene += sourceMesh.primitives.reduce((n, p) => n + source.doc.accessors[p.indices].count / 3, 0)
        cleanScene += cleanMesh.primitives.reduce((n, p) => n + clean.doc.accessors[p.indices].count / 3, 0)
    }
    assert.ok(removed > 5000)
    assert.ok(cleanScene < sourceScene)
    console.log(`Scene triangles: ${sourceScene} → ${cleanScene}; removed unique faces: ${removed}`)
})
