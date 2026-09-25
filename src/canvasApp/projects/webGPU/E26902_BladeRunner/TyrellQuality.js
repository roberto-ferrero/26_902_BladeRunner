// Score thresholds are initial calibration, not an FPS guarantee.
export const QUALITY_LEVELS = Object.freeze(['Extra baja', 'Baja', 'Media', 'Alta', 'UltraAlta'])
export const SCORE_THRESHOLDS = Object.freeze([25e6, 60e6, 120e6, 240e6])
export const DEVICE_MODES = Object.freeze(['auto', 'desktop', 'mobile'])
export function recommendQuality(score, device = 'desktop') {
    if (!Number.isFinite(score) || score <= 0) return device === 'mobile' ? 'Extra baja' : 'Baja'
    const index = SCORE_THRESHOLDS.findIndex(limit => score < limit)
    return QUALITY_LEVELS[index < 0 ? 4 : index]
}
export function detectDeviceMode({ mobileHint = false, coarsePointer = false, touchPoints = 0 } = {}) {
    return mobileHint || coarsePointer && touchPoints > 0 ? 'mobile' : 'desktop'
}
// 8.1 budgets for the original three levels remain available for A/B comparisons.
export const BUDGET_MODES = ['optimized', 'previous', 'baseline', 'resolution', 'volume', 'reflection']
const baseline = {
    'Extra baja': { pixelRatio: .5, shadowSize: 512, volumeSteps: 12, reflectionScale: .125 },
    Baja: { pixelRatio: .75, shadowSize: 1024, volumeSteps: 24, reflectionScale: .25 },
    Media: { pixelRatio: 1, shadowSize: 2048, volumeSteps: 40, reflectionScale: .5 },
    Alta: { pixelRatio: 1.5, shadowSize: 2048, volumeSteps: 64, reflectionScale: .75 },
    UltraAlta: { pixelRatio: 1.5, shadowSize: 2048, volumeSteps: 64, reflectionScale: .75 }
}
const previousAdjustments = {
    'Extra baja': { pixelRatio: .4, volumeSteps: 8 },
    Baja: { pixelRatio: .5, shadowSize: 512, volumeSteps: 12, reflectionScale: .125 },
    Media: { pixelRatio: .625, shadowSize: 1024, volumeSteps: 16, reflectionScale: .2 },
    // R02: the former startup budget measured 57.7–58.6 FPS, versus ~33 for old Alta.
    Alta: { pixelRatio: .75, shadowSize: 1024, volumeSteps: 24, reflectionScale: .25 },
    UltraAlta: { pixelRatio: 1, volumeSteps: 48, reflectionScale: .5 }
}
const adjustments = { ...previousAdjustments,
    'Extra baja': { ...previousAdjustments['Extra baja'], pixelRatio: .5 },
    Baja: { ...previousAdjustments.Baja, pixelRatio: .6 }
}
// R04 trades the planar mirror and global bloom for more pixels. Keep R03 for A/B.
export function qualityEffects(quality, mode = 'optimized', device = 'desktop') {
    const resolutionFirst = mode === 'optimized' && (device === 'mobile' || ['Extra baja', 'Baja'].includes(quality))
    return { bloom: !resolutionFirst, floorReflection: !resolutionFirst, resolutionFirst }
}
export function qualityBudget(quality, mode = 'optimized', device = 'desktop') {
    if (!QUALITY_LEVELS.includes(quality) || !BUDGET_MODES.includes(mode) || !['desktop', 'mobile'].includes(device)) return null
    const result = { ...baseline[quality] }, changes = (mode === 'previous' ? previousAdjustments : adjustments)[quality]
    for (const [key, value] of Object.entries(changes)) {
        if (mode === 'optimized' || mode === 'previous' || mode === { pixelRatio: 'resolution', volumeSteps: 'volume', reflectionScale: 'reflection' }[key]) result[key] = value
    }
    if (device === 'mobile') {
        const index = QUALITY_LEVELS.indexOf(quality)
        result.pixelRatio = mode === 'optimized' ? [.5, .6, .75, .9, 1][index] : Math.min(result.pixelRatio, [.5, .6, .75, .9, 1][index])
        result.shadowSize = Math.min(result.shadowSize, 1024)
        result.volumeSteps = Math.min(result.volumeSteps, [8, 12, 16, 24, 32][index])
        result.reflectionScale = Math.min(result.reflectionScale, [.125, .125, .2, .25, .35][index])
    }
    return result
}
export function bloomScale(quality, mode = 'optimized') {
    return (['optimized', 'previous'].includes(mode) ? quality !== 'UltraAlta' : ['Extra baja', 'Baja'].includes(quality)) ? .25 : .5
}
// Absolute ratio to CSS pixels: never multiply this by the device's native DPR.
export function renderPixelRatio(profile, device, width, height) {
    if (device !== 'mobile' || !(width > 0 && height > 0)) return profile.pixelRatio
    return Math.min(profile.pixelRatio, Math.sqrt(1280 * 720 / (width * height)))
}
