import test from 'node:test'
import assert from 'node:assert/strict'
import Checks from '../TyrellCapacityChecks.js'

test('p1 check happens once, after uninterrupted settling; revisits never rearm it', () => {
    const checks = new Checks()
    checks.initial({ gpuScore: 132e6, reliable: true })
    assert.equal(checks.beginIfReady(0, true), false)
    assert.equal(checks.beginIfReady(900, false), false)
    assert.equal(checks.beginIfReady(1000, true), false)
    assert.equal(checks.beginIfReady(1999, true), false)
    assert.equal(checks.beginIfReady(2000, true), true)
    assert.equal(checks.beginIfReady(4000, true), false)
    checks.complete({ gpuScore: 150e6, reliable: true })
    for (let now = 5000; now < 100000; now += 1000) {
        checks.beginIfReady(now, false)
        assert.equal(checks.beginIfReady(now + 500, true), false)
    }
    assert.equal(checks.attempts, 1)
    assert.equal(checks.effective.gpuScore, 150e6)
})
test('A failed or less reliable second measurement cannot replace a trustworthy score', () => {
    for (const second of [{ gpuScore: null }, { gpuScore: NaN }, { gpuScore: 1e6, method: 'queue-wall-time', reliable: false }]) {
        const checks = new Checks(), first = { gpuScore: 132e6, reliable: true }
        checks.initial(first)
        assert.equal(checks.complete(second), first)
        assert.equal(checks.source, 'initial')
    }
    const checks = new Checks()
    checks.initial({ gpuScore: null })
    checks.complete({ gpuScore: 33e6, reliable: false, method: 'queue-wall-time' })
    assert.equal(checks.effective.gpuScore, 33e6)
})
