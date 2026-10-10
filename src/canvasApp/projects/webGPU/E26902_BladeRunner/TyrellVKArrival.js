// Arrival is supplied AFTER camera interpolation, never from the destination
// selection alone, and only after the startup fade has finished.
// Losing p1/free-camera/reselection cancels the pending one-second dwell.
export default class TyrellVKArrival {
    constructor() { this.enabled = true; this.consumed = false; this.elapsed = 0 }
    cancel() { this.elapsed = 0 }
    manual() { this.consumed = true; this.cancel() }
    update(seconds, settledP1) {
        if (!this.enabled || this.consumed || !settledP1) { this.cancel(); return false }
        if (!Number.isFinite(seconds) || seconds <= 0) return false
        this.elapsed += Math.min(seconds, .1)
        if (this.elapsed < 1 - 1e-10) return false
        this.consumed = true; this.cancel(); return true
    }
}
