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
let measuredResult, measuredCalls = 0, frameTime = 0
new Function('require', 'module', 'exports', 'document', 'performance', code)(name => name === './TyrellQuality' ? Quality : name === 'three' ? THREE
    : name === './TyrellGPUCapacity' ? { measureGPUCapacity: async () => { measuredCalls++; return measuredResult } } : {}, m, m.exports, { hidden: false }, { now: () => frameTime += 2000 })
function fixture() {
    const app = Object.create(m.exports.default.prototype)
    Object.assign(app, { qualitySelection: 'auto', budgetMode: 'optimized', revealed: true, deviceMode: 'desktop', quality: 'Alta',
        capacityChecks: new Checks(), stageCamera: {}, changes: [],
        setQuality(quality) { this.quality = quality; this.changes.push(quality) } })
    app.gpuCapacity = { gpuScore: 132e6, reliable: true, method: 'gpu-timestamp' }
    app.capacityChecks.initial(app.gpuCapacity)
    return app
}
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

test('The initial GPU score persists through p1, visor opening and revisits without another benchmark', async () => {
    const app = fixture()
    measuredCalls = 0
    measuredResult = { gpuScore: 132e6, reliable: true, method: 'gpu-timestamp' }
    let updates = 0, portfolioFrames = 0
    Object.assign(app, { samples: [], warmup: 100,
        ui: { status() {}, loading() {}, setGPUCapacity() {}, setVKState() {}, metrics() {} },
        stageCamera: { update() {} },
        vk: { motion: { state: 'closed' }, update() { updates++ } },
        portfolio: { update() { portfolioFrames++ } },
        selectQuality(selection) { this.qualitySelection = selection }
    })
    await app.measureGPUCapacity({})
    assert.equal(measuredCalls, 1)
    for (const state of ['initial', 'p1', 'p2', 'p1']) {
        app.activeCameraStateId = state
        for (const visor of ['deploying', 'open', 'open', 'open']) {
            app.vk.motion.state = visor
            app.update_RAF()
        }
    }
    assert.equal(measuredCalls, 1)
    assert.equal(updates, 16); assert.equal(portfolioFrames, 16)
    assert.equal(app.gpuCapacity, measuredResult)
    assert.equal(app.capacityChecks.diagnostics().policy, 'startup-only')
    assert.equal(app.capacityChecks.diagnostics().secondAttempts, 0)
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
