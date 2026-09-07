import { PerspectiveCamera } from 'three'
import { TYRELL } from './config'

export default class TyrellCameraRig {
    constructor(app) {
        this.app = app
        this.camera = new PerspectiveCamera(23, TYRELL.referenceAspect, 0.03, 2500)
        this.camera.position.set(-0.12, 1.55, 10.3)
        this.resize = () => {
            this.camera.aspect = this.app.size.CURRENT.aspect
            this.camera.updateProjectionMatrix()
        }
        app.emitter.on('onAppSizeUpdate', this.resize)
    }
    setSource(source) {
        source.updateWorldMatrix(true, false)
        this.camera.copy(source, false)
        source.getWorldPosition(this.camera.position)
        source.getWorldQuaternion(this.camera.quaternion)
        // Blender camera display scale (0.01 on seven cameras) must not scale view space.
        this.camera.scale.set(1, 1, 1)
        this.resize()
        this.camera.updateMatrixWorld(true)
    }
    get_camera() { return this.camera }
    dispose() { this.app.emitter.off('onAppSizeUpdate', this.resize) }
}
