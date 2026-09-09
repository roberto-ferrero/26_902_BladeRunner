import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as GPU from 'three/webgpu'
import * as TSL from 'three/tsl'
import { loadGeometry } from '../scripts/audit-contacts.mjs'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellFloorReflection.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }
new Function('require', 'module', 'exports', code)(key => ({ three: THREE, 'three/webgpu': GPU, 'three/tsl': TSL })[key], m, m.exports)

test('Floor reflector shares one material, keeps maps/geometry and restores ownership on disposal', async () => {
    const scene = await loadGeometry(), before = []
    scene.traverse(o => { if (o.isMesh) before.push({ o, material: o.material, geometry: o.geometry }) })
    const reflection = new m.exports.default(scene)
    scene.updateMatrixWorld(true)
    assert.equal(reflection.materials.size, 1)
    assert.ok(reflection.meshes.length > 10)
    assert.ok(new THREE.Vector3(0, 0, 1).transformDirection(reflection.target.matrixWorld).distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-8)
    for (const { o, material, geometry } of before) {
        assert.equal(o.geometry, geometry)
        if (!o.name.startsWith('Pavimento_')) assert.equal(o.material, material)
        else {
            for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'roughness', 'metalness']) assert.equal(o.material[key], material[key])
            assert.ok(o.material.color.equals(material.color))
        }
    }
    for (let i = 0; i < 5; i++) {
        reflection.setEnabled(true)
        reflection.setMode('prototype')
        for (const material of reflection.materials.values()) assert.equal(material.emissiveNode, reflection.contribution)
        reflection.setMode('stone')
        for (const material of reflection.materials.values()) assert.equal(material.emissiveNode, reflection.stoneContribution)
        reflection.setMode('invalid'); assert.equal(reflection.mode, 'stone')
        reflection.setEnabled(false)
    }
    assert.equal(reflection.node.reflector.generateMipmaps, true)
    assert.equal(reflection.diagnostics().targets.length, 0)
    for (const material of reflection.materials.values()) assert.equal(material.emissiveNode, null)
    const material = [...reflection.materials.values()][0]; let disposed = 0
    material.addEventListener('dispose', () => disposed++)
    reflection.dispose()
    assert.equal(disposed, 1)
    for (const { o, material } of before) assert.equal(o.material, material)
})
