// Own only this viewer's listeners; never resume free movement automatically.
export default class TyrellLifecycle {
    constructor({ pauseInput, resetTiming, suspend, resume, ready, failed }, win = window, doc = document) {
        Object.assign(this, { pauseInput, resetTiming, suspend, resume, ready, failed, doc })
        this.listeners = []
        this.disposed = false
        const listen = (target, type, action) => { target.addEventListener(type, action); this.listeners.push(() => target.removeEventListener(type, action)) }
        listen(win, 'blur', () => this.pause())
        listen(win, 'focus', () => { if (!doc.hidden) this.resetTiming() })
        listen(doc, 'visibilitychange', () => this.sync())
        listen(doc, 'focusin', event => { if (event.target?.closest?.('input, select, textarea, [contenteditable], dialog')) this.pause() })
        listen(doc, 'pointerdown', event => { if (event.target?.closest?.('.tyrell-gui-panel, .tyrell-gui-toggle, dialog')) this.pause() })
    }
    pause() { this.pauseInput(); this.resetTiming() }
    sync() {
        if (this.disposed) return
        this.pause()
        if (!this.ready()) return
        if (this.doc.hidden || this.failed()) this.suspend()
        else this.resume()
    }
    dispose() { this.disposed = true; this.listeners.forEach(remove => remove()); this.listeners = [] }
}
