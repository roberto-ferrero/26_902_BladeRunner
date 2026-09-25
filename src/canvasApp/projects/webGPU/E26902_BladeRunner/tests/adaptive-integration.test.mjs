import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import Adaptive from '../TyrellAdaptiveQuality.js'
import * as Quality from '../TyrellQuality.js'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../E26902_BladeRunner', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }
// Exercise the real orchestration methods without constructing the GPU scene.
new Function('require', 'module', 'exports', 'document', code)(name => name === './TyrellQuality' ? Quality : name === 'three' ? THREE : {}, m, m.exports, { hidden: false })
function fixture() {
    const app = Object.create(m.exports.default.prototype)
    Object.assign(app, { qualitySelection: 'auto', budgetMode: 'optimized', revealed: true, deviceMode: 'desktop', quality: 'Alta',
        adaptiveQuality: new Adaptive(), stageCamera: {}, changes: [],
        setQuality(quality) { this.quality = quality; this.changes.push(quality) } })
    app.adaptiveQuality.reset('Alta')
    return app
}
test('Real automatic updater is suspended for manual, comparisons, measurements and transitions', () => {
    for (const setting of [{ qualitySelection: 'Alta' }, { budgetMode: 'baseline' }, { sustainedMeasurement: {} },
        { measuring: true }, { colorBenchmark: {} }, { stageCamera: { transition: {} } }, { revealed: false }, { rendererError: {} }]) {
        const app = Object.assign(fixture(), setting)
        for (let now = 0; now <= 60000; now += 100) app.updateAutomaticQuality(now)
        assert.equal(app.changes.length, 0, JSON.stringify(setting))
        assert.equal(app.adaptiveQuality.scale, 1)
    }
    const app = fixture()
    for (let now = 0; now <= 20000; now += 100 / 3) app.updateAutomaticQuality(now)
    assert.ok(app.changes.length > 0)
})
test('Actual resolution applies feedback only in automatic optimized mode and resizes reflection targets', () => {
    const app = fixture(); app.adaptiveQuality.scale = .8
    let ratio, resizes = 0, mirrors = 0
    app.renderer = { setPixelRatio(value) { ratio = value } }
    app.app = { size: { CURRENT: { width: 1920, height: 800 } }, render: { update_resize() { resizes++ } } }
    app.floorReflection = { resizeTargets() { mirrors++ } }
    app.updateQualityResolution(); assert.ok(Math.abs(ratio - .6) < 1e-9)
    app.qualitySelection = 'Alta'
    app.updateQualityResolution(); assert.equal(ratio, .75)
    assert.equal(resizes, 2); assert.equal(mirrors, 2)
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
