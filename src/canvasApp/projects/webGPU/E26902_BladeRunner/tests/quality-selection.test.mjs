import test from 'node:test'
import assert from 'node:assert/strict'
import { QUALITY_LEVELS, SCORE_THRESHOLDS, recommendQuality, detectDeviceMode, qualityBudget, renderPixelRatio, bloomScale } from '../TyrellQuality.js'

test('Score boundaries are inclusive and match the three supplied devices', () => {
    SCORE_THRESHOLDS.forEach((score, index) => {
        assert.equal(recommendQuality(score - 1), QUALITY_LEVELS[index])
        assert.equal(recommendQuality(score), QUALITY_LEVELS[index + 1])
        assert.equal(recommendQuality(score + 1), QUALITY_LEVELS[index + 1])
    })
    for (const [score, expected] of [[11e6, 'Extra baja'], [33.5e6, 'Baja'], [170e6, 'Alta'], [1, 'Extra baja'], [1e12, 'UltraAlta']]) {
        assert.equal(recommendQuality(score), expected)
    }
})
test('Missing or invalid score uses a device-specific fallback, never a score of zero', () => {
    for (const score of [null, undefined, 0, -1, NaN, Infinity, '11000000']) {
        assert.equal(recommendQuality(score), 'Baja')
        assert.equal(recommendQuality(score, 'mobile'), 'Extra baja')
    }
})
test('Mobile detection does not classify a touch laptop or a narrow desktop as mobile', () => {
    assert.equal(detectDeviceMode({ touchPoints: 10, coarsePointer: false }), 'desktop')
    assert.equal(detectDeviceMode({ mobileHint: true }), 'mobile')
    assert.equal(detectDeviceMode({ touchPoints: 1, coarsePointer: true }), 'mobile')
    assert.equal(detectDeviceMode(), 'desktop')
})
test('All quality levels provide independent budgets and mobile resolution stays within its pixel cap', () => {
    for (const level of QUALITY_LEVELS) {
        const desktop = qualityBudget(level), mobile = qualityBudget(level, 'optimized', 'mobile')
        for (const key of Object.keys(desktop)) assert.ok(mobile[key] > 0 && mobile[key] <= (key === 'pixelRatio' ? 1 : desktop[key]))
        for (const [width, height] of [[393, 852], [852, 393], [3840, 2160]]) {
            const ratio = renderPixelRatio(mobile, 'mobile', width, height)
            assert.ok(width * height * ratio ** 2 <= 1280 * 720 + .001)
            assert.ok(ratio <= mobile.pixelRatio)
        }
        assert.equal(renderPixelRatio(desktop, 'desktop', 3840, 2160), desktop.pixelRatio)
        mobile.volumeSteps = 999
        assert.notEqual(qualityBudget(level, 'optimized', 'mobile').volumeSteps, 999)
    }
    assert.equal(qualityBudget('toString'), null)
    assert.equal(qualityBudget('Baja', 'optimized', 'unknown'), null)
    assert.equal(bloomScale('Extra baja'), bloomScale('Baja'))
})
