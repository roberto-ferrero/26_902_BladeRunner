import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellCameraPan.js'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
const Pan = module.exports.default
const settings = { enabled: true, horizontal: .25, vertical: .12, smoothness: .35, targetDistance: 20 }

test('Camera presets reuse the reference identity needed by reflector render targets', () => {
    const camera = new THREE.PerspectiveCamera(), pan = new Pan(camera, settings)
    const reference = pan.referenceCamera
    for (let i = 0; i < 10; i++) {
        camera.position.set(i, 1.6, 10); camera.fov = 30 + i
        pan.setReference()
        assert.equal(pan.referenceCamera, reference)
        assert.equal(reference.fov, 30 + i)
        assert.ok(reference.position.equals(camera.position))
    }
})
function setup() {
    const camera = new THREE.PerspectiveCamera(30, 2.4)
    camera.position.set(3, 1.6, 9); camera.rotation.set(.1, .6, .2)
    return { camera, pan: new Pan(camera, settings) }
}
test('Mouse pan is bounded in camera-local space, moves opposite the pointer and keeps a fixed aim', () => {
    const { camera, pan } = setup(), reference = camera.clone()
    pan.configure({ smoothness: 0 }); pan.setPointer(-4, 4); pan.update(1/60)
    const displacement = camera.position.clone().sub(reference.position)
    assert.ok(Math.abs(displacement.dot(pan.right)-.25) < 1e-10)
    assert.ok(Math.abs(displacement.dot(pan.up)-.12) < 1e-10)
    assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(pan.target.clone().sub(camera.position).normalize()) < 1e-10)
    assert.deepEqual(pan.referenceCamera.position.toArray(), reference.position.toArray())
    assert.deepEqual(pan.referenceCamera.quaternion.toArray(), reference.quaternion.toArray())
    pan.configure({ horizontal: .01, vertical: 0 }); pan.update(0)
    assert.ok(Math.abs(pan.offset.x) <= .01); assert.equal(pan.offset.y, 0)
})
test('Exponential smoothing is frame-rate independent; disable and camera change restore reference without drift', () => {
    const a = setup(), b = setup()
    a.pan.setPointer(1, -.5); b.pan.setPointer(1, -.5)
    for (let i=0; i<60; i++) a.pan.update(1/60)
    for (let i=0; i<120; i++) b.pan.update(1/120)
    assert.ok(a.camera.position.distanceTo(b.camera.position) < 1e-10)
    a.pan.configure({ enabled: false })
    assert.deepEqual(a.camera.position.toArray(), a.pan.referenceCamera.position.toArray())
    assert.deepEqual(a.camera.quaternion.toArray(), a.pan.referenceCamera.quaternion.toArray())
    a.camera.position.set(-9, 2, 1); a.camera.rotation.set(0, -.7, 0); a.pan.setReference()
    a.pan.configure({ enabled: true }); a.pan.update(1/60)
    assert.deepEqual(a.camera.position.toArray(), [-9, 2, 1])
    assert.deepEqual(a.pan.offset.toArray(), [0, 0])
})
