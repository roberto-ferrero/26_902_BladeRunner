import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadCameraSource } from './load-camera-source.mjs'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/E26902_BladeRunner'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
class Controls extends OrbitControls {
    connect(element) { this.domElement = element }
    dispose() { this.disposed = true }
}
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(id => {
    if (id === 'three') return THREE
    if (id.includes('OrbitControls')) return { OrbitControls: Controls }
    if (['./TyrellCameraStates', './cameraStates.config'].includes(id)) return loadCameraSource(id + '.js')
    return {}
}, module, module.exports)
const Project = module.exports.default
function setup() {
    const camera = new THREE.PerspectiveCamera(35)
    camera.position.set(3, 8, 12)
    camera.rotation.set(.2, .3, .1)
    const project = Object.create(Project.prototype)
    Object.assign(project, {
        built: true, activeCameraIndex: 2,
        stageCamera: { get_camera: () => camera, cancelTransition() { this.transition = null }, transition: {} },
        navigation: { enabled: true, setEnabled(value) { this.enabled = value } },
        app: { dev: { hide_dev_camera() {} } }, renderer: { domElement: {} },
        pan: { settings: { targetDistance: 10 } }, resetMetrics() {},
        selectCamera(index) { this.stopDevelopmentCamera(); this.selected = index }
    })
    return { project, camera }
}
test('Development orbit starts at current pose and disables walking and camera transitions', () => {
    const { project, camera } = setup()
    const before = camera.clone()
    project.setDevelopmentCamera(true)
    assert.equal(project.navigation.enabled, false)
    assert.equal(project.stageCamera.transition, null)
    assert.ok(camera.position.distanceTo(before.position) < 1e-10)
    assert.ok(camera.quaternion.angleTo(before.quaternion) < 1e-7)
    assert.equal(project.developmentControls.maxDistance, Infinity)
    // Move freely below the floor: no collision/height correction is applied.
    camera.position.y -= 50
    project.developmentControls.target.y -= 50
    project.developmentControls.update()
    assert.ok(Math.abs(camera.position.y + 42) < 1e-8)
    project.stopDevelopmentCamera()
})
test('Repeated entry is idempotent; exiting releases controls and returns to selected camera', () => {
    const { project } = setup()
    project.setDevelopmentCamera(true)
    const controls = project.developmentControls
    project.setDevelopmentCamera(true)
    assert.equal(project.developmentControls, controls)
    project.setDevelopmentCamera(false)
    assert.equal(controls.disposed, true)
    assert.equal(project.developmentControls, null)
    assert.equal(project.selected, 2)
})
test('Entering walking mode releases orbit controls before enabling collision navigation', () => {
    const { project } = setup()
    project.setDevelopmentCamera(true)
    const controls = project.developmentControls
    project.setNavigation(true)
    assert.equal(controls.disposed, true)
    assert.equal(project.developmentControls, null)
    assert.equal(project.navigation.enabled, true)
})

test('Selecting an authored camera exits orbit and restores the normal transition', () => {
    const { project, camera } = setup()
    globalThis.window = { matchMedia: () => ({ matches: false }) }
    project.setDevelopmentCamera(true)
    const controls = project.developmentControls
    project.cameraStates = [{ cameraStateId: 'initial' }]
    project.transitionDuration = 1
    project.transitionEasing = 'linear'
    project.stageCamera.adoptCurrentView = () => {}
    project.stageCamera.setState = function(source, options) { this.baseCamera = source; this.transition = options }
    project.pan.setReference = source => { project.reference = source }
    project.pan.update = () => {}
    project.pan.setStateSettings = () => false
    project.app.render = { set_stageCamera() {} }
    Project.prototype.selectCamera.call(project, 0)
    assert.equal(controls.disposed, true)
    assert.equal(project.developmentControls, null)
    assert.equal(project.activeCameraIndex, 0)
    assert.equal(project.reference, project.cameraStates[0])
    assert.equal(project.stageCamera.transition.duration, 1)
})

test('V shares the device toggle with the GUI; numeric shortcuts respect input focus and modifiers', () => {
    const { project } = setup()
    let toggles = 0, states = [], selected = []
    project.revealed = true
    project.disposed = false
    project.ui = { dialog: { open: false }, setVKState: state => states.push(state) }
    project.vk = { motion: { state: 'closed' }, toggle() { toggles++; this.motion.state = this.motion.state === 'closed' ? 'open' : 'closed'; return true } }
    project.cameraStates = [{ cameraStateId: 'initial', key: '0' }, { cameraStateId: 'p1', key: '1' }]
    project.selectCameraState = id => selected.push(id)
    const press = (key, extras = {}) => {
        const event = { key, preventDefault() { this.prevented = true }, ...extras }
        project.handleShortcut(event)
        return event.prevented === true
    }
    assert.equal(press('v'), true)
    assert.equal(press('V'), true)
    assert.deepEqual(states, ['open', 'closed']); assert.equal(toggles, 2)
    assert.equal(press('1'), true); assert.deepEqual(selected, ['p1'])
    assert.equal(press('2'), false)
    assert.equal(press('v', { repeat: true }), false)
    assert.equal(press('v', { target: { closest: () => ({}) } }), false)
    assert.equal(press('1', { ctrlKey: true }), false)
    assert.equal(toggles, 2); assert.deepEqual(selected, ['p1'])
})
