import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellNavigation.js'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
const Navigation = module.exports.default
function setup() {
    globalThis.window = new EventTarget()
    globalThis.document = new EventTarget()
    const canvas = new EventTarget()
    canvas.requestPointerLock = () => { document.pointerLockElement = canvas }
    document.exitPointerLock = () => { document.pointerLockElement = null }
    const camera = new THREE.PerspectiveCamera()
    const nav = new Navigation(camera, canvas, () => {})
    nav.speed = 2; nav.setEnabled(true); document.pointerLockElement = canvas
    return { nav, camera }
}
test('Free movement is time based and diagonal speed is normalized', () => {
    const { nav, camera } = setup()
    nav.keys.add('KeyW'); nav.keys.add('KeyD')
    for (let i = 0; i < 60; i++) nav.update(1/60)
    assert.ok(Math.abs(camera.position.length() - 2) < 1e-8)
    assert.ok(camera.position.x > 0 && camera.position.z < 0)
    nav.dispose()
})
test('Pause clears held keys and prevents movement, disabling preserves view', () => {
    const { nav, camera } = setup()
    nav.keys.add('KeyW'); nav.pause(); nav.update(.1)
    assert.equal(nav.keys.size, 0); assert.equal(camera.position.length(), 0)
    camera.position.set(1, 2, 3); nav.setEnabled(false); nav.update(.1)
    assert.deepEqual(camera.position.toArray(), [1, 2, 3]); nav.dispose()
})
test('Movement respects heading without drifting height; long frames are clamped', () => {
    const { nav, camera } = setup()
    camera.rotation.set(.7, Math.PI/2, 0, 'YXZ'); nav.keys.add('KeyW'); nav.update(10)
    assert.ok(Math.abs(camera.position.x + .2) < 1e-8); assert.equal(camera.position.y, 0)
    nav.dispose()
})

test('Pointer lock rejection enables drag fallback; Escape pauses and cleanup removes listeners', () => {
    const { nav, camera } = setup()
    document.pointerLockElement = null
    document.dispatchEvent(new Event('pointerlockerror'))
    assert.equal(nav.locked, true)
    nav.keys.add('KeyW'); nav.update(.1)
    assert.ok(camera.position.z < 0)
    const escape = new Event('keydown'); Object.defineProperty(escape, 'key', { value: 'Escape' })
    window.dispatchEvent(escape); assert.equal(nav.locked, false); assert.equal(nav.keys.size, 0)
    nav.dispose(); document.dispatchEvent(new Event('pointerlockerror')); assert.equal(nav.locked, false)
})
