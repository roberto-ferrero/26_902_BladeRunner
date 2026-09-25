import { QUALITY_LEVELS, qualityBudget } from './TyrellQuality.js'

// Score supplies a ceiling. RAF feedback only reduces cost: VSync at 60 is not
// evidence of enough GPU headroom to raise quality. Manual/A-B/measurement modes pause it.
export default class TyrellAdaptiveQuality {
    constructor() { this.reset('Baja') }
    reset(quality, device = 'desktop') {
        this.initialQuality = this.quality = quality
        this.device = device
        this.scale = 1
        this.history = []
        this.atMinimum = false
        this.lastWindow = null
        this.pause()
    }
    pause() {
        this.previous = undefined
        this.warmup = 4000
        this.elapsed = 0
        this.samples = []
        this.slowWindows = 0
    }
    frame(now, enabled = true) {
        if (!enabled) { this.pause(); return null }
        if (this.previous === undefined) { this.previous = now; return null }
        const dt = now - this.previous
        this.previous = now
        if (!(dt > 0)) return null
        if (this.warmup > 0) { this.warmup -= dt; return null }
        this.elapsed += dt
        this.samples.push(dt)
        if (this.elapsed < 4000 || this.samples.length < 30) return null
        const fps = 1000 * this.samples.length / this.elapsed
        const sorted = this.samples.sort((a, b) => a - b)
        const medianMs = sorted[Math.floor((sorted.length - 1) * .5)]
        this.lastWindow = { fps, medianMs, p95Ms: sorted[Math.floor((sorted.length - 1) * .95)], durationMs: this.elapsed, samples: sorted.length }
        this.elapsed = 0; this.samples = []
        if (fps >= 55) this.atMinimum = false
        this.slowWindows = fps < 55 ? this.slowWindows + 1 : 0
        // A single shader stall must not count as sustained 30 FPS. The fast path
        // requires most frames to be slow, not just a slow mean from one outlier.
        const severe = fps < 40 && medianMs > 25
        if (!severe && this.slowWindows < 2) return null
        const before = { quality: this.quality, scale: this.scale }
        if (this.scale > .7501) {
            this.scale = Math.max(.75, Math.round(this.scale * Math.max(.8, Math.min(.9, Math.sqrt(fps / 60))) * 100) / 100)
        } else {
            const index = QUALITY_LEVELS.indexOf(this.quality)
            if (index === 0) { this.atMinimum = true; return null }
            const oldRatio = qualityBudget(this.quality, 'optimized', this.device).pixelRatio * this.scale
            this.quality = QUALITY_LEVELS[index - 1]
            // A lower preset must never increase pixel work across the boundary.
            this.scale = Math.max(.75, Math.min(1, oldRatio / qualityBudget(this.quality, 'optimized', this.device).pixelRatio))
        }
        const change = { atMs: now, reason: 'sustained-fps-below-55', before, quality: this.quality, scale: this.scale, ...this.lastWindow }
        this.history.push(change)
        if (this.history.length > 20) this.history.shift()
        this.pause()
        return change
    }
    diagnostics() {
        return { initialQuality: this.initialQuality, quality: this.quality, resolutionScale: this.scale,
            targetFPS: 60, lowerFPS: 55, windowMs: 4000, warmupMs: 4000, minimumScale: .75,
            atMinimum: this.atMinimum, lastWindow: this.lastWindow, history: this.history }
    }
}
