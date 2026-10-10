export const PORTFOLIO_DEFAULTS = Object.freeze({
    enabled: true, opacity: .95, density: .65, segmentLength: 7, dustSpeed: .65,
    fadeAbove: 280, fadeBelow: 280, blend: 'normal', entryDuration: 1.5
})
const clamp = value => Math.max(0, Math.min(1, value))
export const easeOut = value => 1 - (1 - clamp(value)) ** 3
export function portfolioEligible({ revealed, cameraState, transitioning, exploring, visorState }) {
    return !!revealed && cameraState === 'p1' && !transitioning && !exploring && visorState === 'open'
}
export function activeCardIndices(bounds, center) {
    if (!bounds.length) return []
    // Distance to the rectangle, not its midpoint: very tall expanded cards remain current.
    let index = 0, distance = Infinity
    bounds.forEach((rect, i) => {
        const next = Math.max(rect.top - center, center - rect.bottom, 0)
        if (next < distance) { distance = next; index = i }
    })
    return [index - 1, index, index + 1].filter(i => i >= 0 && i < bounds.length)
}
export function cardBeamOpacity(rect, height, above, below) {
    const distance = rect.bottom < 0 ? -rect.bottom : rect.top > height ? rect.top - height : 0
    const range = rect.bottom < 0 ? above : below
    if (distance === 0) return 1
    const t = clamp(distance / Math.max(1, range))
    return 1 - t * t * (3 - 2 * t)
}
export function rectCorners(rect, left = 0, top = 0) {
    return [[rect.left - left, rect.top - top], [rect.right - left, rect.top - top],
        [rect.right - left, rect.bottom - top], [rect.left - left, rect.bottom - top]]
}
export function projectToViewport(ndc, rect) {
    return { x: rect.left + (ndc.x + 1) * rect.width / 2,
        y: rect.top + (1 - ndc.y) * rect.height / 2, visible: ndc.z >= -1 && ndc.z <= 1 }
}
// Stable samples in space; only their intensity changes with time, never a travelling dash.
export function dustSamples(seed, count = 110) {
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    return Array.from({ length: count }, (_, i) => ({ u: (i + random()) / count,
        phase: random() * Math.PI * 2, frequency: .6 + random() * 1.4,
        length: .2 + random() * .8, strength: .3 + random() * .7 }))
}
