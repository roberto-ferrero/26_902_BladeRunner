import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { code } = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellGPUCapacity.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
})
function benchmark(Profiler, clock = performance) {
    const module = { exports: {} }
    new Function('require', 'module', 'exports', 'performance', code)(() => Profiler, module, module.exports, clock)
    return module.exports.measureGPUCapacity
}

test('Slow preparation does not consume the measurement window', async () => {
    let elapsed = 0, calls = 0, disposed = false
    class Profiler {
        init() { this.device = {}; this.supported = true }
        async benchmarkCompute() { elapsed += ++calls === 1 ? 2000 : 2; return 2e6 }
        dispose() { disposed = true }
    }
    const result = await benchmark(Profiler, { now: () => elapsed })({})
    assert.equal(calls, 15)
    assert.equal(result.samples, 12)
    assert.equal(result.reliable, true)
    assert.ok(result.gpuScore > 0)
    assert.equal(disposed, true)
})

test('Broken or empty timestamps fall back to the same workload timed through the queue', async () => {
    for (const failure of ['init', 'read', 'zero']) {
        let elapsed = 0, dispatches = 0, disposed = false
        class Profiler {
            init() {
                this.device = {
                    queue: { onSubmittedWorkDone: async () => {}, writeBuffer() {}, submit() {} },
                    createCommandEncoder: () => ({ finish() {}, beginComputePass: () => ({
                        setPipeline() {}, setBindGroup() {}, end() {},
                        dispatchWorkgroups(count) { assert.equal(count, 4096); dispatches++ }
                    }) })
                }
                this.supported = true
                if (failure === 'init') throw new Error('timestamp init failed')
            }
            async benchmarkCompute() { if (failure === 'read') throw new Error('read failed'); return 0 }
            createBenchPipeline(size) { assert.equal(size, 64); return {} }
            dispose() { disposed = true }
        }
        const result = await benchmark(Profiler, { now: () => elapsed += 2 })({})
        assert.equal(result.method, 'queue-wall-time')
        assert.equal(result.samples, 12)
        assert.equal(result.reliable, false)
        assert.ok(result.gpuScore > 0)
        assert.ok(result.fallbackReason)
        assert.equal(dispatches, 15)
        assert.equal(disposed, true)
    }
})

test('Watchdog retains valid partial samples and defers cleanup until outstanding reads settle', async () => {
    let calls = 0, disposed = false, release
    const pending = new Promise(resolve => { release = resolve })
    class Profiler {
        init() { this.device = {}; this.supported = true }
        async benchmarkCompute() { return ++calls < 6 ? 2e6 : pending }
        dispose() { disposed = true }
    }
    const result = await benchmark(Profiler)({}, () => false, { timeoutMs: 20 })
    assert.equal(result.reason, 'timeout')
    assert.equal(result.samples, 2)
    assert.ok(result.gpuScore > 0)
    assert.equal(result.reliable, false)
    assert.equal(disposed, false)
    release(2e6)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(disposed, true)
    assert.equal(calls, 6)
})

test('Leaving the eligible view invalidates a result even after some valid samples', async () => {
    let calls = 0, disposed = false
    class Profiler {
        init() { this.device = {}; this.supported = true }
        async benchmarkCompute() { calls++; return 2e6 }
        dispose() { disposed = true }
    }
    const result = await benchmark(Profiler)({}, () => calls >= 6)
    assert.equal(result.reason, 'cancelled')
    assert.equal(result.gpuScore, null)
    assert.equal(disposed, true)
})
