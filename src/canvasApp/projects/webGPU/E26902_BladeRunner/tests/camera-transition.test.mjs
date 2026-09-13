import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellCameraRig.js'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
new Function('require', 'module', 'exports', code)((id) => id === 'three' ? THREE : { TYRELL: { referenceAspect: 2.4 } }, module, module.exports)
const Rig = module.exports.default
function setup() {
    const app = { size: { CURRENT: { aspect: 2.4 } }, emitter: { on() {}, off() {} } }
    const rig = new Rig(app)
    const target = new THREE.PerspectiveCamera(40, 2.4, .1, 1500)
    target.position.set(4, 2, -8); target.rotation.y = 1
    return { app, rig, target }
}
test('Transition preserves initial pose and camera identity, reaches exact target and interpolates lens', () => {
    const { rig, target } = setup(), camera = rig.camera, start = camera.clone()
    rig.setSource(target, 1)
    assert.ok(camera.position.equals(start.position))
    for (let i = 0; i < 5; i++) rig.update(.1)
    assert.ok(camera.position.distanceTo(start.position.clone().lerp(target.position, .5)) < 1e-8)
    assert.equal(camera.fov, 31.5)
    for (let i = 0; i < 6; i++) rig.update(.1)
    assert.equal(rig.camera, camera); assert.equal(rig.transition, null)
    assert.ok(camera.position.equals(target.position)); assert.ok(camera.quaternion.angleTo(target.quaternion) < 1e-7)
})
test('Rapid camera changes start from current interpolated pose and resize survives completion', () => {
    const { rig, target, app } = setup()
    rig.setSource(target, 1); rig.update(.1)
    const current = rig.camera.position.clone()
    target.position.set(-4, 5, 2); rig.setSource(target, .5)
    assert.ok(rig.camera.position.equals(current))
    app.size.CURRENT.aspect = 1.3; rig.resize()
    for (let i = 0; i < 6; i++) rig.update(.1)
    assert.equal(rig.camera.aspect, 1.3); assert.ok(rig.camera.position.equals(target.position))
})
test('World transforms ignore Blender display scale; instant changes and cancellation are stable', () => {
    const { rig, target } = setup()
    const parent = new THREE.Group(); parent.position.x = 10; parent.add(target); target.scale.setScalar(.01)
    rig.setSource(target, 0)
    assert.equal(rig.camera.position.x, 14); assert.deepEqual(rig.camera.scale.toArray(), [1,1,1])
    target.position.x = 20; rig.setSource(target, 1); rig.update(.1); rig.cancelTransition()
    const pose = rig.camera.position.clone(); assert.equal(rig.update(1), false); assert.ok(rig.camera.position.equals(pose))
})
