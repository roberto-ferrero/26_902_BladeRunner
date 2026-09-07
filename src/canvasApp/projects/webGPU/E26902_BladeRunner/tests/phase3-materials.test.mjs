import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellMaterialAudit.js'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
const { auditMaterialMaps } = module.exports

test('Real GLTFLoader retains correct color/data spaces and packed G/B maps for the active asset', async () => {
    const oldSelf = globalThis.self, oldBitmap = globalThis.createImageBitmap
    globalThis.self = globalThis
    // Only image decoding is stubbed for Node; browser and Pillow validate real pixels separately.
    globalThis.createImageBitmap = async blob => {
        const b = Buffer.from(await blob.arrayBuffer())
        return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), close() {} }
    }
    try {
        const raw = fs.readFileSync('static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb')
        const gltf = await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset+raw.byteLength), '')
        const result = auditMaterialMaps(gltf.scene)
        assert.deepEqual(result.issues, [])
        assert.equal(result.materialCount, 20)
        const mats = new Set()
        gltf.scene.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => mats.add(m)) })
        for (const mat of mats) {
            if (mat.roughnessMap) assert.equal(mat.roughnessMap, mat.metalnessMap)
            if (mat.normalMap) assert.notEqual(mat.normalMap.colorSpace, THREE.SRGBColorSpace)
            if (mat.map) assert.equal(mat.map.colorSpace, THREE.SRGBColorSpace)
        }
        assert.equal([...mats].find(m => m.name === 'PBR | Piedra negra pulida').normalScale.x, 0.03500000014901161)
    } finally {
        if (oldSelf === undefined) delete globalThis.self; else globalThis.self = oldSelf
        if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap
    }
})

test('Audit reports mixed texture roles and missing UV without mutating shared resources', () => {
    const texture = new THREE.Texture({ width: 16, height: 16 })
    texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false
    const material = new THREE.MeshStandardMaterial({ map: texture, roughnessMap: texture })
    const geometry = new THREE.BoxGeometry(); geometry.deleteAttribute('uv')
    const root = new THREE.Group(); root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material))
    const version = texture.version
    const result = auditMaterialMaps(root)
    assert.equal(result.materialCount, 1); assert.equal(result.materials[0].instances, 2)
    assert.ok(result.issues.some(v => v.includes('color space mismatch')))
    assert.ok(result.issues.some(v => v.includes('shared across color and data')))
    assert.ok(result.issues.some(v => v.includes('missing uv')))
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace); assert.equal(texture.version, version)
    assert.equal(material.map, material.roughnessMap)
    geometry.dispose(); material.dispose(); texture.dispose()
})
