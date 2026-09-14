export function summarize(values) {
    if (!values.length) return null
    const sorted = [...values].sort((a,b) => a-b)
    return { samples: values.length, meanMs: values.reduce((a,b)=>a+b,0)/values.length, p95Ms: sorted[Math.floor((sorted.length-1)*.95)] }
}
export default class TyrellPerformance {
    constructor(renderer, enabled) {
        this.renderer = renderer; this.enabled = enabled; this.pending = false; this.disposed = false
        this.gpuSupported = !!renderer.backend?.trackTimestamp
        this.reset()
    }
    reset() { this.epoch = (this.epoch || 0) + 1; this.cpu = []; this.gpu = [] }
    add(list,value) { if (Number.isFinite(value) && value >= 0) { list.push(value); if(list.length>120)list.shift() } }
    frame(cpuMs, collect) {
        if (!this.enabled || this.disposed) return
        if (collect) this.add(this.cpu,cpuMs)
        if (!this.gpuSupported || this.pending) return
        this.pending = true
        const epoch = this.epoch
        this.renderer.resolveTimestampsAsync('render').then(ms => {
            if (!this.disposed && epoch === this.epoch && collect) this.add(this.gpu,ms)
        }).catch(error => { this.gpuError = error.message; this.gpuSupported = false }).finally(()=>{this.pending=false})
    }
    report() {
        return { enabled:this.enabled, cpuRender:summarize(this.cpu), gpuRender:summarize(this.gpu), gpuSupported:this.gpuSupported,
            gpuError:this.gpuError || null, heap: performance.memory ? {usedBytes:performance.memory.usedJSHeapSize,totalBytes:performance.memory.totalJSHeapSize,limitBytes:performance.memory.jsHeapSizeLimit} : null,
            note:'CPU: synchronous render submission only, not whole app CPU. GPU: timestamp sum of render passes for sampled frames, excludes compute/presentation; asynchronous samples. Heap is browser JS estimate, not VRAM.' }
    }
    dispose() { this.disposed=true; this.reset() }
}
