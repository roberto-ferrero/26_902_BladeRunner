import test from 'node:test'
import assert from 'node:assert/strict'
import { qualityBudget, qualityEffects, QUALITY_LEVELS, bloomScale } from '../TyrellQuality.js'
test('Alta starts with the former startup budget measured near 58 FPS; historical reference stays available', () => {
    assert.deepEqual(qualityBudget('Alta'), qualityBudget('Baja', 'baseline'))
    assert.equal(bloomScale('Alta'), .25)
    assert.equal(bloomScale('Alta', 'baseline'), .5)
    assert.deepEqual(qualityBudget('Alta', 'baseline'), { pixelRatio: 1.5, shadowSize: 2048, volumeSteps: 64, reflectionScale: .75 })
})
test('A/B modes isolate one budget and preserve reference shadows', () => {
    for (const name of ['Media', 'Alta']) {
        const base = qualityBudget(name, 'baseline'), optimized = qualityBudget(name)
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
    assert.equal(qualityBudget('Media').pixelRatio, .625)
})

test('Five profiles have nondecreasing costs in desktop and mobile modes', () => {
    for (const device of ['desktop', 'mobile']) for (let i = 1; i < QUALITY_LEVELS.length; i++) {
        const lower = qualityBudget(QUALITY_LEVELS[i - 1], 'optimized', device)
        const upper = qualityBudget(QUALITY_LEVELS[i], 'optimized', device)
        for (const key of Object.keys(lower)) assert.ok(lower[key] <= upper[key], `${device} ${key}`)
        assert.ok(lower.pixelRatio < upper.pixelRatio)
    }
})

test('Low tiers and every mobile tier trade bloom and planar reflections for resolution; R03 remains comparable', () => {
    for (const device of ['desktop', 'mobile']) for (const level of QUALITY_LEVELS) {
        const trade = device === 'mobile' || ['Extra baja', 'Baja'].includes(level)
        assert.equal(qualityEffects(level, 'optimized', device).bloom, !trade)
        assert.equal(qualityEffects(level, 'optimized', device).floorReflection, !trade)
        assert.equal(qualityEffects(level, 'previous', device).bloom, true)
        const old = qualityBudget(level, 'previous', device), current = qualityBudget(level, 'optimized', device)
        if (trade && level !== 'UltraAlta') assert.ok(current.pixelRatio > old.pixelRatio)
        else assert.equal(current.pixelRatio, old.pixelRatio)
        assert.equal(current.shadowSize, old.shadowSize)
        assert.equal(current.volumeSteps, old.volumeSteps)
    }
    assert.equal(qualityBudget('Baja', 'previous').pixelRatio, .5)
    assert.equal(qualityBudget('Extra baja', 'previous').pixelRatio, .4)
    assert.equal(bloomScale('Alta', 'previous'), .25)
})
