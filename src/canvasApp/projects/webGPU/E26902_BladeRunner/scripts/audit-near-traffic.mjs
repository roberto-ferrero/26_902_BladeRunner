import fs from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { base, loadGeometry } from './audit-contacts.mjs'
const require = createRequire(import.meta.url)
export function loadNearTraffic() {
    const compile = (file, resolve) => {
        const code = require('@babel/core').transformSync(fs.readFileSync(base + file, 'utf8'), {
            configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
        }).code
        const module = { exports: {} }
        new Function('require', 'module', 'exports', code)(resolve, module, module.exports)
        return module.exports
    }
    const glow = { createBeaconGlow: () => new THREE.Texture() }
    const distant = compile('TyrellAirTraffic.js', name => name === 'three' ? THREE : glow)
    return compile('TyrellNearTraffic.js', name => name === 'three' ? THREE
        : name.includes('BufferGeometryUtils') ? { mergeGeometries }
            : name.includes('TyrellAirTraffic') ? distant : glow)
}
export async function auditNearTraffic() {
    const module = loadNearTraffic(), routes = module.createNearRoutes(), world = await loadGeometry()
    const meshes = [], cameras = [], box = new THREE.Box3()
    world.traverse(object => {
        if (object.isMesh && !/^(Sol|Cielo)/.test(object.name)) meshes.push(object)
        if (object.isPerspectiveCamera && /CAM_0[134]|Camera_E/.test(object.name)) cameras.push(object)
    })
    const geometry = module.createNearVehicleGeometries(), hull = new THREE.Group()
    for (const g of Object.values(geometry)) hull.add(new THREE.Mesh(g))
    hull.scale.setScalar(module.NEAR_TRAFFIC.vehicleScale)
    const bounds = new THREE.Box3().setFromObject(hull), radius = Math.max(bounds.min.length(), bounds.max.length())
    // Conservative sphere around the complete vehicle in any orientation. Broad
    // phase limits exact triangle-distance checks to a band around each route.
    const triangles = meshes.map(mesh => {
        const values = [], g = mesh.geometry, p = g.attributes.position
        for (let i = 0; i < (g.index?.count ?? p.count); i += 3) {
            const points = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(p, g.index ? g.index.getX(i + k) : i + k).applyMatrix4(mesh.matrixWorld))
            values.push({ triangle: new THREE.Triangle(...points), box: new THREE.Box3().setFromPoints(points) })
        }
        return { name: mesh.name, bounds: box.setFromObject(mesh).clone(), values }
    })
    const nearest = new THREE.Vector3(), ray = new THREE.Raycaster(), origin = new THREE.Vector3()
    const results = routes.map(route => {
        let clearance = Infinity, closestMesh = null, collisions = 0
        for (let i = 0; i <= 400; i++) {
            const point = route.getPointAt(i / 400)
            for (const mesh of triangles) {
                if (mesh.bounds.distanceToPoint(point) > 12) continue
                for (const item of mesh.values) {
                    if (item.box.distanceToPoint(point) > 12) continue
                    item.triangle.closestPointToPoint(point, nearest)
                    const distance = point.distanceTo(nearest) - radius
                    if (distance < clearance) { clearance = distance; closestMesh = mesh.name }
                    if (distance < 0) collisions++
                }
            }
        }
        const views = cameras.map(camera => {
            camera.aspect = 2.4; camera.updateProjectionMatrix(); camera.getWorldPosition(origin)
            const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4()
                .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
            const visible = [], fadedVisible = [], screenSamples = []
            for (let i = 0; i <= 400; i++) {
                const progress = i / 400, point = route.getPointAt(progress)
                if (!frustum.intersectsSphere(new THREE.Sphere(point, radius))) continue
                ray.set(origin, point.clone().sub(origin).normalize()); ray.far = origin.distanceTo(point) - radius
                if (ray.intersectObjects(meshes, false).length) continue
                visible.push(progress)
                if (i % 10 === 0) {
                    const ndc = point.clone().project(camera)
                    screenSamples.push({ progress, x: (ndc.x + 1) / 2, y: (1 - ndc.y) / 2 })
                }
                if (progress < .045 || progress > .955) fadedVisible.push(progress)
            }
            return { camera: camera.name, visibleSamples: visible.length,
                firstVisible: visible[0], lastVisible: visible.at(-1), fadedVisible, screenSamples }
        })
        return { length: route.getLength(), speed: route.getLength() / module.NEAR_TRAFFIC.duration,
            conservativeHullClearance: Math.min(clearance, 12 - radius), clearanceIsLowerBound: clearance === Infinity, closestMesh, collisions, views }
    })
    return { samplesPerRoute: 401, hullRadius: radius, routes: results,
        limitations: 'Conservative hull sphere vs original GLB triangles, sampled at 1/400 arc length. Visibility uses a centre ray and sphere frustum test, no mouse pan; visual review remains necessary. Low city roofs are below both routes; lateral flare towers are outside the flight area.' }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    console.log(JSON.stringify(await auditNearTraffic(), null, 2))
}
