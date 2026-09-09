import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as TSL from 'three/tsl'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellLightVolume.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }
new Function('require', 'module', 'exports', code)(key => key === 'three' ? THREE : TSL, m, m.exports)

test('Volume waits for solar depth, freezes dust, follows light replacement and never owns shadow resources', () => {
    let sun = new THREE.DirectionalLight(0xffd093, 2.5)
    const volume = new m.exports.default(() => sun)
    volume.configure({ enabled: true })
    assert.equal(volume.update(1), false)
    assert.equal(volume.node, null)
    const depth = new THREE.DepthTexture(16, 16)
    sun.shadow.map = { depthTexture: depth }
    assert.equal(volume.update(1), true)
    assert.equal(volume.clock.value, 0.05)
    assert.equal(volume.update(0.01), false)
    assert.equal(volume.update(0.04), true)
    const frozenTime = volume.clock.value
    const node = volume.node
    volume.configure({ speed: 0 }); volume.update(1)
    assert.equal(volume.clock.value, frozenTime)
    volume.configure({ dust: false, speed: 1 })
    assert.equal(volume.update(1), false)
    volume.setQuality('Alta'); assert.equal(volume.steps.value, 64)
    const next = new THREE.DirectionalLight(0xffffff, 0)
    next.shadow.map = { depthTexture: depth }; sun = next
    volume.update(0)
    assert.equal(volume.radiance.value.r, 0)
    assert.equal(volume.node, node)
    volume.configure({ enabled: false })
    assert.equal(volume.strength.value, 0)
    assert.equal(volume.update(1), false)
    let disposed = false
    depth.addEventListener('dispose', () => { disposed = true })
    volume.dispose(); assert.equal(disposed, false)
    depth.dispose()
})
