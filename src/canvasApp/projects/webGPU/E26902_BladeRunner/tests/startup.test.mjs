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
const Startup = load('TyrellStartup').default
const { capacityResult } = load('TyrellGPUCapacity')
test('A steady 30 FPS scene qualifies, then fades for 1.5 seconds before interaction', () => {
    const startup = new Startup()
    for (let i = 0; i <= 61; i++) startup.frame(i * 1000 / 30)
    assert.equal(startup.phase, 'fading')
    assert.equal(startup.reason, 'stable')
    const now = startup.previous
    startup.frame(now + 750)
    assert.ok(startup.opacity > 0 && startup.opacity < 1)
    startup.frame(now + 1500)
    assert.equal(startup.phase, 'ready')
    assert.equal(startup.opacity, 0)
    const report = startup.diagnostics()
    startup.pause()
    assert.deepEqual(startup.diagnostics(), report)
})
test('Jitter does not qualify; the visible-time deadline eventually reveals', () => {
    const startup = new Startup()
    let now = 0
    startup.frame(now)
    while (now < 4000) { now += startup.frames % 2 ? 50 : 10; startup.frame(now) }
    assert.equal(startup.phase, 'warming')
    while (startup.phase === 'warming') { now += startup.frames % 2 ? 50 : 10; startup.frame(now) }
    assert.equal(startup.reason, 'timeout')
})
test('Hidden time is excluded and a recent long stall delays stability', () => {
    const startup = new Startup()
    for (let i = 0; i < 59; i++) startup.frame(i * 33)
    startup.frame(58 * 33 + 400)
    assert.equal(startup.phase, 'warming')
    const elapsed = startup.elapsedMs
    startup.pause(); startup.frame(90000)
    assert.equal(startup.elapsedMs, elapsed)
    assert.equal(startup.samples.length, 0)
    assert.equal(startup.phase, 'warming')
})
test('Reduced motion completes without a timed fade', () => {
    const startup = new Startup({ fadeMs: 0, maxMs: 100 })
    startup.frame(0); startup.frame(100); startup.frame(116)
    assert.equal(startup.phase, 'ready')
})
test('Periodic reflection refreshes qualify when the overall cadence is steady', () => {
    const startup = new Startup()
    let now = 0
    startup.frame(now)
    for (let i = 0; i < 120 && startup.phase === 'warming'; i++) {
        now += i % 6 === 0 ? 25 : 16.7
        startup.frame(now)
    }
    assert.equal(startup.reason, 'stable')
})
test('Capacity scores scale inversely with GPU time and retain confidence/method', () => {
    const fast = capacityResult(Array(12).fill(2), 'gpu-timestamp')
    const slow = capacityResult(Array(12).fill(4), 'gpu-timestamp')
    assert.equal(fast.gpuScore, slow.gpuScore * 2)
    assert.equal(fast.reliable, true)
    assert.equal(capacityResult([0, NaN], 'gpu-timestamp').gpuScore, null)
    assert.equal(capacityResult(Array(12).fill(2), 'queue-wall-time').reliable, false)
    assert.equal(capacityResult([1, 1, 1, 1, 1, 5, 5, 5], 'gpu-timestamp').reliable, false)
})
test('GPU benchmark failure returns unavailable without preventing startup', async () => {
    class FailedProfiler { init() { throw new Error('device lost') } dispose() { this.disposed = true } }
    const { measureGPUCapacity } = load('TyrellGPUCapacity', FailedProfiler)
    const result = await measureGPUCapacity({})
    assert.equal(result.gpuScore, null)
    assert.equal(result.reason, 'device lost')
})
