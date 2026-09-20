import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as TSL from 'three/tsl'
const require = createRequire(import.meta.url)
const { code } = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellBuildingLights.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
})
const module = { exports: {} }
const layout = { exports: {} }
const layoutCode = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellFacadeLayout.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
new Function('require', 'module', 'exports', layoutCode)(() => THREE, layout, layout.exports)
const rails = { exports: {} }
const railsCode = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellElevatorRails.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
new Function('require', 'module', 'exports', railsCode)(name => name === 'three' ? THREE : TSL, rails, rails.exports)
new Function('require', 'module', 'exports', code)(name => name === 'three' ? THREE : name === 'three/tsl' ? TSL : name === './TyrellElevatorRails' ? rails.exports : layout.exports, module, module.exports)
const BuildingLights = module.exports.default

test('Facade coordinates follow trapezoid sides and do not introduce a triangle-diagonal margin', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-20, 0, 0, 20, 0, 0, 12, 50, 0, -12, 50, 0], 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    const mesh = new THREE.Mesh(geometry)
    mesh.rotation.y = .3; mesh.position.set(-50, 0, -240); mesh.updateMatrixWorld(true)
    const result = layout.exports.facadeGeometry(mesh), panel = result.attributes.tyrellPanel
    assert.deepEqual([...panel.array].filter((_, i) => i % 4 === 0).map(value => Math.round(value)), [0, 40, 40, 0, 40, 0])
    assert.ok([...panel.array].filter((_, i) => i % 4 === 3).every(value => Math.abs(value - 50) < .001))
    assert.equal(geometry.index.count, 6)
    assert.equal(geometry.hasAttribute('tyrellPanel'), false)
    result.dispose(); geometry.dispose(); mesh.material.dispose()
})

test('Exterior emission isolates shared room materials, supports zero, and restores ownership', () => {
    const world = new THREE.Group(), material = new THREE.MeshStandardMaterial(), geometry = new THREE.BoxGeometry(60, 30, 60)
    const pyramid = new THREE.Mesh(geometry, material), room = new THREE.Mesh(geometry, material)
    pyramid.name = 'Tyrell_Corporation_Pyramid'; pyramid.position.set(0, 20, -250)
    world.add(pyramid, room)
    world.updateMatrixWorld(true)
    const originalBounds = new THREE.Box3().setFromObject(pyramid)
    const originalPositions = geometry.toNonIndexed().attributes.position.array.slice()
    const lights = new BuildingLights(world)
    assert.notEqual(pyramid.material, material)
    assert.equal(room.material, material)
    assert.equal(room.geometry, geometry, 'Shared room geometry must remain intact')
    assert.notEqual(pyramid.geometry, geometry)
    assert.ok([...pyramid.geometry.attributes.tyrellPanel.array].every(Number.isFinite))
    assert.ok(pyramid.material.emissiveNode)
    assert.ok(lights.beacons.length > 0)
    assert.deepEqual(pyramid.geometry.attributes.position.array, originalPositions, 'Rail finish must never move the authored surface')
    assert.ok(new THREE.Box3().setFromObject(pyramid).equals(originalBounds), 'Keep the original facade silhouette')
    assert.deepEqual(world.children.filter(object => !object.isSprite), [pyramid, room], 'No added rail or support volume')
    assert.ok(pyramid.material.colorNode && pyramid.material.normalNode, 'Rail finish lives on the original facade material')
    assert.equal(room.material.colorNode, undefined, 'Interior color must be unaffected')
    const railColor = pyramid.material.colorNode, railNormal = pyramid.material.normalNode
    assert.equal(new Set(lights.beacons.map(beacon => beacon.material.map)).size, 1)
    assert.ok(lights.beacons.every(beacon => beacon.isSprite && beacon.material.depthTest && !beacon.material.depthWrite))
    const glow = lights.beacons[0].material.map
    assert.equal(glow.image.data[3], 0, 'Halo must disappear before the texture edge')
    assert.ok(glow.image.data[(32 * 64 + 32) * 4 + 3] > 240, 'Keep a small bright centre')
    assert.ok(lights.beacons.every(beacon => beacon.position.z < -100 && beacon.position.y > 35))
    lights.configure({ intensity: 0, beacons: 0 })
    assert.equal(lights.strength.value, 0)
    assert.equal(pyramid.material.colorNode, railColor, 'Dark rail finish remains when the lights are off')
    assert.equal(pyramid.material.normalNode, railNormal)
    assert.ok(lights.beacons.every(beacon => !beacon.visible))
    lights.configure({ intensity: 2, beacons: 1 })
    assert.equal(lights.strength.value, 2)
    assert.ok(lights.beacons.some(beacon => beacon.visible))
    lights.update(.1)
    assert.equal(lights.beacons[0].visible, false)
    lights.configure({ intensity: NaN, beacons: -1 })
    assert.equal(lights.strength.value, 2)
    assert.ok(lights.beacons.every(beacon => !beacon.visible))
    lights.dispose()
    assert.equal(pyramid.material, material)
    assert.equal(pyramid.geometry, geometry)
    const geometries = new Set(), materials = new Set()
    world.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material) })
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose())
    glow.dispose()
})
