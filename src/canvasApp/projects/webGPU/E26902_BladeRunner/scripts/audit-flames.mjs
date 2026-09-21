import fs from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import * as THREE from 'three'
import { base, loadGeometry } from './audit-contacts.mjs'
const require = createRequire(import.meta.url)
export function loadFlames() {
    const { code } = require('@babel/core').transformSync(fs.readFileSync(base + 'TyrellFlames.js', 'utf8'), {
        configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
    return module.exports
}
export async function auditFlames() {
    const { FLAME_TOWERS, FLAMES, flameBounds } = loadFlames(), world = await loadGeometry()
    const cameras = [], meshes = []
    world.traverse(o => { if (o.isPerspectiveCamera) cameras.push(o); if (o.isMesh && !/^(Cielo|Sol)/.test(o.name)) meshes.push(o) })
    const source = cameras.find(c => c.name.startsWith('CAM_01'))
    const from = (source, aspect = 2.4) => {
        const camera = new THREE.PerspectiveCamera(source.fov, aspect, source.near, source.far)
        camera.name = source.name
        source.getWorldPosition(camera.position); source.getWorldQuaternion(camera.quaternion)
        camera.updateMatrixWorld(true); return camera
    }
    const frustum = c => new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse))
    const reference = from(source), up = new THREE.Vector3(0, 1, 0).applyQuaternion(reference.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(reference.quaternion)
    const target = new THREE.Vector3(0, 0, -20).applyQuaternion(reference.quaternion).add(reference.position)
    const ray = new THREE.Raycaster()
    return FLAME_TOWERS.map(tower => {
        const bounds = flameBounds(tower, FLAMES.size), samples = []
        for (const size of [FLAMES.size, 5]) for (const rise of [FLAMES.rise, 3]) for (const aspect of [2.4, 16 / 9]) {
            const auditedBounds = flameBounds(tower, size, rise)
            let intersections = 0, count = 0
            for (let x = -20; x <= 20; x++) for (let y = -20; y <= 20; y++) {
                const c = from(source, aspect)
                c.position.addScaledVector(right, x / 10).addScaledVector(up, y / 10)
                c.up.copy(up); c.lookAt(target); c.updateMatrixWorld(true)
                count++; if (frustum(c).intersectsBox(auditedBounds)) intersections++
            }
            samples.push({ size, rise, aspect, count, intersections, pan: [2, 2], targetDistance: 20 })
        }
        const presets = cameras.map(source => {
            const c = from(source), point = new THREE.Vector3(tower.x, tower.top + 12, tower.z)
            ray.set(c.position, point.clone().sub(c.position).normalize()); ray.far = c.position.distanceTo(point) - 1
            return { camera: c.name, inFrustum: frustum(c).intersectsBox(bounds), centreUnoccluded: ray.intersectObjects(meshes, false).length === 0 }
        })
        return { tower, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, samples, presets }
    })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await auditFlames(), null, 2))
