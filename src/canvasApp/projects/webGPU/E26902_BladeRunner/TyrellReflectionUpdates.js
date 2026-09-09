import { Vector2 } from 'three'

// Cache only stationary views. Moving cameras must render fresh pixels: no stale-screen reprojection.
export default class TyrellReflectionUpdates {
    constructor(node) {
        this.node = node
        this.mode = 'adaptive'
        this.revision = 0
        this.rendered = 0
        this.reused = 0
        this.views = new WeakMap()
        this.size = new Vector2()
        const base = node.reflector
        this.originalUpdate = base.updateBefore
        base.updateBefore = frame => {
            // NodeFrame is reused by nested renderer.render calls; retain the outer camera identity.
            const camera = frame.camera
            frame.renderer.getDrawingBufferSize(this.size)
            const key = [this.revision, this.size.x, this.size.y, base.resolutionScale,
                ...camera.matrixWorld.elements, ...camera.projectionMatrix.elements].join(',')
            if (this.mode === 'adaptive' && this.views.get(camera) === key) {
                const target = base.getRenderTarget(base.getVirtualCamera(camera))
                node.value = target.texture
                this.reused++
                return
            }
            this.originalUpdate.call(base, frame)
            if (base.hasOutput) this.views.set(camera, key)
            this.rendered++
        }
    }
    invalidate() { this.revision++ }
    setMode(mode) { if (['adaptive', 'always'].includes(mode)) { this.mode = mode; this.invalidate() } }
    dispose() { this.node.reflector.updateBefore = this.originalUpdate }
}
