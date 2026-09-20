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

test('City keeps room and original architecture intact, shares resources and stays deterministic', () => {
    const world = new THREE.Group(), original = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    original.position.set(7, 3, -2); world.add(original)
    const city = new City(world), other = new City(new THREE.Group())
    assert.deepEqual(original.position.toArray(), [7, 3, -2])
    assert.equal(city.group.children.length, 3)
    assert.ok(city.stats.triangles < 40000, 'Limit added geometry and pass cost')
    assert.equal(new Set(city.group.children.map(mesh => mesh.material.map)).size, 1)
    const audit = JSON.parse(fs.readFileSync(new URL('../docs/phase9/9.0/geometry-audit.json', import.meta.url)))
    const source = audit.cameras.find(camera => camera.name.startsWith('CAM_01'))
    const camera = new THREE.PerspectiveCamera(source.fov, 2.4, source.near, source.far)
    const target = new THREE.Vector3(...source.position).add(new THREE.Vector3(0, 0, -20))
    for (let x = 0; x <= 40; x++) for (let y = 0; y <= 10; y++) {
        camera.position.fromArray(source.position).add(new THREE.Vector3(-2 + x * .1, -.5 + y * .1, 0))
        camera.lookAt(target); camera.updateMatrixWorld(true)
        const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4()
            .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
        for (const tower of city.stats.towers) {
            const reserved = new THREE.Box3(new THREE.Vector3(tower.x - 20, -88, tower.z - 20),
                new THREE.Vector3(tower.x + 20, tower.top + 25, tower.z + 20))
            assert.equal(frustum.intersectsBox(reserved), false, 'Keep towers and reserved flame envelope outside CAM01 pan')
        }
    }
    city.group.children.forEach((mesh, i) => {
        mesh.geometry.computeBoundingBox()
        assert.ok(mesh.geometry.boundingBox.max.z < -100, 'No city geometry enters the room')
        assert.equal(mesh.castShadow, false)
        assert.equal(mesh.material.emissive.getHex(), 0, 'Lighting is reserved for 9.2')
        assert.deepEqual(mesh.geometry.attributes.position.array, other.group.children[i].geometry.attributes.position.array)
        assert.ok([...mesh.geometry.attributes.uv.array].every(Number.isFinite))
    })
    city.setEnabled(false); assert.equal(city.group.visible, false); assert.equal(original.visible, true)
    for (const instance of [city, other]) {
        instance.group.children.forEach(mesh => mesh.geometry.dispose())
        instance.materials.forEach(material => material.dispose()); instance.texture.dispose()
    }
    original.geometry.dispose(); original.material.dispose()
})
