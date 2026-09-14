// 8.1 remains available for reproducible comparisons in the technical GUI.
export const BUDGET_MODES = ['optimized', 'baseline', 'resolution', 'volume', 'reflection']
const baseline = {
    Baja: { pixelRatio: .75, shadowSize: 1024, volumeSteps: 24, reflectionScale: .25 },
    Media: { pixelRatio: 1, shadowSize: 2048, volumeSteps: 40, reflectionScale: .5 },
    Alta: { pixelRatio: 1.5, shadowSize: 2048, volumeSteps: 64, reflectionScale: .75 }
}
const adjustments = {
    Baja: {},
    Media: { pixelRatio: .9, volumeSteps: 32, reflectionScale: .35 },
    Alta: { pixelRatio: 1, volumeSteps: 48, reflectionScale: .5 }
}
export function qualityBudget(quality, mode = 'optimized') {
    if (!baseline[quality] || !BUDGET_MODES.includes(mode)) return null
    const result = { ...baseline[quality] }, changes = adjustments[quality]
    for (const [key, value] of Object.entries(changes)) {
        if (mode === 'optimized' || mode === { pixelRatio: 'resolution', volumeSteps: 'volume', reflectionScale: 'reflection' }[key]) result[key] = value
    }
    return result
}
