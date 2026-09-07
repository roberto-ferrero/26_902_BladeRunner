// GPUProfiler.js
// Practical WebGPU GPU-time profiler + micro-benchmark (compute).
// Designed to be used alongside three.js WebGPURenderer, but it only needs a GPUDevice.
//
// References:
// - WebGPU timestamp query concept and usage (querySet + resolveQuerySet + map): https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html :contentReference[oaicite:2]{index=2}
// - resolveQuerySet: MDN :contentReference[oaicite:3]{index=3}

class GPUProfiler {
    /**
     * @param {object} opts
     * @param {import('three').WebGPURenderer=} opts.renderer - optional, used only to try to discover the device automatically.
     * @param {GPUDevice=} opts.device - recommended: pass the device explicitly.
     * @param {number=} opts.ringSize - number of readback buffers to rotate (reduces stalls). Default 4.
     * @param {number=} opts.warmupRuns - default 3.
    */
   constructor({ renderer = undefined, device = undefined, ringSize = 4, warmupRuns = 3 } = {}) {
        console.log("(GPUProfiler.CONSTRUCTOR)!");
        this.renderer = renderer;
        this.device = device ?? this.tryGetDeviceFromRenderer(renderer);

        this.ringSize = Math.max(2, ringSize | 0);
        this.warmupRuns = Math.max(0, warmupRuns | 0);

        this.supported = false;

        // timestamp query objects
        this.querySet = null;
        this.resolveBuffer = null;
        this.resultRing = [];
        this.ringIndex = 0;

        // benchmark pipeline state
        this.bench = null;

        // rolling stats
        this.lastNs = 0;
        this.samplesNs = [];
        this.maxSamples = 120;
  }

  /**
   * Call once after you have a device.
   */
  init() {
    if (!this.device && this.renderer) {
      this.device = this.tryGetDeviceFromRenderer(this.renderer);
    }

    if (!this.device) {
      throw new Error(
        "GPUProfiler: no GPUDevice available. Pass { device } explicitly, or provide a WebGPURenderer and call after renderer.init()."
      );
    }

    this.supported = this.device.features?.has?.("timestamp-query") === true;
    if (!this.supported) return false;

    // 2 timestamps (begin/end)
    this.querySet = this.device.createQuerySet({ type: "timestamp", count: 2 });

    // resolved timestamps live here (QUERY_RESOLVE + COPY_SRC)
    this.resolveBuffer = this.device.createBuffer({
      size: this.querySet.count * 8,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });

    // ring of MAP_READ buffers (COPY_DST + MAP_READ)
    this.resultRing = Array.from({ length: this.ringSize }, () =>
      this.device.createBuffer({
        size: this.resolveBuffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      })
    );

    return true;
  }

  /**
   * Run a timed compute pass and return GPU duration in nanoseconds.
   * This is the primitive you can build on to time your own compute work.
   *
   * @param {object} opts
   * @param {number} opts.workgroups - dispatchWorkgroups(workgroups)
   * @param {number} opts.iterations - inner loop iterations per thread (bigger = more work)
   * @param {number=} opts.workgroupSize - threads per workgroup (must match shader). Default 256.
   * @returns {Promise<number>} gpu duration in nanoseconds (0 if unsupported)
   */
  async benchmarkCompute({ workgroups, iterations, workgroupSize = 256 }) {
    if (!this.supported) return 0;

    // lazy-create benchmark pipeline for this workgroupSize
    if (!this.bench || this.bench.workgroupSize !== workgroupSize) {
      this.bench = this.createBenchPipeline(workgroupSize);
    }

    const device = this.device;
    const encoder = device.createCommandEncoder();

    // Rotate buffers to avoid mapping a buffer we need to write into.
    const resultBuffer = this.resultRing[this.ringIndex];
    this.ringIndex = (this.ringIndex + 1) % this.resultRing.length;

    // If this buffer is still mapped (rare, but possible), skip this run to avoid stalling hard.
    if (resultBuffer.mapState !== "unmapped") {
      return this.lastNs;
    }

    // Update uniform params
    const params = new Uint32Array([iterations >>> 0]);
    device.queue.writeBuffer(this.bench.paramsBuffer, 0, params);

    const pass = encoder.beginComputePass({
      timestampWrites: {
        querySet: this.querySet,
        beginningOfPassWriteIndex: 0,
        endOfPassWriteIndex: 1,
      },
    });

    pass.setPipeline(this.bench.pipeline);
    pass.setBindGroup(0, this.bench.bindGroup);
    pass.dispatchWorkgroups(workgroups >>> 0);
    pass.end();

    // Resolve timestamps -> resolveBuffer
    encoder.resolveQuerySet(this.querySet, 0, 2, this.resolveBuffer, 0);
    // Copy resolved timestamps -> mappable resultBuffer
    encoder.copyBufferToBuffer(this.resolveBuffer, 0, resultBuffer, 0, resultBuffer.size);

    device.queue.submit([encoder.finish()]);

    // Read back asynchronously
    await resultBuffer.mapAsync(GPUMapMode.READ);
    try {
      const view = new BigUint64Array(resultBuffer.getMappedRange());
      // timestamps are nanoseconds; subtract BigInts first, then convert
      const ns = Number(view[1] - view[0]);
      this.lastNs = Number.isFinite(ns) && ns >= 0 ? ns : this.lastNs;
      this.pushSample(this.lastNs);
      return this.lastNs;
    } finally {
      resultBuffer.unmap();
    }
  }

