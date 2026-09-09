import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as GPU from 'three/webgpu'
import * as TSL from 'three/tsl'
import { loadGeometry } from '../scripts/audit-contacts.mjs'
const require = createRequire(import.meta.url)
const updateCode = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellReflectionUpdates.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const updatesModule = { exports: {} }
new Function('require', 'module', 'exports', updateCode)(() => THREE, updatesModule, updatesModule.exports)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellFloorReflection.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }
new Function('require', 'module', 'exports', code)(key => ({ three: THREE, 'three/webgpu': GPU, 'three/tsl': TSL,
    './TyrellReflectionUpdates': updatesModule.exports })[key], m, m.exports)

test('Floor reflector shares one material, keeps maps/geometry and restores ownership on disposal', async () => {
    const scene = await loadGeometry(), before = []
    scene.traverse(o => { if (o.isMesh) before.push({ o, material: o.material, geometry: o.geometry }) })
    const reflection = new m.exports.default(scene)
    scene.updateMatrixWorld(true)
    assert.equal(reflection.materials.size, 1)
    assert.ok(reflection.meshes.length > 10)
    assert.ok(new THREE.Vector3(0, 0, 1).transformDirection(reflection.target.matrixWorld).distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-8)
    for (const { o, material, geometry } of before) {
        assert.equal(o.geometry, geometry)
        if (!o.name.startsWith('Pavimento_')) assert.equal(o.material, material)
        else {
            for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'roughness', 'metalness']) assert.equal(o.material[key], material[key])
            assert.ok(o.material.color.equals(material.color))
        }
    }
    for (let i = 0; i < 5; i++) {
        reflection.setEnabled(true)
        reflection.setMode('prototype')
        for (const material of reflection.materials.values()) assert.equal(material.emissiveNode, reflection.contribution)
        reflection.setMode('stone')
        for (const material of reflection.materials.values()) assert.equal(material.emissiveNode, reflection.stoneContribution)
        reflection.setMode('invalid'); assert.equal(reflection.mode, 'stone')
        reflection.setEnabled(false)
    }
    assert.equal(reflection.node.reflector.generateMipmaps, true)
    // Exercise the installed ReflectorNode's camera math for all ten authored views, without a GPU.
    const cameras = []; scene.traverse(o => { if (o.isPerspectiveCamera) cameras.push(o) })
    assert.equal(cameras.length, 10)
    const renderer = { coordinateSystem: THREE.WebGPUCoordinateSystem, autoClear: true,
        getDrawingBufferSize: v => v.set(893, 372), getRenderTarget: () => null, getMRT: () => null,
        setMRT() {}, setRenderTarget() {}, clear() {}, render() {} }
    for (const source of cameras) {
        const camera = source.clone(false)
        camera.position.copy(source.getWorldPosition(new THREE.Vector3()))
        camera.quaternion.copy(source.getWorldQuaternion(new THREE.Quaternion()))
        camera.updateMatrixWorld(true)
        const material = [...reflection.materials.values()][0]
        reflection.node.reflector.updateBefore({ camera, scene, renderer, material })
        const reflectedCamera = reflection.node.reflector.getVirtualCamera(camera)
        assert.ok(Math.abs(reflectedCamera.position.y + camera.position.y) < 1e-5)
        assert.ok(Math.abs(reflectedCamera.position.x - camera.position.x) < 1e-5)
        assert.ok(Math.abs(reflectedCamera.position.z - camera.position.z) < 1e-5)
        assert.equal(material.visible, true)
    }
    reflection.setResolution('auto', 'Baja'); assert.equal(reflection.node.reflector.resolutionScale, .25)
    assert.equal(reflection.lodOffset.value, -1)
    reflection.setResolution('1'); assert.equal(reflection.node.reflector.resolutionScale, 1)
    assert.equal(reflection.lodOffset.value, 1)
    assert.equal(reflection.diagnostics().targets.length, 10)
    for (const material of reflection.materials.values()) assert.equal(material.emissiveNode, null)
    const material = [...reflection.materials.values()][0]; let disposed = 0
    material.addEventListener('dispose', () => disposed++)
    reflection.dispose()
    assert.equal(disposed, 1)
    for (const { o, material } of before) assert.equal(o.material, material)
})

test('Adaptive reflection refreshes movement/lens/size/scene and rebinds the correct cached camera', () => {
    const a = new THREE.PerspectiveCamera(), b = a.clone(), targets = new Map()
    const base = { resolutionScale: .5, getVirtualCamera: camera => camera,
        getRenderTarget: camera => { if (!targets.has(camera)) targets.set(camera, { texture: {} }); return targets.get(camera) } }
    const node = { reflector: base }, original = frame => { node.value = base.getRenderTarget(frame.camera).texture; base.hasOutput = true }
    base.updateBefore = original
    const updates = new updatesModule.exports.default(node)
    let width = 100
    const frame = { camera: a, renderer: { getDrawingBufferSize: v => v.set(width, 50) } }
    base.updateBefore(frame); const textureA = node.value
    base.updateBefore(frame); assert.equal(updates.rendered, 1); assert.equal(updates.reused, 1)
    a.position.x = 1; a.updateMatrixWorld(); base.updateBefore(frame); assert.equal(updates.rendered, 2)
    a.fov = 20; a.updateProjectionMatrix(); base.updateBefore(frame); assert.equal(updates.rendered, 3)
    width = 200; base.updateBefore(frame); assert.equal(updates.rendered, 4)
    updates.invalidate(); base.updateBefore(frame); assert.equal(updates.rendered, 5)
    frame.camera = b; base.updateBefore(frame); assert.notEqual(node.value, textureA)
    frame.camera = a; base.updateBefore(frame); assert.equal(node.value, textureA); assert.equal(updates.rendered, 6)
    updates.setMode('always'); base.updateBefore(frame); base.updateBefore(frame); assert.equal(updates.rendered, 8)
    updates.dispose(); assert.equal(base.updateBefore, original)
})

test('Adaptive cache keeps the outer camera when nested rendering mutates NodeFrame', () => {
    const camera = new THREE.PerspectiveCamera(), virtual = camera.clone(), texture = {}
    const base = { resolutionScale: .5, getVirtualCamera: c => c, getRenderTarget: () => ({ texture }),
        updateBefore: frame => { frame.camera = virtual; base.hasOutput = true } }
    const node = { reflector: base }, updates = new updatesModule.exports.default(node)
    const frame = { camera, renderer: { getDrawingBufferSize: v => v.set(100, 50) } }
    base.updateBefore(frame)
    frame.camera = camera
    base.updateBefore(frame)
    assert.equal(updates.rendered, 1); assert.equal(updates.reused, 1); assert.equal(node.value, texture)
    updates.dispose()
})
