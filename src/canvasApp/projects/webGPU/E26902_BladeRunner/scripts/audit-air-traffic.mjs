// Route visibility against authored architecture; samples are not an artistic review.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import { base, loadGeometry } from './audit-contacts.mjs'
const require = createRequire(import.meta.url), module = { exports: {} }
const code = require('@babel/core').transformSync(fs.readFileSync(base + 'TyrellAirTraffic.js', 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
new Function('require', 'module', 'exports', code)(name => name === 'three' ? THREE : {
    createBeaconGlow: () => new THREE.Texture()
}, module, module.exports)
const routes = module.exports.createAirRoutes(), world = await loadGeometry(), meshes = [], cameras = []
world.traverse(o => {
    if (o.isMesh && !/^(Cielo|Sol)/.test(o.name)) meshes.push(o)
    if (o.isPerspectiveCamera) cameras.push(o)
})
const ray = new THREE.Raycaster(), point = new THREE.Vector3(), origin = new THREE.Vector3()
const visibility = []
const views = cameras.map(camera => {
    camera.aspect = 2.4; camera.updateProjectionMatrix(); camera.getWorldPosition(origin)
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4()
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    const masks = []
    const samples = routes.map((route, routeIndex) => {
        const mask = Array(201).fill(false); masks.push(mask)
        let inFrame = 0, unoccluded = 0, inFrontOfPyramid = 0, firstVisible = null
        for (let i = 1; i < 200; i++) {
            route.getPointAt(i / 200, point)
            if (!frustum.containsPoint(point)) continue
            inFrame++
            ray.set(origin, point.clone().sub(origin).normalize()); ray.far = origin.distanceTo(point) - 2
            if (ray.intersectObjects(meshes, false).length) continue
            mask[i] = true
            unoccluded++; firstVisible ??= { progress: i / 200, point: point.toArray() }
            if (routeIndex === 2) {
                ray.far = 2000
                if (ray.intersectObjects(meshes, false)[0]?.object.name === 'Tyrell_Corporation_Pyramid') inFrontOfPyramid++
            }
        }
        return { inFrame, unoccluded, firstVisible, ...(routeIndex === 2 ? { inFrontOfPyramid } : {}) }
    })
    visibility.push(masks)
    return { camera: camera.name, routes: samples,
        cadence: { occupiedSamples: 0, longestEmptySeconds: 0 } }
})
// Reuse the actual scheduler to check visibility beyond the initial passes.
const traffic = new module.exports.default(new THREE.Group()), empty = views.map(() => 0)
const duration = 600, step = .1
for (let tick = 0; tick < duration / step; tick++) {
    traffic.update(step)
    views.forEach((view, i) => {
        const visible = traffic.flights.some(flight => flight.group.visible && flight.body.material.opacity > .2 &&
            visibility[i][flight.route][Math.round(flight.progress * 200)])
        if (visible) { view.cadence.occupiedSamples++; empty[i] = 0 }
        else { empty[i]++; view.cadence.longestEmptySeconds = Math.max(view.cadence.longestEmptySeconds, empty[i] * step) }
    })
}
views.forEach(view => {
    view.cadence.visiblePercent = +(view.cadence.occupiedSamples / (duration / step) * 100).toFixed(1)
    view.cadence.longestEmptySeconds = +view.cadence.longestEmptySeconds.toFixed(1)
})
console.log(JSON.stringify({ samplesPerRoute: 199, aspect: 2.4, views,
    simulation: { seconds: duration, stepSeconds: step, density: traffic.settings.density },
    limitations: 'Centre rays through original GLB, no pan; excludes sky/sun. Cadence uses the nearest 1/200 route sample and opacity > 0.2, so intervals are approximate. Does not measure apparent light size or perceived visibility.' }, null, 2))
