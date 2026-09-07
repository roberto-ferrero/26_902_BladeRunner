// Phase 2 checks: the pinned comparison frame and the model facts the audit relies on.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import * as THREE from 'three'
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
const AppRender = load(path.resolve('src/canvasApp/core/AppRender.js'), { three: THREE, './utils/GPUProfiler': class {} }).default

test('Comparison size is the 1920 x 800 the Blender references were rendered at', () => {
    assert.deepEqual(TYRELL.compareSize, { width: 1920, height: 800 })
    assert.equal(TYRELL.compareSize.width / TYRELL.compareSize.height, TYRELL.referenceAspect)
})

test('AppRender honours a project render size and leaves the canvas style to CSS', () => {
    const calls = []
    const render = Object.create(AppRender.prototype)
    render.renderer = { setSize: (...args) => calls.push(args) }
    render.app = { size: { CURRENT: { width: 1280, height: 533 } }, project: {} }
    render.update_resize()
    assert.deepEqual(calls.at(-1), [1280, 533, true])

    render.app.project.get_renderSize = () => ({ width: 1920, height: 800, updateStyle: false })
    render.update_resize()
    assert.deepEqual(calls.at(-1), [1920, 800, false])

    // A project that opts out mid-session must fall straight back to the container size.
    render.app.project.get_renderSize = () => null
    render.app.size.CURRENT = { width: 1920, height: 1200 }
    render.update_resize()
    assert.deepEqual(calls.at(-1), [1920, 1200, true])
})

test('A pinned aspect survives window changes and releases cleanly', () => {
    const app = { emitter: new EventEmitter(), size: { CURRENT: { aspect: 1.6 } } }
    const rig = new CameraRig(app)
    rig.setAspect(TYRELL.compareSize.width / TYRELL.compareSize.height)
    assert.equal(rig.camera.aspect, 2.4)
    app.size.CURRENT.aspect = 1.25
    app.emitter.emit('onAppSizeUpdate')
    assert.equal(rig.camera.aspect, 2.4)
    // The pose must be untouched by pinning; only the projection changes.
    const source = new THREE.PerspectiveCamera(27.2, 2.4, 0.03, 2500)
    source.position.set(1.9, 1.62, -7)
    source.updateMatrixWorld(true)
    rig.setSource(source)
    assert.deepEqual(rig.camera.position.toArray(), [1.9, 1.62, -7])
    assert.equal(rig.camera.aspect, 2.4)
    rig.setAspect(null)
    assert.equal(rig.camera.aspect, 1.25)
    rig.dispose()
})

test('The shipped model still holds the counts phase 2 verified', () => {
    const bytes = fs.readFileSync('static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb')
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
    const named = pattern => json.nodes.filter(node => pattern.test(node.name || ''))
    assert.equal(named(/^Columna \d+/).length, 18)
    assert.equal(named(/Relieves y celosias/).length, 11)
    const chairs = named(/^Sillon \d+/)
    assert.equal(chairs.length, 4)
    assert.equal(new Set(chairs.map(node => node.mesh)).size, 1, 'los cuatro sillones deben compartir una malla')
    assert.ok(json.nodes.some(node => node.name === 'Tyrell_Corporation_Pyramid'))
    for (const name of TYRELL.compareCameras) {
        assert.ok(json.nodes.some(node => (node.name || '').startsWith(name)), `falta ${name}`)
    }
    // Every normal-mapped material needs tangents, or WebGPU shades its stone flat.
    const normalMapped = new Set(json.materials.map((m, i) => m.normalTexture ? i : -1).filter(i => i >= 0))
    for (const mesh of json.meshes) {
        for (const primitive of mesh.primitives) {
            if (normalMapped.has(primitive.material)) {
                assert.ok(primitive.attributes.TANGENT !== undefined, `${mesh.name} usa mapa normal sin tangentes`)
            }
        }
    }
})

test('The audit report on disk matches the model it claims to describe', () => {
    const file = path.join(root, 'docs/phase2/auditoria.json')
    assert.ok(fs.existsSync(file), 'ejecuta npm run tyrell:audit antes de las pruebas')
    const report = JSON.parse(fs.readFileSync(file, 'utf8'))
    assert.equal(report.bytes, TYRELL.assetBytes)
    assert.equal(report.checks.columns.count, 18)
    assert.equal(report.checks.chairs.sharedMeshResources, 1)
    assert.equal(report.checks.tangents.missing.length, 0)
    assert.equal(report.checks.surfaces.missingNormalAttribute, 0)
    // Serialised, not just computed: a property hung off an array never reaches the file.
    assert.ok(report.checks.exterior.parallax, 'el informe debe conservar la medida de paralaje')
    assert.ok(report.checks.exterior.parallax.ndcSpreadX > 0.1, 'la pirámide debe desplazarse entre cámaras')
    assert.equal(report.checks.exterior.items.find(e => e.name === 'Tyrell_Corporation_Pyramid').flat, false)
})
