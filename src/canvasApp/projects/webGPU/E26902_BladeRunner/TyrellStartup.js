// Visible RAF time only: background tabs must neither qualify nor consume the timeout.
export default class TyrellStartup {
    constructor({ minMs = 1500, maxMs = 12000, fadeMs = 1500 } = {}) {
        Object.assign(this, { minMs, maxMs, fadeMs })
        this.phase = 'warming'
        this.elapsedMs = 0
        this.fadeElapsedMs = 0
        this.frames = 0
        this.samples = []
        this.opacity = 1
    }
    pause() {
        if (this.phase === 'ready') return
        this.previous = undefined
        if (this.phase === 'warming') this.samples = []
    }
    frame(now) {
        if (this.phase === 'ready') return
        const delta = this.previous === undefined ? 0 : Math.max(0, now - this.previous)
        this.previous = now
        if (this.phase === 'fading') {
            this.fadeElapsedMs += delta
            const t = this.fadeMs === 0 ? 1 : Math.min(1, this.fadeElapsedMs / this.fadeMs)
            this.opacity = 1 - t * t * (3 - 2 * t)
            if (t === 1) this.phase = 'ready'
            return
        }
        this.elapsedMs += delta
        if (delta > 0) { this.frames++; this.samples.push(delta) }
        if (this.samples.length > 60) this.samples.shift()
        let stable = false
        if (this.samples.length === 60 && this.elapsedMs >= this.minMs) {
            const mean = list => list.reduce((a, b) => a + b, 0) / list.length
            const sorted = [...this.samples].sort((a, b) => a - b)
            const recent = mean(this.samples.slice(30)), previous = mean(this.samples.slice(0, 30))
            this.frameStats = { meanMs: mean(sorted), medianMs: sorted[29], p95Ms: sorted[56], maxMs: sorted[59] }
            // Periodic reflection/probe refreshes are normal; reject warmup stalls,
            // not the steady cadence of the complete scene's render passes.
            stable = Math.abs(recent - previous) / previous <= .1 && sorted[56] / sorted[29] <= 1.6 && sorted[59] / sorted[29] <= 2
        }
        if (stable || this.elapsedMs >= this.maxMs) {
            if (this.samples.length) {
                const sorted = [...this.samples].sort((a, b) => a - b)
                this.frameStats = { samples: sorted.length, meanMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
                    medianMs: sorted[Math.floor((sorted.length - 1) / 2)], p95Ms: sorted[Math.floor((sorted.length - 1) * .95)], maxMs: sorted.at(-1) }
            }
            this.reason = stable ? 'stable' : 'timeout'
            this.phase = 'fading'
        }
    }
    diagnostics() {
        return { phase: this.phase, reason: this.reason || null, warmupMs: this.elapsedMs,
            fadeMs: this.fadeMs, maxWaitMs: this.maxMs, frames: this.frames, frameStats: this.frameStats || null }
    }
}
