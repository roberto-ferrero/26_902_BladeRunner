// Retain the diagnostic contract, with a single measurement at startup.
export default class TyrellCapacityChecks {
    constructor() {
        this.state = 'pending'
    }
    initial(result) {
        this.initialResult = result
        this.state = 'complete'
    }
    diagnostics() {
        return { policy: 'startup-only', state: this.state, secondAttempts: 0,
            source: 'initial', initial: this.initialResult || null, second: null }
    }
}
