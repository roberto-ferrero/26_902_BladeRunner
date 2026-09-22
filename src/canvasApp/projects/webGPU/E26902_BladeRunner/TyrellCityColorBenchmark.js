import { summarize } from './TyrellPerformance'

// ABBA order limits drift. Geometry, camera and animation state stay fixed;
// a synthetic yaw sweep exercises the colour update without changing coverage.
export default class TyrellCityColorBenchmark {
    constructor(city, renderer, status, done) {
        this.city = city; this.renderer = renderer; this.status = status; this.done = done
        this.savedMode = city.colorSettings.mode
        this.order = ['off', 'on', 'on', 'off']; this.stage = 0; this.frame = 0
        this.samples = { off: { frame: [], cpu: [], color: [], gpu: [] }, on: { frame: [], cpu: [], color: [], gpu: [] } }
        this.gpuSupported = !!renderer.backend?.trackTimestamp
        this.pending = false; this.yaw = 0
        this.applyStage()
    }
    applyStage() {
        this.city.colorSettings.mode = this.order[this.stage]
        this.frame = 0; this.previous = undefined
        this.status(`Midiendo ${this.stage + 1}/4: orientación ${this.order[this.stage] === 'on' ? 'activa' : 'desactivada'}…`)
    }
    beforeFrame() {
        this.yaw = Math.sin((this.frame % 120) / 120 * Math.PI * 2) * Math.max(...Object.values(this.city.anchorYaw).map(Math.abs))
    }
    afterFrame(cpu, colorCPU, now) {
        const collect = this.frame >= 45, stage = this.stage, mode = this.order[stage]
        const samples = this.samples[mode]
        if (collect && this.previous !== undefined) {
            samples.frame.push(now - this.previous); samples.cpu.push(cpu); samples.color.push(colorCPU)
        }
        if (collect && this.gpuSupported && !this.pending) {
            this.pending = true
            this.renderer.resolveTimestampsAsync('render').then(ms => {
                if (!this.finished && stage === this.stage && Number.isFinite(ms)) samples.gpu.push(ms)
            }).catch(() => { this.gpuSupported = false }).finally(() => { this.pending = false })
        }
        this.previous = now
        if (++this.frame < 165) return
        if (++this.stage < this.order.length) { this.applyStage(); return }
        const rows = Object.fromEntries(Object.entries(this.samples).map(([key, data]) =>
            [key, Object.fromEntries(Object.entries(data).map(([metric, list]) => [metric, summarize(list)]))]))
        this.result = { order: this.order, warmupFramesPerStage: 45, measuredFramesPerStage: 120,
            ...rows, gpuSupported: this.gpuSupported,
            delta: Object.fromEntries(['frame', 'cpu', 'color', 'gpu'].map(key => [key,
                rows.on[key] && rows.off[key] ? rows.on[key].meanMs - rows.off[key].meanMs : null])),
            note: 'ABBA, fixed camera and frozen animation; synthetic yaw sweep, same shader and spatial ramps, reflection refreshed in BOTH modes to match a moving camera. GPU render-pass timestamps only; RAF can be capped by vsync. Colour CPU is included in render CPU.' }
        this.finish()
    }
    finish(reason) {
        if (this.finished) return
        this.finished = true
        this.city.colorSettings.mode = this.savedMode
        if (reason) this.status(`Medición cancelada: ${reason}`)
        this.done(reason ? null : this.result)
    }
}
