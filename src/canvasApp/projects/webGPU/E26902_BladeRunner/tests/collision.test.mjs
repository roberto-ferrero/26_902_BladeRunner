import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellCollision.js'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
const Collision = module.exports.default
const { loadGeometry } = await import('../scripts/audit-contacts.mjs')
const world = await loadGeometry(), collision = new Collision(world)
test('Real scene blocks table, chair, columns and walls while keeping main aisle open', () => {
    assert.ok(collision.free(0, 5))
    for (const [x,z] of [[0,-10], [1.413,-8.472], [-.236,-11.72], [3,0], [-9,-5], [10,0], [0,-15], [6,-5]]) assert.equal(collision.free(x,z), false, `${x},${z}`)
    assert.ok(collision.free(.15, -8.5), 'Former front-chair position is now clear')
})
test('Long and diagonal movement cannot tunnel into furniture and slides along it', () => {
    const p = new THREE.Vector3(1,1.65,-7)
    collision.move(p,new THREE.Vector3(0,0,-10),1.65)
    assert.ok(p.z > -9); assert.ok(collision.free(p.x,p.z))
    const x = p.x; collision.move(p,new THREE.Vector3(.5,0,-1),1.65)
    assert.ok(p.x > x); assert.ok(collision.free(p.x,p.z)); assert.equal(p.y,1.65)
})
test('Every authored camera enters at a valid standing position, including wall presets', () => {
    world.traverse(o => {
        if (!o.isCamera) return
        const p = o.getWorldPosition(new THREE.Vector3())
        collision.settle(p,1.65)
        assert.ok(collision.free(p.x,p.z),o.name); assert.equal(p.y,1.65)
    })
})
