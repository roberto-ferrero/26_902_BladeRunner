const rank = result => !Number.isFinite(result?.gpuScore) || result.gpuScore <= 0 ? 0
    : result.reliable ? 3 : result.method === 'gpu-timestamp' ? 2 : 1

// Exactly two opportunities per page load: startup and the first settled/open p1.
export default class TyrellCapacityChecks {
    constructor({ settleMs = 1000 } = {}) {
        this.settleMs = settleMs
        this.state = 'pending'; this.attempts = 0; this.source = 'initial'
    }
    initial(result) { this.initialResult = this.effective = result }
    beginIfReady(now, ready) {
        if (this.state !== 'pending' || !this.initialResult) return false
        if (!ready) { this.settledSince = undefined; return false }
        if (this.settledSince === undefined) this.settledSince = now
        if (now - this.settledSince < this.settleMs) return false
        this.state = 'running'; this.attempts++
        return true
    }
    complete(result) {
        this.secondResult = result
        if (rank(result) > 0 && rank(result) >= rank(this.effective)) { this.effective = result; this.source = 'p1' }
        this.state = 'complete'
        return this.effective
    }
    diagnostics() {
        return { policy: 'startup-and-p1-once', state: this.state, secondAttempts: this.attempts,
            source: this.source, initial: this.initialResult, second: this.secondResult || null }
    }
}
