import { PerspectiveCamera } from 'three'
import { TYRELL } from './config'

export default class TyrellCameraRig {
    constructor(app) {
        this.app = app
        this.camera = new PerspectiveCamera(23, TYRELL.referenceAspect, 0.03, 2500)
        this.camera.position.set(-0.12, 1.55, 10.3)
        this.resize = () => {
            const aspect = this.app.size.CURRENT.aspect
            if (!Number.isFinite(aspect) || aspect <= 0) return
            this.camera.aspect = aspect
            this.camera.updateProjectionMatrix()
        }
        app.emitter.on('onAppSizeUpdate', this.resize)
    }
    setSource(source, duration = 0) {
        const start = this.camera.clone(false)
        source.updateWorldMatrix(true, false)
        this.camera.copy(source, false)
        source.getWorldPosition(this.camera.position)
        source.getWorldQuaternion(this.camera.quaternion)
        // Blender camera display scale (0.01 on seven cameras) must not scale view space.
        this.camera.scale.set(1, 1, 1)
        this.resize()
        this.camera.updateMatrixWorld(true)
        this.destination = this.camera.clone(false)
        this.transition = duration > 0 ? { start, elapsed: 0, duration } : null
        if (this.transition) this.applyTransition(0)
    }
    applyTransition(t) {
        const { start } = this.transition
        const end = this.destination
        const eased = t * t * (3 - 2 * t)
        this.camera.position.lerpVectors(start.position, end.position, eased)
        this.camera.quaternion.slerpQuaternions(start.quaternion, end.quaternion, eased)
        for (const key of ['fov', 'zoom', 'near', 'far', 'filmGauge', 'filmOffset']) {
            this.camera[key] = start[key] + (end[key] - start[key]) * eased
        }
        this.camera.updateProjectionMatrix()
        this.camera.updateMatrixWorld(true)
    }
    update(seconds) {
        if (!this.transition) return false
        if (Number.isFinite(seconds) && seconds > 0) this.transition.elapsed += Math.min(seconds, .1)
        const t = Math.min(1, this.transition.elapsed / this.transition.duration)
        this.applyTransition(t)
        if (t === 1) this.transition = null
        return true
    }
    cancelTransition() { this.transition = null }

    get_camera() { return this.camera }
    dispose() { this.app.emitter.off('onAppSizeUpdate', this.resize) }
}
