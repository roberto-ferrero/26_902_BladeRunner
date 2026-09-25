import test from 'node:test'
import assert from 'node:assert/strict'
import Measurement from '../TyrellSustainedMeasurement.js'

test('Sustained measurements exclude warmup, include stalls and record three independent passes', () => {
    const run = new Measurement({ warmupMs: 100, durationMs: 1000, passes: 3 })
    let now = 0
    run.frame(now)
    for (let pass = 1; pass <= 3; pass++) {
        assert.equal(run.frame(now += 100), null)
        for (let i = 0; i < 30; i++) assert.equal(run.frame(now += 20), null)
        const result = run.frame(now += 400)
        assert.equal(result.pass, pass)
        assert.equal(result.elapsedMs, 1000)
        assert.equal(result.samples, 31)
        assert.equal(result.fps, 31)
        assert.equal(result.frameMaxMs, 400)
        assert.equal(result.frameP95Ms, 20)
    }
    assert.equal(run.stage, 'done')
    assert.equal(run.frame(now + 1000), null)
})
test('A hidden tab cancels the run instead of reporting hidden time as valid performance', () => {
    const run = new Measurement()
    run.frame(0); run.frame(6000)
    assert.equal(run.frame(7000, true), null)
    assert.equal(run.stage, 'cancelled')
    assert.equal(run.frame(8000), null)
})
