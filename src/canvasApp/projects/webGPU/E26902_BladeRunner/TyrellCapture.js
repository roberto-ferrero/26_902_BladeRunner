import { Vector2 } from 'three'

export const REFERENCE_CAPTURE = { width: 1920, height: 800 }
const captureCameras = new WeakMap()

// toBlob snapshots the canvas when called; restore the live frame immediately.
export function captureReference(renderer, scene, sourceCamera) {
    const size = renderer.getSize(new Vector2())
    const pixelRatio = renderer.getPixelRatio()
    // Stable camera identity bounds per-camera reflector targets across repeated captures.
    let camera = captureCameras.get(sourceCamera)
    if (!camera) { camera = sourceCamera.clone(false); captureCameras.set(sourceCamera, camera) }
    else camera.copy(sourceCamera, false)
    camera.aspect = REFERENCE_CAPTURE.width / REFERENCE_CAPTURE.height
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    return new Promise((resolve, reject) => {
        try {
            renderer.setPixelRatio(1)
            renderer.setSize(REFERENCE_CAPTURE.width, REFERENCE_CAPTURE.height, false)
            renderer.render(scene, camera)
            renderer.domElement.toBlob(blob => {
                if (blob) resolve(blob)
                else reject(new Error('No se pudo generar la captura PNG.'))
            }, 'image/png')
        } catch (error) {
            reject(error)
        } finally {
            renderer.setPixelRatio(pixelRatio)
            renderer.setSize(size.x, size.y, false)
            renderer.render(scene, sourceCamera)
        }
    })
}