  /**
   * Convenience: run multiple times, warm up, return stats.
   *
   * @param {object} opts
   * @param {number} opts.runs
   * @param {number} opts.workgroups
   * @param {number} opts.iterations
   * @param {number=} opts.workgroupSize
   */
  async benchmarkComputeStats({ runs, workgroups, iterations, workgroupSize = 256 }) {
    const totalRuns = Math.max(1, runs | 0);

    // warmup
    for (let i = 0; i < this.warmupRuns; i++) {
      await this.benchmarkCompute({ workgroups, iterations, workgroupSize });
    }

    const times = [];
    for (let i = 0; i < totalRuns; i++) {
      const ns = await this.benchmarkCompute({ workgroups, iterations, workgroupSize });
      if (ns > 0) times.push(ns);
    }

    times.sort((a, b) => a - b);
    const mean = times.reduce((s, v) => s + v, 0) / Math.max(1, times.length);
    const p50 = times[Math.floor(0.50 * (times.length - 1))] ?? 0;
    const p90 = times[Math.floor(0.90 * (times.length - 1))] ?? 0;
    const min = times[0] ?? 0;
    const max = times[times.length - 1] ?? 0;

    return {
      supported: this.supported,
      runs: times.length,
      workgroups,
      iterations,
      workgroupSize,
      ns: { mean, p50, p90, min, max },
      ms: { mean: mean / 1e6, p50: p50 / 1e6, p90: p90 / 1e6, min: min / 1e6, max: max / 1e6 },
    };
  }

  /**
   * If you want a single number “score”, you can define it as work / time.
   * Here we define work = (workgroups * workgroupSize * iterations) and score = work / ms.
   * (This is a *relative* score, good for comparing machines/builds.)
   */
  static scoreFromStats(stats) {
    if (!stats?.supported || !stats?.ms?.p50) return 0;
    const work = stats.workgroups * stats.workgroupSize * stats.iterations;
    return work / stats.ms.p50;
  }

  dispose() {
    // Buffers & query sets are GC’d, but explicitly destroying is cleaner.
    try { this.resolveBuffer?.destroy?.(); } catch {}
    try { this.resultRing?.forEach(b => b.destroy?.()); } catch {}
    try { this.querySet?.destroy?.(); } catch {}
    try { this.bench?.paramsBuffer?.destroy?.(); } catch {}
    try { this.bench?.outBuffer?.destroy?.(); } catch {}
    this.querySet = null;
    this.resolveBuffer = null;
    this.resultRing = [];
    this.bench = null;
  }

  // ---------- internals ----------

  pushSample(ns) {
    this.samplesNs.push(ns);
    if (this.samplesNs.length > this.maxSamples) this.samplesNs.shift();
  }

  createBenchPipeline(workgroupSize) {
    const device = this.device;

    // A tiny ALU-heavy loop. Writes one u32 per invocation to prevent full elimination.
    // (Still not a perfect “GPU capability” test, but a useful regression signal.)
    const code = /* wgsl */ `
        struct Params { iterations: u32 };
        @group(0) @binding(0) var<uniform> params: Params;
        @group(0) @binding(1) var<storage, read_write> outData: array<u32>;

        fn mix32(x: u32) -> u32 {
        var v = x;
        v ^= v << 13u;
        v ^= v >> 17u;
        v ^= v << 5u;
        return v;
        }

        @compute @workgroup_size(${workgroupSize})
        fn main(@builtin(global_invocation_id) gid: vec3u) {
        let idx = gid.x;
        var v: u32 = idx * 747796405u + 2891336453u;

        // Do work
        for (var i: u32 = 0u; i < params.iterations; i = i + 1u) {
            v = mix32(v + i);
        }

        // Write something so the compiler can’t trivially drop everything
        outData[idx] = v;
        }
        `;

    const module = device.createShaderModule({ code });

    const pipeline = device.createComputePipeline({
      layout: "auto",
      compute: { module, entryPoint: "main" },
    });

    const paramsBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Allocate a reasonably large output buffer (you can oversize it).
    // You must ensure outBuffer is big enough for (workgroups * workgroupSize) u32s.
    // We'll allocate 16MB by default: 16 * 1024 * 1024 bytes => 4,194,304 u32s.
    const outBuffer = device.createBuffer({
      size: 16 * 1024 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: outBuffer } },
      ],
    });

    return { workgroupSize, pipeline, paramsBuffer, outBuffer, bindGroup };
  }

  tryGetDeviceFromRenderer(renderer) {
    if (!renderer) return null;

    // three.js WebGPURenderer internals have varied across revisions.
    // Try the common patterns without hard-failing.
    const candidates = [
      () => renderer.backend?.device,
      () => renderer._backend?.device,
      () => renderer.backend?.getDevice?.(),
      () => renderer._backend?.getDevice?.(),
      () => renderer.getContext?.()?.device, // usually not present, but harmless to try
    ];

    for (const get of candidates) {
      try {
        const d = get();
        if (d && typeof d.createBuffer === "function") return d;
      } catch {}
    }
    return null;
  }
}

export default GPUProfiler;
