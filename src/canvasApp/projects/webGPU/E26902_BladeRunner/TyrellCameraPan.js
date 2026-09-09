import { Vector2, Vector3 } from 'three'

// Camera-local translation around an immutable reference, aimed at a fixed point.
export default class TyrellCameraPan {
    constructor(camera, settings) {
        this.camera = camera
        this.settings = { ...settings }
        this.pointer = new Vector2()
        this.offset = new Vector2()
        this.right = new Vector3()
        this.up = new Vector3()
        this.target = new Vector3()
        this.setReference()
    }
    setReference() {
        if (this.referenceCamera) this.referenceCamera.copy(this.camera, false)
        else this.referenceCamera = this.camera.clone(false)
        this.pointer.set(0, 0); this.offset.set(0, 0)
        this.right.set(1, 0, 0).applyQuaternion(this.referenceCamera.quaternion)
        this.up.set(0, 1, 0).applyQuaternion(this.referenceCamera.quaternion)
        this.updateTarget()
    }
    updateTarget() {
        this.target.set(0, 0, -1).applyQuaternion(this.referenceCamera.quaternion)
            .multiplyScalar(this.settings.targetDistance).add(this.referenceCamera.position)
    }
    configure(values) {
        if (typeof values.enabled === 'boolean') this.settings.enabled = values.enabled
        for (const [key, min, max] of [['horizontal', 0, 2], ['vertical', 0, 2], ['smoothness', 0, 2], ['targetDistance', 1, 100]]) {
            if (Number.isFinite(values[key])) this.settings[key] = Math.max(min, Math.min(max, values[key]))
        }
        this.updateTarget()
        // A reduced range is a hard limit even while the previous movement settles.
        this.offset.x = Math.max(-this.settings.horizontal, Math.min(this.settings.horizontal, this.offset.x))
        this.offset.y = Math.max(-this.settings.vertical, Math.min(this.settings.vertical, this.offset.y))
        if (!this.settings.enabled) this.reset()
    }
    setPointer(x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return
        this.pointer.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)))
    }
    reset() {
        this.pointer.set(0, 0); this.offset.set(0, 0)
        this.apply()
    }
    update(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return
        const alpha = this.settings.smoothness === 0 ? 1 : -Math.expm1(-Math.min(seconds, 0.1) / this.settings.smoothness)
        const x = this.settings.enabled ? -this.pointer.x * this.settings.horizontal : 0
        const y = this.settings.enabled ? this.pointer.y * this.settings.vertical : 0
        this.offset.x += (x - this.offset.x) * alpha
        this.offset.y += (y - this.offset.y) * alpha
        if (Math.abs(this.offset.x) < 1e-8) this.offset.x = 0
        if (Math.abs(this.offset.y) < 1e-8) this.offset.y = 0
        this.apply()
    }
    apply() {
        this.camera.position.copy(this.referenceCamera.position)
            .addScaledVector(this.right, this.offset.x).addScaledVector(this.up, this.offset.y)
        this.camera.up.copy(this.up)
        if (this.offset.lengthSq() === 0) this.camera.quaternion.copy(this.referenceCamera.quaternion)
        else this.camera.lookAt(this.target)
        this.camera.updateMatrixWorld(true)
    }
    diagnostics() {
        return { ...this.settings, units: 'metres; smoothness in seconds', offset: this.offset.toArray(),
            referencePosition: this.referenceCamera.position.toArray(), target: this.target.toArray() }
    }
}
