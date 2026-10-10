import test from 'node:test'
import assert from 'node:assert/strict'
import Checks from '../TyrellCapacityChecks.js'

test('Diagnostics retain the initial score with no second measurement scheduled', () => {
    const checks = new Checks()
    assert.equal(checks.diagnostics().state, 'pending')
    const initial = { gpuScore: 132e6, reliable: true }
    checks.initial(initial)
    assert.deepEqual(checks.diagnostics(), { policy: 'startup-only', state: 'complete',
        secondAttempts: 0, source: 'initial', initial, second: null })
})

test('A failed startup measurement remains unavailable rather than inventing a replacement score', () => {
    const checks = new Checks()
    checks.initial({ gpuScore: null, reason: 'timeout' })
    assert.equal(checks.diagnostics().state, 'complete')
    assert.equal(checks.diagnostics().initial.gpuScore, null)
    assert.equal(checks.diagnostics().secondAttempts, 0)
})