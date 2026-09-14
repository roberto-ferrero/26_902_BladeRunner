import test from 'node:test'
import assert from 'node:assert/strict'
import { qualityBudget, BUDGET_MODES } from '../TyrellQuality.js'
test('Baja retains the accepted budget in every comparison mode', () => {
    for (const mode of BUDGET_MODES) assert.deepEqual(qualityBudget('Baja', mode), qualityBudget('Baja', 'baseline'))
})
test('A/B modes isolate one budget and preserve shadows', () => {
    for (const name of ['Media', 'Alta']) {
        const base = qualityBudget(name, 'baseline'), optimized = qualityBudget(name)
        assert.equal(optimized.shadowSize, base.shadowSize)
        for (const [mode, key] of [['resolution', 'pixelRatio'], ['volume', 'volumeSteps'], ['reflection', 'reflectionScale']]) {
            assert.deepEqual(qualityBudget(name, mode), { ...base, [key]: optimized[key] })
            assert.ok(optimized[key] < base[key])
        }
    }
})
test('Invalid selection is rejected and returned budgets are independent', () => {
    assert.equal(qualityBudget('unknown'), null)
    assert.equal(qualityBudget('Media', 'unknown'), null)
    qualityBudget('Media').pixelRatio = 100
    assert.equal(qualityBudget('Media').pixelRatio, .9)
})
