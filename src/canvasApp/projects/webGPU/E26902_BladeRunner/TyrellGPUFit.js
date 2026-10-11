// Behind the loader: fits the render resolution to what this GPU draws within budget,
// and reports whether the GPU has caught up, so the fade never starts on a backlog.
// Render cost here is proportional to rendered pixels (GTX 1650, moving camera:
// 11.1 / 14.8 / 20.3 ms at 1.67 / 2.15 / 2.97 MP), so one correction usually fits.
export const GPU_FIT = { targetMs: 12.5, tolerance: 1.08, growBelow: .8, minRatio: .5, rounds: 4, settleFrames: 8, samples: 18, maxFrames: 150, caughtUpMs: 40 }

// Below 1 shrinks the rendered pixels; above 1 (only after a shrink overshot) gives some back.
export function fitPixelScale(gpuMs, settings = GPU_FIT, shrunk = false) {
    if (gpuMs > settings.targetMs * settings.tolerance) return settings.targetMs / gpuMs
    if (shrunk && gpuMs < settings.targetMs * settings.growBelow) return settings.targetMs * .95 / gpuMs
    return 1
}

export default class TyrellGPUFit {
    constructor(renderer, settings = GPU_FIT) {
        this.renderer = renderer
        this.backend = renderer.backend
        this.settings = settings
        this.timestamps = !!this.backend?.hasFeature?.('timestamp-query')
        this.latencies = []
        this.times = []
        this.rounds = 0
        this.frames = 0
        this.fitting = false
        this.history = []
    }
    begin() {
        this.previousTracking = this.backend.trackTimestamp
        if (this.timestamps) this.backend.trackTimestamp = true
        this.fitting = true
        this.restart()
    }
    restart() { this.frames = 0; this.times = [] }
    end() {
        if (this.timestamps) this.backend.trackTimestamp = this.previousTracking
        this.fitting = false
    }
    // Once per frame, after everything the frame draws has been submitted.
    frame() {
        this.frames++
        const queue = this.backend?.device?.queue
        if (queue && !this.waiting) {
            this.waiting = true
            const start = performance.now()
            queue.onSubmittedWorkDone().then(() => {
                this.latencies.push(performance.now() - start)
                if (this.latencies.length > 20) this.latencies.shift()
            }).finally(() => { this.waiting = false })
        }
        if (this.fitting && this.timestamps && this.frames > this.settings.settleFrames && !this.resolving) {
            this.resolving = true
            this.renderer.resolveTimestampsAsync('render').then(ms => {
                if (ms > 0 && this.fitting) this.times.push(ms)
            }).catch(() => { this.timestamps = false }).finally(() => { this.resolving = false })
        }
    }
    // The last ten probed frames each finished on the GPU within about two frame intervals.
    get caughtUp() {
        if (!this.backend?.device) return true
        return this.latencies.length >= 10 && this.latencies.slice(-10).every(ms => ms < this.settings.caughtUpMs)
    }
    gpuMs() {
        if (this.times.length < this.settings.samples) return null
        const sorted = [...this.times].sort((a, b) => a - b)
        return sorted[Math.floor(sorted.length * .75)]
    }
    // null: keep measuring; 1: done; otherwise scale the rendered pixels by it and measure again.
    decide() {
        const { settings } = this, gpu = this.gpuMs()
        if (gpu === null && this.frames < settings.maxFrames) return null
        if (this.rounds >= settings.rounds) return 1
        // Without timestamps, a GPU that cannot keep up still shows as a growing backlog.
        let scale = gpu === null ? (this.caughtUp ? 1 : .7) : fitPixelScale(gpu, settings, this.history.some(step => step.scale < 1))
        // Never end on an unmeasured increase.
        if (scale > 1 && this.rounds >= settings.rounds - 1) scale = 1
        this.history.push({ gpuMs: gpu, caughtUp: this.caughtUp, scale })
        if (scale !== 1) this.rounds++
        return scale
    }
    diagnostics() {
        return { timestamps: this.timestamps, rounds: this.rounds, history: this.history, caughtUp: this.caughtUp,
            latencyMs: this.latencies.slice(-5).map(ms => +ms.toFixed(1)), settings: this.settings }
    }
}
