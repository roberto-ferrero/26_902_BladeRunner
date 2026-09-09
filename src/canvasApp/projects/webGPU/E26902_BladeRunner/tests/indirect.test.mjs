import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync('src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellIndirect.js', 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }; new Function('require', 'module', 'exports', code)(() => THREE, m, m.exports)
const Indirect = m.exports.default

test('Indirect comparison restores environment and excludes study / isolated direct light', () => {
    const scene = new THREE.Scene(), original = new THREE.Texture()
    scene.environment = original; scene.environmentIntensity = .7
    const indirect = new Indirect(scene), lighting = { fill: new THREE.HemisphereLight(), contribution: 'all' }
    for (let i = 0; i < 5; i++) {
        for (const mode of ['probe', 'environment', 'reference']) {
            lighting.fill.intensity = .86; indirect.setMode(mode); indirect.apply(lighting, false)
            assert.equal(scene.environment, mode === 'environment' ? indirect.texture : original)
            assert.equal(indirect.probe.intensity, mode === 'probe' ? .35 : 0)
            assert.equal(lighting.fill.intensity, mode === 'reference' ? .86 : .86 * .92)
            indirect.apply(lighting, true)
            assert.equal(indirect.probe.intensity, 0); assert.equal(scene.environment, original)
        }
    }
    indirect.setMode('probe'); lighting.contribution = 'sun'; lighting.fill.intensity = 0
    indirect.apply(lighting, false); assert.equal(indirect.probe.intensity, 0); assert.equal(lighting.fill.intensity, 0)
    // Irradiance must remain finite and non-negative for the six principal normals.
    for (const normal of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
        const value = indirect.probe.sh.getIrradianceAt(new THREE.Vector3(...normal), new THREE.Vector3())
        assert.ok(value.toArray().every(v => Number.isFinite(v) && v >= 0))
    }
    let disposed = 0; indirect.texture.addEventListener('dispose', () => disposed++)
    indirect.dispose(); assert.equal(scene.environment, original); assert.equal(scene.environmentIntensity, .7)
    assert.equal(scene.children.length, 0); assert.equal(disposed, 1); original.dispose()
})
