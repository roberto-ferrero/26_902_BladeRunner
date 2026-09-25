import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellSpecularEnvironment.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, m, m.exports)

test('A global capture budget survives leaving p1 and coalesces repeated invalidations', () => {
    const env = new m.exports.default(new THREE.Scene(), new THREE.Group(), { materials: new Map(), updates: { invalidate() {} } })
    let captures = 0
    env.camera.update = () => { captures++ }
    env.setEnabled(true); env.setCaptureInterval(.25)
    env.update({}, 0)
    for (let i = 1; i < 25; i++) { env.invalidate(); env.update({}, i / 100) }
    assert.equal(captures, 1)
    env.update({}, .25); assert.equal(captures, 2)
    env.setDetailMode(true); assert.equal(env.minimumInterval, .5)
    env.setDetailMode(false); assert.equal(env.minimumInterval, .25)
    env.setCaptureInterval(NaN); assert.equal(env.minimumInterval, .25)
    env.setCaptureInterval(0); assert.equal(env.minimumInterval, 0)
    env.dispose()
})

test('Room environment affects only chosen materials, captures on demand and restores state after failure', () => {
    const scene = new THREE.Scene(), root = new THREE.Group(), source = new THREE.Texture()
    scene.environment = source; scene.add(root)
    const metal = new THREE.MeshStandardMaterial({ envMap: source, envMapIntensity: .7 }); metal.name = 'Bronze | patinated'
    const stone = new THREE.MeshStandardMaterial(); stone.name = 'PBR | Piedra negra pulida'
    const a = new THREE.Mesh(new THREE.BoxGeometry(), metal), b = new THREE.Mesh(a.geometry, stone)
    root.add(a, b)
    const emission = {}, floor = { materials: new Map([[stone, { emissiveNode: emission }]]), updates: { invalidate() {} } }
    const env = new m.exports.default(scene, root, floor)
    let captures = 0
    env.camera.update = () => { captures++; assert.equal(a.visible, false); assert.equal([...floor.materials.values()][0].emissiveNode, null) }
    env.setEnabled(true); assert.equal(metal.envMap, env.target.texture); assert.equal(stone.envMap, null); assert.equal(scene.environment, source)
    env.update({}); env.update({}); assert.equal(captures, 1)
    assert.equal(a.visible, true); assert.equal([...floor.materials.values()][0].emissiveNode, emission)
    env.invalidate(); env.update({}); assert.equal(captures, 2)
    env.camera.update = () => { throw new Error('capture failed') }; env.invalidate()
    assert.throws(() => env.update({}), /capture failed/)
    assert.equal(a.visible, true); assert.equal([...floor.materials.values()][0].emissiveNode, emission)
    env.dispose(); assert.equal(metal.envMap, source); assert.equal(metal.envMapIntensity, .7); assert.equal(scene.environment, source)
    a.geometry.dispose(); metal.dispose(); stone.dispose(); source.dispose()
})

test('p1 capture cadence preserves preferences, restores immediately and registers the VK explicitly', () => {
    const scene = new THREE.Scene(), root = new THREE.Group()
    const floor = { materials: new Map(), updates: { invalidate() {} } }
    const env = new m.exports.default(scene, root, floor)
    const vk = new THREE.Group(), material = new THREE.MeshStandardMaterial({ envMapIntensity: .8 })
    material.name = 'M_VKMachine.002'
    env.register(vk, new Set([material]))
    let captures = 0
    env.camera.update = () => { captures++; assert.equal(vk.visible, false) }
    env.setEnabled(true); env.setDetailMode(true)
    env.update({}, 0); env.invalidate(); env.update({}, .1)
    assert.equal(captures, 1); assert.equal(env.dirty, true)
    env.update({}, .5); assert.equal(captures, 2)
    env.setEnabled(false); env.setDetailMode(false); env.update({}, .6)
    assert.equal(captures, 2); assert.equal(material.envMap, null)
    assert.equal(material.envMapIntensity, .8)
    env.setEnabled(true); env.update({}, .61); assert.equal(captures, 3)
    env.setDetailMode(true); env.update({}, .62)
    env.setDetailMode(false); env.update({}, .63)
    assert.equal(captures, 5); assert.equal(vk.visible, true)
    env.dispose(); material.dispose()
})
