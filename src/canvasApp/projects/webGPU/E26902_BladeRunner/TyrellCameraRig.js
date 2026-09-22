import { PerspectiveCamera, Vector3 } from 'three'
import { TYRELL } from './config'
import { CAMERA_EASINGS, cameraTransition } from './TyrellCameraStates'

export default class TyrellCameraRig {
    constructor(app) {
        this.app = app
        this.camera = new PerspectiveCamera(23, TYRELL.referenceAspect, 0.03, 2500)
        this.camera.position.set(-0.12, 1.55, 10.3)
        // Separate base pose from the render camera: pan never feeds back into a transition.
        // World-space render camera preserves the existing reflection/capture integrations.
        this.baseCamera = this.camera.clone(false)
        this.target = new Vector3(-0.12, 1.55, -9.7)
        this.viewOffset = { x: 0, y: 0 }
        this.mousePan = { ...TYRELL.pan }
        this.resize = () => {
            const aspect = this.app.size.CURRENT.aspect
            if (!Number.isFinite(aspect) || aspect <= 0) return
            this.camera.aspect = aspect
            this.camera.updateProjectionMatrix()
            this.baseCamera.aspect = aspect
            this.baseCamera.updateProjectionMatrix()
        }
        app.emitter.on('onAppSizeUpdate', this.resize)
        this.resize()
    }
    setState(state, options = { duration: 0, easing: 'smoothstep' }) {
        const { duration, easing } = cameraTransition({ duration: 0, easing: 'smoothstep' }, options)
        const start = {
            position: this.baseCamera.position.clone(), target: this.target.clone(),
            fov: this.baseCamera.fov, near: this.baseCamera.near, far: this.baseCamera.far,
            viewOffset: { ...this.viewOffset }, mousePan: { ...this.mousePan }
        }
        const end = { ...state, position: new Vector3(...state.position), target: new Vector3(...state.target),
            viewOffset: { x: 0, y: 0, ...state.viewOffset }, mousePan: { ...TYRELL.pan, ...state.mousePan } }
        this.cameraStateId = state.cameraStateId
        this.baseCamera.name = state.cameraStateId
        this.baseCamera.userData.cameraStateId = state.cameraStateId
        this.transition = { start, end, duration, elapsed: 0, easing, type: 'state' }
        this.applyStateTransition(duration > 0 ? 0 : 1)
        if (duration === 0) this.transition = null
    }
    applyStateTransition(t) {
        const { start, end, easing } = this.transition
        const eased = CAMERA_EASINGS[easing](t)
        this.baseCamera.position.lerpVectors(start.position, end.position, eased)
        this.target.lerpVectors(start.target, end.target, eased)
        for (const key of ['fov', 'near', 'far']) this.baseCamera[key] = start[key] + (end[key] - start[key]) * eased
        for (const key of ['x', 'y']) this.viewOffset[key] = start.viewOffset[key] + (end.viewOffset[key] - start.viewOffset[key]) * eased
        for (const key of ['horizontal', 'vertical', 'smoothness']) {
            // Disabled pan has an effective range of zero, so enable/disable transitions also fade smoothly.
            const from = key !== 'smoothness' && !start.mousePan.enabled ? 0 : start.mousePan[key]
            const to = key !== 'smoothness' && !end.mousePan.enabled ? 0 : end.mousePan[key]
            this.mousePan[key] = from + (to - from) * eased
        }
        this.mousePan.enabled = t < 1 ? start.mousePan.enabled || end.mousePan.enabled : end.mousePan.enabled
        this.baseCamera.up.set(0, 1, 0)
        if (this.baseCamera.position.distanceToSquared(this.target) > 1e-12) this.baseCamera.lookAt(this.target)
        // Normalized viewport displacement; full dimensions follow the live aspect on resize/capture.
        this.baseCamera.view = { enabled: true, fullWidth: 1, fullHeight: 1,
            offsetX: this.viewOffset.x, offsetY: this.viewOffset.y, width: 1, height: 1 }
        this.baseCamera.updateProjectionMatrix()
        this.baseCamera.updateMatrixWorld(true)
        this.camera.copy(this.baseCamera, false)
        this.camera.updateMatrixWorld(true)
    }
    configurePan(values) {
        Object.assign(this.mousePan, values)
        // GUI edits apply to the selected state, including the remainder of an active travelling.
        if (this.transition?.type === 'state') {
            Object.assign(this.transition.start.mousePan, values)
            Object.assign(this.transition.end.mousePan, values)
        }
    }
    adoptCurrentView(targetDistance = 20) {
        this.baseCamera.copy(this.camera, false)
        this.camera.getWorldDirection(this.target).multiplyScalar(targetDistance).add(this.camera.position)
        this.transition = null
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
        if (Number.isFinite(seconds) && seconds > 0) this.transition.elapsed += seconds
        const t = Math.min(1, this.transition.elapsed / this.transition.duration)
        if (this.transition.type === 'state') this.applyStateTransition(t)
        else this.applyTransition(t)
        if (t === 1) this.transition = null
        return true
    }
    cancelTransition() { this.transition = null }

    get_camera() { return this.camera }
    dispose() { this.app.emitter.off('onAppSizeUpdate', this.resize) }
}
