import { Euler, Vector3 } from 'three'

// Free exploration shares the render camera, but never changes the authored presets.
export default class TyrellNavigation {
    constructor(camera, canvas, onChange, blocked = () => false) {
        Object.assign(this, { camera, canvas, onChange, blocked, enabled: false, speed: 1.4, height: 1.65 })
        this.keys = new Set()
        this.euler = new Euler(0, 0, 0, 'YXZ')
        this.direction = new Vector3()
        this.forward = new Vector3()
        this.right = new Vector3()
        this.listeners = []
        const listen = (target, name, fn) => { target.addEventListener(name, fn); this.listeners.push(() => target.removeEventListener(name, fn)) }
        listen(document, 'pointerlockchange', () => { this.keys.clear(); this.fallback = false; this.onChange() })
        listen(document, 'pointerlockerror', () => this.useFallback())
        listen(canvas, 'mousedown', event => { if (this.fallback && event.button === 0) this.dragging = true })
        listen(document, 'mouseup', () => { this.dragging = false })
        listen(window, 'blur', () => this.pause())
        listen(document, 'visibilitychange', () => { if (document.hidden) this.pause() })
        listen(window, 'keydown', event => {
            if (event.key === 'Escape') { this.pause(); return }
            if (!this.enabled || !this.locked || this.blocked() || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return
            if (event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, [contenteditable]')) return
            if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return
            event.preventDefault(); this.keys.add(event.code)
        })
        listen(window, 'keyup', event => this.keys.delete(event.code))
        listen(document, 'mousemove', event => {
            if (!this.enabled || !this.locked || this.blocked() || (this.fallback && !this.dragging)) return
            this.euler.setFromQuaternion(this.camera.quaternion, 'YXZ')
            this.euler.y -= event.movementX * 0.002
            this.euler.x = Math.max(-Math.PI / 2 + .01, Math.min(Math.PI / 2 - .01, this.euler.x - event.movementY * .002))
            this.euler.z = 0
            this.camera.quaternion.setFromEuler(this.euler)
            this.camera.updateMatrixWorld(true)
        })
    }
    get locked() { return document.pointerLockElement === this.canvas || !!this.fallback }
    setEnabled(enabled) {
        if (enabled && this.collision) this.collision.settle(this.camera.position, this.height)
        this.enabled = enabled
        if (!enabled) this.pause()
        this.onChange()
    }
    async enter() {
        if (!this.enabled || this.blocked()) return
        try { await this.canvas.requestPointerLock() }
        catch { this.useFallback() }
    }
    useFallback() {
        if (!this.enabled) return
        this.fallback = true
        this.onChange('WASD · Arrastrar en la escena para mirar · Altura fija · Escape para pausar')
    }
    pause() {
        this.keys.clear(); this.fallback = false; this.dragging = false
        if (document.pointerLockElement === this.canvas) document.exitPointerLock()
        this.onChange()
    }
    update(seconds) {
        if (!this.enabled || !this.locked || this.blocked() || !Number.isFinite(seconds) || seconds <= 0) return
        const down = (...codes) => codes.some(code => this.keys.has(code)) ? 1 : 0
        this.euler.setFromQuaternion(this.camera.quaternion, 'YXZ')
        this.forward.set(-Math.sin(this.euler.y), 0, -Math.cos(this.euler.y))
        this.right.set(Math.cos(this.euler.y), 0, -Math.sin(this.euler.y))
        this.direction.copy(this.forward).multiplyScalar(down('KeyW', 'ArrowUp') - down('KeyS', 'ArrowDown'))
            .addScaledVector(this.right, down('KeyD', 'ArrowRight') - down('KeyA', 'ArrowLeft'))
        this.direction.normalize().multiplyScalar(Math.min(seconds, .1) * this.speed)
        if (this.collision) this.collision.move(this.camera.position, this.direction, this.height)
        else this.camera.position.add(this.direction)
        this.camera.updateMatrixWorld(true)
    }
    dispose() { this.pause(); this.listeners.forEach(remove => remove()) }
}
