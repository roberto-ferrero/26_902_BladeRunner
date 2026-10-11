import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as WEBGPU from 'three/webgpu'
import * as TSL from 'three/tsl'
import * as utilities from 'three/addons/utils/BufferGeometryUtils.js'
const require = createRequire(import.meta.url)
const { code } = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellCity.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
})
const module = { exports: {} }
const roofModule = { exports: {} }
const roofCode = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellCityRoof.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
new Function('require', 'module', 'exports', roofCode)(() => THREE, roofModule, roofModule.exports)
new Function('require', 'module', 'exports', code)(name => name === 'three' ? THREE : name === 'three/webgpu' ? WEBGPU : name === 'three/tsl' ? TSL : name === './TyrellCityRoof' ? roofModule.exports : utilities, module, module.exports)
const City = module.exports.default
const { CITY_FINISH, cityBlockSteps, yawLuminance } = module.exports

test('City counts each row by its own module spacing', () => {
    const centre = CITY_FINISH.gradientCenterX
    for (const spacing of [27, 30, 40]) {
        assert.equal(cityBlockSteps(centre, spacing), 0)
        assert.equal(cityBlockSteps(centre + spacing * 4, spacing), 4)
        assert.equal(cityBlockSteps(centre - spacing * 4, spacing), -4)
    }
})

test('Yaw colour hits reference anchors, ignores pitch and obeys per-LOD switch', () => {
    const city = new City(new THREE.Group())
    const audit = JSON.parse(fs.readFileSync(new URL('../docs/phase9/9.0/geometry-audit.json', import.meta.url)))
    const cameras = audit.cameras.map(source => {
        const camera = new THREE.PerspectiveCamera()
        camera.name = source.name; camera.position.fromArray(source.position); camera.quaternion.fromArray(source.quaternion)
        camera.updateMatrixWorld(true); return camera
    })
    city.configureCameraReferences(cameras)
    for (const [pattern, expected] of [[/^Camera_D$/, 14], [/^CAM_02/, 14.6]]) {
        city.updateCamera(cameras.find(camera => pattern.test(camera.name)))
        assert.ok(Math.abs(city.lightness.value * 100 - expected) < 1e-6)
    }
    const camera = new THREE.PerspectiveCamera()
    for (const pitch of [-1, 0, 1]) {
        camera.rotation.set(pitch, -city.referenceYaw, 0, 'YXZ'); camera.updateMatrixWorld(true)
        city.updateCamera(camera)
        assert.ok(Math.abs(city.lightness.value * 100 - 18.8) < 1e-6)
    }
    city.setColorHSL({ lod: { Baja: false } }); city.setQuality('Baja')
    city.updateCamera(cameras.find(camera => camera.name === 'Camera_D'))
    assert.equal(city.lightness.value, .188)
    city.setQuality('Alta'); city.updateCamera(cameras.find(camera => camera.name === 'Camera_D'))
    assert.ok(Math.abs(city.lightness.value - .14) < 1e-6)
    city.setColorHSL({ cameraD: 12, rightStep: -.3, leftStep: -.4 })
    city.updateCamera(cameras.find(camera => camera.name === 'Camera_D'))
    assert.ok(Math.abs(city.lightness.value - .12) < 1e-6)
    assert.equal(city.slopes.value.x, -.003); assert.equal(city.slopes.value.y, -.004)
    const anchors = [[0, 18.8], [-1, 14.6], [1, 14]]
    assert.ok(Math.abs(yawLuminance(Math.PI - 1e-6, anchors) - yawLuminance(-Math.PI + 1e-6, anchors)) < 1e-5)
    city.group.children.forEach(mesh => mesh.geometry.dispose())
    city.materials.forEach(material => material.dispose()); city.texture.dispose()
})

test('City adds no context buildings or industrial stacks', () => {
    const world = new THREE.Group(), original = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    original.position.set(7, 3, -2); world.add(original)
    const city = new City(world)
    assert.deepEqual(original.position.toArray(), [7, 3, -2])
    assert.equal(city.group.children.length, 0)
    assert.equal(city.stats.buildings, 0)
    assert.deepEqual(city.stats.towers, [])
    city.setEnabled(false); assert.equal(city.group.visible, false); assert.equal(original.visible, true)
    city.materials.forEach(material => material.dispose()); city.texture.dispose()
    original.geometry.dispose(); original.material.dispose()
})
