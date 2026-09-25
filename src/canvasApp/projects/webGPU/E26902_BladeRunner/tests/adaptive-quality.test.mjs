import test from 'node:test'
import assert from 'node:assert/strict'
import Adaptive from '../TyrellAdaptiveQuality.js'
import { recommendQuality, qualityBudget } from '../TyrellQuality.js'

function simulation(run) {
    let now = 0
    run.frame(now)
    return (seconds, fps = 60, enabled = true) => {
        const changes = []
        for (let i = 0; i < Math.round(seconds * fps); i++) {
            const result = run.frame(now += 1000 / fps, enabled)
            if (result) changes.push(result)
        }
        return changes
    }
}
test('132 million starts at Alta and sustained 30 FPS reduces resolution then LOD', () => {
    const run = new Adaptive(); run.reset(recommendQuality(132e6))
    const step = simulation(run)
    assert.equal(step(4, 30).length, 0) // warmup
    const changes = step(70, 30)
    assert.ok(changes.length >= 3)
    assert.equal(changes[0].quality, 'Alta')
    assert.equal(changes[0].scale, .8)
    assert.notEqual(run.quality, 'Alta')
    let previousCost = qualityBudget('Alta').pixelRatio
    for (const change of changes) {
        const cost = qualityBudget(change.quality).pixelRatio * change.scale
        assert.ok(cost <= previousCost + 1e-9)
        assert.ok(change.scale >= .75 && change.scale <= 1)
        previousCost = cost
    }
})
test('60 FPS and a brief hitch keep quality; no oscillation or automatic upgrades', () => {
    const run = new Adaptive(); run.reset('Alta')
    const step = simulation(run)
    assert.equal(step(30, 60).length, 0)
    assert.equal(step(1, 30).length, 0)
    assert.equal(step(20, 60).length, 0)
    step(30, 30)
    const quality = run.quality, scale = run.scale
    assert.equal(step(120, 60).length, 0)
    assert.equal(run.quality, quality); assert.equal(run.scale, scale)
})
test('Moderate sustained overload requires two windows and recompilation has a warmup', () => {
    const run = new Adaptive(); run.reset('Alta')
    const step = simulation(run)
    assert.equal(step(9, 50).length, 0)
    const changes = step(5, 50)
    assert.equal(changes.length, 1)
    assert.equal(changes[0].scale, .9)
    assert.equal(step(2, 10).length, 0)
})
test('Suspended/manual/hidden/measurement time cannot degrade quality and resumption warms up', () => {
    const run = new Adaptive(); run.reset('Alta')
    const step = simulation(run)
    assert.equal(step(180, 10, false).length, 0)
    assert.equal(run.scale, 1)
    assert.equal(step(4, 10).length, 0)
    assert.ok(step(5, 10).length > 0)
    run.reset('Baja', 'mobile')
    assert.equal(run.history.length, 0); assert.equal(run.scale, 1); assert.equal(run.device, 'mobile')
})
test('The lowest profile has a bounded floor and reports unmet performance without endless changes', () => {
    const run = new Adaptive(); run.reset('Extra baja', 'mobile')
    const step = simulation(run)
    step(120, 10)
    assert.equal(run.quality, 'Extra baja'); assert.equal(run.scale, .75)
    assert.equal(run.atMinimum, true)
    assert.equal(step(120, 10).length, 0)
    assert.equal(run.history.length, 2)
    step(10, 60)
    assert.equal(run.atMinimum, false)
})

test('One multi-second compilation stall cannot trigger the fast path', () => {
    const run = new Adaptive(); run.reset('Alta')
    run.frame(0); run.frame(4000)
    let now = 4000
    assert.equal(run.frame(now += 5000), null)
    for (let i = 0; i < 700; i++) assert.equal(run.frame(now += 1000 / 60), null)
    assert.equal(run.scale, 1); assert.equal(run.history.length, 0)
})
