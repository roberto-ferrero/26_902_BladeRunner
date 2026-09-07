import * as THREE from 'three'
import { TYRELL } from './config'

// The lighting rig, rebuilt from the master .blend rather than from the GLB.
//
// The GLB only carries the sun, and with stale values; the four area fills never left Blender.
// The numbers live in config.js under `lighting`, with the conversion each one needed written
// beside it, and docs/phase4/luces.json records where they came from.

// Blender stores light colours linearly. A hex literal would be read as sRGB and come out wrong,
// so every colour goes through the linear path explicitly.
function linearColor([r, g, b]) {
    return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace)
}

export function createWorldLight() {
    const { color, intensity } = TYRELL.lighting.world
    const light = new THREE.AmbientLight(linearColor(color), intensity)
    light.name = 'Tyrell / mundo'
    return light
}

export function createAreaFills() {
    return TYRELL.lighting.areaFills.map(fill => {
        const light = new THREE.RectAreaLight(linearColor(fill.color), fill.intensity, fill.size, fill.size)
        light.name = `Tyrell / ${fill.name}`
        light.position.set(...fill.position)
        // A RectAreaLight emits along its own -Z, the same convention as a Blender lamp, so
        // aiming it at the target reproduces the authored orientation.
        light.lookAt(new THREE.Vector3(...fill.target))
        light.userData.watts = fill.watts
        return light
    })
}

export function applySunFromMaster(sun) {
    const master = TYRELL.lighting.sun
    // Keep what the GLB got right, which is the transform, and replace what it got wrong.
    // Plain numbers only: Object3D.clone() round-trips userData through JSON, and the quality
    // switch clones this light, so a Color stored here would come back without its prototype.
    sun.userData.gltfIntensity = sun.intensity
    sun.userData.gltfColor = sun.color.toArray()
    sun.intensity = master.intensity
    sun.color.copy(linearColor(master.color))
    sun.castShadow = true
    return sun
}

const _box = new THREE.Box3()
const _corner = new THREE.Vector3()
const _lightPosition = new THREE.Vector3()
const _targetPosition = new THREE.Vector3()
const _view = new THREE.Matrix4()

/**
 * Fits the sun's orthographic shadow frustum to what actually casts, measured in the sun's own
 * space. The room is 25 x 7 x 28 m and the sun grazes at 4 degrees above the horizon, so a
 * frustum fitted this way covers about a quarter of the area a fixed one needs, and every texel
 * lands on roughly half the distance. The bias is then set in texels of the fitted map, so it
 * does not have to be retuned when the shadow resolution changes.
 *
 * Returns what it decided, for the diagnostics file.
 */
export function fitSunShadow(sun, casters) {
    if (!sun || !casters.length) return null
    const { marginMetres, normalBiasTexels, biasTexels, radius } = TYRELL.lighting.shadow

    const bounds = new THREE.Box3()
    for (const object of casters) {
        object.updateWorldMatrix(true, false)
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
        _box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld)
        bounds.union(_box)
    }

    sun.updateWorldMatrix(true, false)
    sun.target.updateWorldMatrix(true, false)
    _lightPosition.setFromMatrixPosition(sun.matrixWorld)
    _targetPosition.setFromMatrixPosition(sun.target.matrixWorld)
    // The same view the shadow camera will build: sit at the light, look at the target.
    _view.lookAt(_lightPosition, _targetPosition, sun.up).setPosition(_lightPosition).invert()

    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    for (let index = 0; index < 8; index++) {
        _corner.set(
            index & 1 ? bounds.max.x : bounds.min.x,
            index & 2 ? bounds.max.y : bounds.min.y,
            index & 4 ? bounds.max.z : bounds.min.z
        ).applyMatrix4(_view)
        min.min(_corner)
        max.max(_corner)
    }

    const camera = sun.shadow.camera
    camera.left = min.x - marginMetres
    camera.right = max.x + marginMetres
    camera.bottom = min.y - marginMetres
    camera.top = max.y + marginMetres
    // View space looks down -Z, so a point in front of the camera has a negative z and its
    // distance is -z. The far plane is the most distant corner, the near plane the closest.
    camera.near = Math.max(0.1, -max.z - marginMetres)
    camera.far = -min.z + marginMetres
    camera.updateProjectionMatrix()

    const mapSize = sun.shadow.mapSize.x
    const texel = (camera.right - camera.left) / mapSize
    sun.shadow.normalBias = texel * normalBiasTexels
    sun.shadow.bias = -texel * biasTexels * 0.001
    sun.shadow.radius = radius

    return {
        casters: casters.length,
        boundsMin: bounds.min.toArray().map(v => +v.toFixed(3)),
        boundsMax: bounds.max.toArray().map(v => +v.toFixed(3)),
        frustum: {
            width: +(camera.right - camera.left).toFixed(3),
            height: +(camera.top - camera.bottom).toFixed(3),
            near: +camera.near.toFixed(3), far: +camera.far.toFixed(3)
        },
        mapSize, texelMetres: +texel.toFixed(5),
        normalBias: +sun.shadow.normalBias.toFixed(5),
        bias: +sun.shadow.bias.toFixed(7),
        radius
    }
}
