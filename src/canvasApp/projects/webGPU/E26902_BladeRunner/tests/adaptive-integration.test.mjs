import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import Checks from '../TyrellCapacityChecks.js'
import * as Quality from '../TyrellQuality.js'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../E26902_BladeRunner', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }
// Exercise the real orchestration methods without constructing the GPU scene.
let measuredResult
new Function('require', 'module', 'exports', 'document', code)(name => name === './TyrellQuality' ? Quality : name === 'three' ? THREE
    : name === './TyrellGPUCapacity' ? { measureGPUCapacity: async () => measuredResult } : {}, m, m.exports, { hidden: false })
function fixture() {
    const app = Object.create(m.exports.default.prototype)
    Object.assign(app, { qualitySelection: 'auto', budgetMode: 'optimized', revealed: true, deviceMode: 'desktop', quality: 'Alta',
        capacityChecks: new Checks(), stageCamera: {}, changes: [],
        setQuality(quality) { this.quality = quality; this.changes.push(quality) } })
    app.gpuCapacity = { gpuScore: 132e6, reliable: true, method: 'gpu-timestamp' }
    app.capacityChecks.initial(app.gpuCapacity)
    return app
}
test('Second check requires settled p1 with the VK completely open', () => {
    const app = fixture()
    Object.assign(app, { activeCameraStateId: 'p1', vk: { motion: { state: 'open' } } })
    assert.equal(app.capacityCheckReady(), true)
    for (const state of ['deploying', 'retracting', 'closed']) {
        app.vk.motion.state = state; assert.equal(app.capacityCheckReady(), false)
    }
    app.vk.motion.state = 'open'; app.stageCamera.transition = {}
    assert.equal(app.capacityCheckReady(), false)
    app.stageCamera.transition = null; app.activeCameraStateId = 'p2'
    assert.equal(app.capacityCheckReady(), false)
})
test('Automatic and manual resolution now remain at the profile budget without continuous feedback', () => {
    const app = fixture()
    let ratio, resizes = 0, mirrors = 0
    app.renderer = { setPixelRatio(value) { ratio = value } }
    app.app = { size: { CURRENT: { width: 1920, height: 800 } }, render: { update_resize() { resizes++ } } }
    app.floorReflection = { resizeTargets() { mirrors++ } }
    app.updateQualityResolution(); assert.equal(ratio, Quality.qualityBudget('Alta').pixelRatio)
    app.qualitySelection = 'Alta'
    app.updateQualityResolution(); assert.equal(ratio, 1)
    assert.equal(resizes, 2); assert.equal(mirrors, 2)
})

test('Second result adjusts auto only, preserves manual and retains a valid score on failure', async () => {
    for (const [selection, result, expected] of [['auto', { gpuScore: 70e6, reliable: true }, 'Media'],
        ['Alta', { gpuScore: 70e6, reliable: true }, 'Alta'], ['auto', { gpuScore: null, reason: 'timeout' }, 'Alta']]) {
        const app = fixture(); app.qualitySelection = selection
        app.ui = { metrics() {}, setGPUCapacity() {}, setQualityState() {} }
        measuredResult = result
        await app.recheckGPUCapacity()
        assert.equal(app.quality, expected)
        assert.equal(app.capacityChecks.state, 'complete')
        assert.ok(app.gpuCapacity.gpuScore > 0)
        assert.equal(typeof app.updateAutomaticQuality, 'undefined')
    }
})

test('Real profile policy reaches both effects and UI, including mobile Alta and historical A/B', () => {
    const app = fixture()
    let bloom, floor, ui
    app.post = { setBloomAllowed(value) { bloom = value }, bloomActive() { return bloom } }
    app.floorReflection = { setQualityAllowed(value) { floor = value; this.enabled = value } }
    app.ui = { setQualityEffects(allowed, active) { ui = { allowed, active } } }
    for (const [quality, deviceMode, budgetMode, expected] of [
        ['Alta', 'desktop', 'optimized', true], ['Baja', 'desktop', 'optimized', false],
        ['Extra baja', 'desktop', 'optimized', false], ['Alta', 'mobile', 'optimized', false],
        ['Baja', 'desktop', 'previous', true], ['Alta', 'desktop', 'optimized', true]
    ]) {
        Object.assign(app, { quality, deviceMode, budgetMode }); app.syncQualityEffects()
        assert.equal(bloom, expected); assert.equal(floor, expected)
        assert.equal(ui.active.bloom, expected); assert.equal(ui.allowed.floorReflection, expected)
    }
})
