// Read-only geometry and candidate-zone audit. No runtime scene modifications.
import fs from 'node:fs'
import * as THREE from 'three'
import { loadGeometry, base } from './audit-contacts.mjs'

const scene = await loadGeometry(), cameras = [], exteriorMeshes = []
const output = base + 'docs/phase9/9.0/'
scene.traverse(object => {
    if (object.isCamera) {
        cameras.push({ name: object.name,
            position: object.getWorldPosition(new THREE.Vector3()).toArray(),
            quaternion: object.getWorldQuaternion(new THREE.Quaternion()).toArray(),
            fov: object.fov, near: object.near, far: object.far })
    }
    if (!object.isMesh) return
    const box = new THREE.Box3().setFromObject(object, true)
    if (box.min.z < -20) exteriorMeshes.push({ name: object.name, min: box.min.toArray(), max: box.max.toArray() })
})
const cameraFrom = source => {
    const camera = new THREE.PerspectiveCamera(source.fov, 2.4, source.near, source.far)
    camera.position.fromArray(source.position)
    camera.quaternion.fromArray(source.quaternion)
    camera.updateMatrixWorld(true)
    return camera
}
const frustumFrom = camera => new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
const source = cameras.find(camera => camera.name.startsWith('CAM_01'))
if (!source) throw new Error('CAM01 missing from active GLB')
const target = new THREE.Vector3(...source.position).add(new THREE.Vector3(0, 0, -20))
const zones = [
    { id: 'torre-derecha', min: [340, -80, -480], max: [380, 55, -440] },
    { id: 'torre-izquierda-1', min: [-540, -100, -720], max: [-500, 50, -680] },
    { id: 'torre-izquierda-2', min: [-660, -120, -850], max: [-620, 40, -810] }
]
for (const zone of zones) {
    const box = new THREE.Box3(new THREE.Vector3(...zone.min), new THREE.Vector3(...zone.max))
    zone.intersections = 0; zone.samples = 0
    for (let x = 0; x <= 40; x++) for (let y = 0; y <= 10; y++) {
        const camera = cameraFrom(source)
        camera.position.add(new THREE.Vector3(-2 + x * .1, -.5 + y * .1, 0))
        camera.lookAt(target); camera.updateMatrixWorld(true)
        zone.samples++
        if (frustumFrom(camera).intersectsBox(box)) zone.intersections++
    }
    zone.visiblePresets = cameras.filter(c => frustumFrom(cameraFrom(c)).intersectsBox(box)).map(c => c.name)
}
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(output + 'geometry-audit.json', JSON.stringify({ units: 'metres; glTF Y up; world coordinates; aspect 2.4', cameras, exteriorMeshes }, null, 2) + '\n')
fs.writeFileSync(output + 'zones.json', JSON.stringify({
    scope: 'Candidate emitter+flame AABBs, no meshes added. 451 CAM01 pan samples at 2.4:1. Frustum only, not occlusion; not continuous proof or full viewport guarantee.', zones
}, null, 2) + '\n')
console.log(JSON.stringify({ cameras: cameras.length, exteriorMeshes: exteriorMeshes.length, zones }, null, 2))
