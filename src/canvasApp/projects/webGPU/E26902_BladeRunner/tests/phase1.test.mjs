// Focused integration checks, using the exact project sources and installed Three.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
const require = createRequire(import.meta.url)
const babel = require('@babel/core')
const root = path.resolve('src/canvasApp/projects/webGPU/E26902_BladeRunner')
function load(file, imports = {}) {
    const result = babel.transformSync(fs.readFileSync(file, 'utf8'), {
        filename: file, configFile: false, babelrc: false,
        plugins: ['@babel/plugin-transform-modules-commonjs']
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', result.code)(key => {
        if (!(key in imports)) throw new Error('Unexpected import: ' + key)
        return imports[key]
    }, module, module.exports)
    return module.exports
}
const { TYRELL } = load(path.join(root, 'config.js'))
const CameraRig = load(path.join(root, 'TyrellCameraRig.js'), { three: THREE, './config': { TYRELL } }).default
const { loadTyrell, disposeScene } = load(path.join(root, 'TyrellAssets.js'), { 'three/addons/loaders/GLTFLoader.js': { GLTFLoader } })
const AppRender = load(path.resolve('src/canvasApp/core/AppRender.js'), { three: THREE, './utils/GPUProfiler': class {} }).default

test('Perspective camera preserves world pose/FOV and removes Blender display scale across resize', () => {
    const app = { emitter: new EventEmitter(), size: { CURRENT: { aspect: 2.4 } } }
    const rig = new CameraRig(app)
    const parent = new THREE.Group()
    parent.position.set(5, 2, -4)
    parent.rotation.y = 0.3
    const camera = new THREE.PerspectiveCamera(22.9175052948, 2.4, 0.03, 2500)
    camera.position.set(-0.12, 1.55, 10.3); camera.scale.setScalar(0.01)
    parent.add(camera); parent.updateMatrixWorld(true)
    rig.setSource(camera)
    assert.ok(rig.camera.position.distanceTo(camera.getWorldPosition(new THREE.Vector3())) < 1e-8)
    assert.ok(rig.camera.quaternion.angleTo(camera.getWorldQuaternion(new THREE.Quaternion())) < 1e-7)
    assert.equal(rig.camera.fov, camera.fov)
    assert.deepEqual(rig.camera.scale.toArray(), [1, 1, 1])
    app.size.CURRENT.aspect = 16 / 9; app.emitter.emit('onAppSizeUpdate')
    assert.equal(rig.camera.aspect, 16 / 9)
    assert.equal(rig.camera.fov, camera.fov)
    rig.dispose()
    assert.equal(app.emitter.listenerCount('onAppSizeUpdate'), 0)
})
test('GLB loader reports HTTP errors, invalid HTML responses and cancellation', async () => {
    const original = globalThis.fetch
    try {
        globalThis.fetch = async () => new Response('', { status: 404 })
        await assert.rejects(loadTyrell('http://localhost/missing.glb', new AbortController().signal, () => {}), /HTTP 404/)
        globalThis.fetch = async () => new Response('<html>webpack fallback</html>')
        await assert.rejects(loadTyrell('http://localhost/invalid.glb', new AbortController().signal, () => {}), /GLB válido/)
        const controller = new AbortController(); controller.abort()
        await assert.rejects(loadTyrell('http://localhost/cancel.glb', controller.signal, () => {}), { name: 'AbortError' })
    } finally { globalThis.fetch = original }
})
test('GLB parsing retains full scene, cameras, metadata and byte progress', async () => {
    const json = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0], extras: { provenance: 'test' } }], nodes: [{ name: 'camera', camera: 0, translation: [1, 2, 3] }], cameras: [{ type: 'perspective', perspective: { yfov: 0.4, znear: 0.03, zfar: 2500, aspectRatio: 2.4 } }] })
    const padded = Buffer.from(json.padEnd(Math.ceil(json.length / 4) * 4))
    const bytes = Buffer.alloc(20 + padded.length)
    bytes.writeUInt32LE(0x46546c67, 0); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8)
    bytes.writeUInt32LE(padded.length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); padded.copy(bytes, 20)
    const original = globalThis.fetch
    try {
        globalThis.fetch = async () => new Response(bytes, { headers: { 'content-length': String(bytes.length) } })
        const progress = []
        const result = await loadTyrell('http://localhost/test.glb', new AbortController().signal, (...entry) => progress.push(entry))
        assert.equal(result.bytes, bytes.length)
        assert.equal(result.gltf.cameras.length, 1)
        assert.equal(result.gltf.scene.userData.provenance, 'test')
        assert.deepEqual(result.gltf.scene.children[0].position.toArray(), [1, 2, 3])
        assert.deepEqual(progress.at(-1), [bytes.length, bytes.length, true])
    } finally { globalThis.fetch = original }
})
test('Shared materials, geometry, textures and ImageBitmaps dispose once', () => {
    const root = new THREE.Group(), geometry = new THREE.BoxGeometry()
    const texture = new THREE.Texture()
    let imageClosed = 0, texturesDisposed = 0, materialsDisposed = 0, geometriesDisposed = 0
    texture.source.data = { close: () => imageClosed++ }
    const material = new THREE.MeshStandardMaterial({ map: texture, roughnessMap: texture })
    texture.addEventListener('dispose', () => texturesDisposed++)
    material.addEventListener('dispose', () => materialsDisposed++)
    geometry.addEventListener('dispose', () => geometriesDisposed++)
    root.add(...Array.from({ length: 4 }, () => new THREE.Mesh(geometry, material)))
    disposeScene(root)
    assert.deepEqual([imageClosed, texturesDisposed, materialsDisposed, geometriesDisposed], [1, 1, 1, 1])
})
test('Required WebGPU reports failure and removes fallback canvas; legacy projects retain fallback', () => {
    for (const required of [true, false]) {
        const render = Object.create(AppRender.prototype)
        let disposed = 0, removed = 0, fallback = 0, reported = 0
        render.policy = { requireWebGPU: required }
        render.app = { TYPE: 'WEBGPU_APP', emitter: new EventEmitter(), project: { onRendererError: () => reported++ } }
        render.renderer = { initialized: true, dispose: () => disposed++, domElement: { remove: () => removed++ } }
        render._init_webglRenderer = () => fallback++
        const log = console.error; console.error = () => {}
        try { render._rendererFailed(new Error('No adapter')) } finally { console.error = log }
        assert.deepEqual([disposed, removed, fallback, reported], [1, 1, required ? 0 : 1, required ? 1 : 0])
        assert.equal(render.app.TYPE, required ? 'WEBGPU_APP' : 'WEBGL_APP')
    }
})
test('Model copy matches the authored export and retains all cameras/resources', async () => {
    const crypto = await import('node:crypto')
    const bytes = fs.readFileSync('static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb')
    assert.equal(bytes.length, TYRELL.assetBytes)
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), '21f28ad9297badf397d457879b12e3858c2fbe8ab9e3ad926a60afee09a1fbb3')
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)))
    assert.equal(json.cameras.length, 10)
    assert.equal(json.images.length, 25)
    assert.equal(json.meshes.length, 117)
})
