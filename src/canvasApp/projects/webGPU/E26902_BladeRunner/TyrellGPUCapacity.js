import GPUProfiler from '../../../core/utils/GPUProfiler'

// Version the workload so future LOD thresholds never mix incompatible scores.
export const CAPACITY_WORKLOAD = { version: 'tyrell-compute-v1', workgroups: 4096, workgroupSize: 64, iterations: 1024 }
export function capacityResult(samples, method) {
    const times = samples.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
    if (!times.length) return { ...CAPACITY_WORKLOAD, gpuScore: null, method, reliable: false, samples: 0 }
    const medianMs = times[Math.floor((times.length - 1) / 2)]
    const p90Ms = times[Math.floor((times.length - 1) * .9)]
    const spread = (p90Ms - times[0]) / medianMs
    return { ...CAPACITY_WORKLOAD, gpuScore: CAPACITY_WORKLOAD.workgroups * CAPACITY_WORKLOAD.workgroupSize * CAPACITY_WORKLOAD.iterations / medianMs,
        method, samples: times.length, medianMs, p90Ms, minMs: times[0], variability: spread,
        reliable: method === 'gpu-timestamp' && times.length >= 8 && spread <= .25,
        units: 'shader iterations/ms; higher is faster',
        note: 'Synthetic integer compute throughput, not FPS or a geometry LOD threshold. Compare identical versions and timing methods only.' }
}

export async function measureGPUCapacity(renderer, cancelled = () => false, { timeoutMs = 10000, warmupRuns = 3, sampleRuns = 12 } = {}) {
    const profiler = new GPUProfiler({ renderer, ringSize: 2 })
    let expired = false, timer, best = capacityResult([], 'unavailable'), fallbackReason
    const interrupted = () => cancelled() ? 'cancelled' : typeof document !== 'undefined' && document.hidden ? 'hidden-tab' : null
    const finish = reason => ({ ...best, ...(reason ? { reason } : {}), ...(fallbackReason ? { fallbackReason } : {}) })
    const run = async () => {
        try {
            try { profiler.init() }
            catch (error) {
                if (!profiler.device) throw error
                profiler.supported = false; fallbackReason = error.message
            }
            const device = profiler.device
            if (!device) throw new Error('GPUDevice no disponible')
            const methods = profiler.supported ? ['gpu-timestamp', 'queue-wall-time'] : ['queue-wall-time']
            for (const method of methods) {
                const times = []
                try {
                    if (method === 'queue-wall-time') {
                        profiler.bench ||= profiler.createBenchPipeline(CAPACITY_WORKLOAD.workgroupSize)
                        // Do not include previously submitted scene work in the fallback timer.
                        await device.queue.onSubmittedWorkDone()
                    }
                    // Pipeline preparation/warmup no longer consume a 1.5 s sample window.
                    for (let i = 0; i < warmupRuns + sampleRuns; i++) {
                        const stop = interrupted()
                        if (stop) return { ...capacityResult([], method), reason: stop }
                        if (expired) return finish('timeout')
                        let ms
                        if (method === 'gpu-timestamp') ms = await profiler.benchmarkCompute(CAPACITY_WORKLOAD) / 1e6
                        else {
                            const { pipeline, bindGroup, paramsBuffer } = profiler.bench
                            device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([CAPACITY_WORKLOAD.iterations]))
                            const encoder = device.createCommandEncoder(), pass = encoder.beginComputePass()
                            pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup)
                            pass.dispatchWorkgroups(CAPACITY_WORKLOAD.workgroups); pass.end()
                            const before = performance.now()
                            device.queue.submit([encoder.finish()])
                            await device.queue.onSubmittedWorkDone()
                            ms = performance.now() - before
                        }
                        const stopAfter = interrupted()
                        if (stopAfter) return { ...capacityResult([], method), reason: stopAfter }
                        if (expired) return finish('timeout')
                        if (i >= warmupRuns && Number.isFinite(ms) && ms > 0) {
                            times.push(ms)
                            best = capacityResult(times, method)
                        }
                    }
                    if (times.length) return finish()
                    fallbackReason = `${method}: no valid samples`
                } catch (error) {
                    if (times.length) return finish(error.message)
                    fallbackReason = error.message
                }
            }
            return finish(fallbackReason || 'no-valid-samples')
        } catch (error) { return finish(error.message) }
        finally { profiler.dispose() }
    }
    // Timeout preserves completed samples; cleanup waits for outstanding GPU reads.
    try {
        return await Promise.race([run(), new Promise(resolve => {
            timer = setTimeout(() => {
                expired = true
                const stop = interrupted()
                resolve(stop ? { ...capacityResult([], 'unavailable'), reason: stop } : finish('timeout'))
            }, timeoutMs)
        })])
    } finally { clearTimeout(timer) }
}
