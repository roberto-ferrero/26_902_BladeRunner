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

export async function measureGPUCapacity(renderer, cancelled = () => false) {
    const profiler = new GPUProfiler({ renderer, ringSize: 2 })
    let expired = false, timer
    const run = async () => {
        try {
            profiler.init()
            const device = profiler.device
            const method = profiler.supported ? 'gpu-timestamp' : 'queue-wall-time'
            const times = [], start = performance.now()
            if (!profiler.supported) profiler.bench = profiler.createBenchPipeline(CAPACITY_WORKLOAD.workgroupSize)
            for (let i = 0; i < 15 && !expired && !cancelled(); i++) {
                if (document.hidden) return { ...capacityResult([], method), reason: 'hidden-tab' }
                let ms
                if (profiler.supported) ms = await profiler.benchmarkCompute(CAPACITY_WORKLOAD) / 1e6
                else {
                    const { pipeline, bindGroup, paramsBuffer } = profiler.bench
                    device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([CAPACITY_WORKLOAD.iterations]))
                    const encoder = device.createCommandEncoder()
                    const pass = encoder.beginComputePass()
                    pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup)
                    pass.dispatchWorkgroups(CAPACITY_WORKLOAD.workgroups); pass.end()
                    const before = performance.now()
                    device.queue.submit([encoder.finish()])
                    await device.queue.onSubmittedWorkDone()
                    ms = performance.now() - before
                }
                if (document.hidden) return { ...capacityResult([], method), reason: 'hidden-tab' }
                if (i >= 3) times.push(ms)
                if (performance.now() - start > 1500) break
            }
            return capacityResult(times, method)
        } catch (error) {
            return { ...capacityResult([], 'unavailable'), reason: error.message }
        } finally { profiler.dispose() }
    }
    // Do not destroy in-flight readback buffers on timeout; run() owns cleanup.
    try {
        return await Promise.race([run(), new Promise(resolve => {
            timer = setTimeout(() => { expired = true; resolve({ ...capacityResult([], 'unavailable'), reason: 'timeout' }) }, 4000)
        })])
    } finally { clearTimeout(timer) }
}
