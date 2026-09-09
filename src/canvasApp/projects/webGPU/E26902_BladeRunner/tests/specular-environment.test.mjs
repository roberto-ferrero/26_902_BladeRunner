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
