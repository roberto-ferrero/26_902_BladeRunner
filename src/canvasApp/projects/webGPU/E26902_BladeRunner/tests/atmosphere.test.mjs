import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as TSL from 'three/tsl'
import NodeMaterialObserver from 'three/src/materials/nodes/manager/NodeMaterialObserver.js'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellAtmosphere.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }
new Function('require', 'module', 'exports', code)(key => key === 'three' ? THREE : TSL, m, m.exports)

test('Atmosphere independently controls layers, excludes authored sky and restores scene/material state', () => {
    const scene = new THREE.Scene(), root = new THREE.Group(), previous = TSL.vec4(1)
    scene.fogNode = previous
    const sky = new THREE.Mesh(), floor = new THREE.Mesh()
    sky.name = 'Cielo'; root.add(sky, floor)
    const atmosphere = new m.exports.default(scene, root)
    assert.equal(scene.fogNode, previous)
    assert.equal(sky.material.fog, false)
    assert.equal(floor.material.fog, true)
    assert.equal(floor.material.colorNode, TSL.materialColor)
    assert.equal(new NodeMaterialObserver({ material: floor.material, object: floor, context: {} }).hasNode, true)
    atmosphere.configure({ exterior: true })
    assert.equal(scene.fogNode, atmosphere.node)
    assert.equal(atmosphere.exterior.value, 0.00025)
    assert.equal(atmosphere.interior.value, 0)
    atmosphere.configure({ interior: true, exterior: false, interiorStrength: 100 })
    assert.equal(atmosphere.exterior.value, 0)
    assert.equal(atmosphere.interior.value, 0.003)
    atmosphere.configure({ interiorStrength: NaN })
    assert.equal(atmosphere.interior.value, 0.003)
    atmosphere.configure({ interior: false })
    assert.equal(scene.fogNode, previous)
    atmosphere.configure({ exterior: true })
    atmosphere.dispose()
    assert.equal(scene.fogNode, previous)
    assert.equal(sky.material.fog, true)
    assert.equal(floor.material.colorNode, undefined)
    sky.geometry.dispose(); sky.material.dispose(); floor.geometry.dispose(); floor.material.dispose()
})

test('Volumetric comparison restores depth-only and original fog without creating graphs on repeated toggles', () => {
    const scene = new THREE.Scene(), root = new THREE.Group(), original = TSL.vec4(1)
    scene.fogNode = original
    const volume = { settings: { enabled: false }, node: TSL.vec4(0.1) }
    const atmosphere = new m.exports.default(scene, root, volume)
    atmosphere.configure({ interior: true })
    const base = scene.fogNode
    volume.settings.enabled = true; atmosphere.refreshVolume()
    const withVolume = scene.fogNode
    assert.notEqual(withVolume, base)
    for (let i = 0; i < 5; i++) {
        volume.settings.enabled = false; atmosphere.refreshVolume(); assert.equal(scene.fogNode, withVolume)
        volume.settings.enabled = true; atmosphere.refreshVolume(); assert.equal(scene.fogNode, withVolume)
    }
    atmosphere.configure({ interior: false })
    assert.equal(scene.fogNode, withVolume)
    volume.settings.enabled = false; atmosphere.refreshVolume()
    assert.equal(scene.fogNode, original)
    atmosphere.dispose()
})
