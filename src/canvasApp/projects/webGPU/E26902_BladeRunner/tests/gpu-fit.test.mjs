import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
function load(name, dependency = {}) {
    const filename = `src/canvasApp/projects/webGPU/E26902_BladeRunner/${name}.js`
    const { code } = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(() => dependency, module, module.exports)
    return module.exports
}
const { default: Fit, GPU_FIT, fitPixelScale } = load('TyrellGPUFit')
const Startup = load('TyrellStartup').default

function renderer({ timestamps = true } = {}) {
    const done = []
    return { done, backend: { trackTimestamp: false, hasFeature: name => timestamps && name === 'timestamp-query',
        device: { queue: { onSubmittedWorkDone: () => new Promise(resolve => done.push(resolve)) } } },
        resolveTimestampsAsync: async () => renderer.gpuMs }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('Over-budget GPU time shrinks the rendered pixels in proportion; within budget nothing changes', () => {
    assert.equal(fitPixelScale(GPU_FIT.targetMs), 1)
    assert.equal(fitPixelScale(GPU_FIT.targetMs * GPU_FIT.tolerance * .99), 1)
    assert.ok(Math.abs(fitPixelScale(20) - GPU_FIT.targetMs / 20) < 1e-12)
    // Only an overshooting shrink gives pixels back, never the first measurement.
    assert.equal(fitPixelScale(8), 1)
    assert.ok(fitPixelScale(8, GPU_FIT, true) > 1)
})

test('Timestamps decide after the settle frames; tracking is restored afterwards', async () => {
    const r = renderer()
    const fit = new Fit(r)
    fit.begin()
    assert.equal(r.backend.trackTimestamp, true)
    renderer.gpuMs = 20
    for (let i = 0; i < GPU_FIT.settleFrames + GPU_FIT.samples + 2 && fit.decide() === null; i++) { fit.frame(); await flush(); r.done.splice(0).forEach(resolve => resolve()); await flush() }
    const scale = fit.history.at(-1).scale
    assert.ok(Math.abs(scale - GPU_FIT.targetMs / 20) < 1e-9)
    fit.restart(); renderer.gpuMs = 12
    let decision = null
    for (let i = 0; i < 80 && decision === null; i++) { fit.frame(); await flush(); r.done.splice(0).forEach(resolve => resolve()); await flush(); decision = fit.decide() }
    assert.equal(decision, 1)
    fit.end()
    assert.equal(r.backend.trackTimestamp, false)
    assert.equal(fit.fitting, false)
})

test('Without timestamps a growing GPU backlog still shrinks the resolution, an idle GPU does not', async () => {
    const r = renderer({ timestamps: false })
    const fit = new Fit(r)
    fit.begin()
    // The GPU never finishes: no completed probe, so it has not caught up.
    for (let i = 0; i < GPU_FIT.maxFrames; i++) fit.frame()
    assert.equal(fit.caughtUp, false)
    assert.equal(fit.decide(), .7)
    const idle = renderer({ timestamps: false }), quick = new Fit(idle)
    quick.begin()
    for (let i = 0; i < GPU_FIT.maxFrames; i++) { quick.frame(); await flush(); idle.done.splice(0).forEach(resolve => resolve()); await flush() }
    assert.equal(quick.caughtUp, true)
    assert.equal(quick.decide(), 1)
})

test('A steady cadence does not start the fade while the GPU runs behind', () => {
    const startup = new Startup()
    for (let i = 0; i <= 120; i++) startup.frame(i * 1000 / 60, false)
    assert.equal(startup.phase, 'warming')
    for (let i = 121; i <= 200 && startup.phase === 'warming'; i++) startup.frame(i * 1000 / 60, true)
    assert.equal(startup.reason, 'stable')
})
