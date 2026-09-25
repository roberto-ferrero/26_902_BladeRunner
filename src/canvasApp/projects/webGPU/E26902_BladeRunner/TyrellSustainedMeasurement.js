// Full RAF windows; do not silently discard slow frames or hidden time.
export default class TyrellSustainedMeasurement {
    constructor({ warmupMs = 5000, durationMs = 60000, passes = 3 } = {}) {
        Object.assign(this, { warmupMs, durationMs, passes })
        this.index = 1
        this.stage = 'warming'
        this.elapsed = 0
        this.samples = []
    }
    frame(now, hidden = false) {
        if (this.stage === 'done' || this.stage === 'cancelled') return null
        if (hidden) { this.stage = 'cancelled'; return null }
        if (this.previous === undefined) { this.previous = now; return null }
        const dt = now - this.previous
        this.previous = now
        if (!(dt > 0)) return null
        this.elapsed += dt
        if (this.stage === 'warming') {
            if (this.elapsed >= this.warmupMs) { this.stage = 'measuring'; this.elapsed = 0 }
            return null
        }
        this.samples.push(dt)
        if (this.elapsed < this.durationMs) return null
        const sorted = [...this.samples].sort((a, b) => a - b)
        const mean = this.elapsed / sorted.length
        const result = { pass: this.index, passes: this.passes, elapsedMs: this.elapsed, warmupMs: this.warmupMs,
            fps: 1000 / mean, frameMeanMs: mean, frameP95Ms: sorted[Math.floor((sorted.length - 1) * .95)],
            frameMaxMs: sorted.at(-1), samples: sorted.length }
        this.index++
        this.stage = this.index > this.passes ? 'done' : 'warming'
        this.elapsed = 0; this.samples = []
        return result
    }
    status() {
        return this.stage === 'done' ? 'Tres pasadas guardadas.'
            : `Pasada ${this.index}/${this.passes} · ${this.stage === 'warming' ? 'Calentamiento' : 'Midiendo'}: ${Math.floor(this.elapsed / 1000)} s`
    }
}
