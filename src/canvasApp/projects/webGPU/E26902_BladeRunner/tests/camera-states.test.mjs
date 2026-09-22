import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { loadCameraSource } from './load-camera-source.mjs'

const Rig = loadCameraSource('TyrellCameraRig.js').default
const Pan = loadCameraSource('TyrellCameraPan.js').default
const { createCameraStates, cameraStateForKey, cameraTransition, cameraStatePan } = loadCameraSource('TyrellCameraStates.js')
const { CAMERA_STATES } = loadCameraSource('cameraStates.config.js')
const exported = loadCameraSource('cameraStates.generated.json')
const a = { cameraStateId: 'a', position: [0, 2, 10], target: [0, 1, 0], fov: 30, near: .03, far: 2500, viewOffset: { x: 0, y: 0 } }
const b = { cameraStateId: 'b', position: [8, 6, -10], target: [-5, 4, -30], fov: 60, near: .1, far: 1000, viewOffset: { x: .2, y: -.1 } }
const linear = { duration: 1, easing: 'linear' }
function setup() {
    const app = { size: { CURRENT: { aspect: 2.4 } }, emitter: { on() {}, off() {} } }
    const rig = new Rig(app)
    rig.setState(a)
    const pan = new Pan(rig.camera, { enabled: true, horizontal: .5, vertical: .2, smoothness: .2, targetDistance: 20 })
    function frame(seconds) {
        rig.update(seconds)
        pan.setReference(rig.baseCamera, { preservePointer: true, target: rig.target })
        pan.setStateSettings(rig.mousePan)
        pan.update(seconds)
    }
    frame(0)
    return { rig, pan, frame, app }
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
const vector = (actual, expected) => assert.ok(actual.distanceTo(new THREE.Vector3(...expected)) < 1e-8)

test('Actual Blender export loads initial and p1; manual settings remain separate and new states need no key', () => {
    const states = createCameraStates(exported, CAMERA_STATES)
    assert.equal(cameraStateForKey(states, '0').cameraStateId, 'initial')
    assert.equal(cameraStateForKey(states, '1').cameraStateId, 'p1')
    assert.equal(cameraStateForKey(states, '9'), undefined)
    assert.equal(states.find(s => s.cameraStateId === 'p1').cameraTarget, 'cameratarget-p1')
    const doc = structuredClone(exported)
    doc.cameraStates.push({ ...a, cameraStateId: 'new' })
    const added = createCameraStates(doc, CAMERA_STATES).at(-1)
    assert.equal(added.key, null); assert.deepEqual(added.viewOffset, { x: 0, y: 0 })
    const settings = structuredClone(CAMERA_STATES)
    settings.states.p1.viewOffset = { x: .1 }
    settings.transitions = { 'initial->p1': { duration: 2, easing: 'linear' } }
    assert.deepEqual(createCameraStates(exported, settings)[1].viewOffset, { x: .1, y: 0 })
    assert.deepEqual(cameraTransition(settings.transition, settings.transitions['initial->p1']), { duration: 2, easing: 'linear' })
})

test('Malformed states, duplicate keys and invalid transition settings are rejected', () => {
    const bad = mutate => { const doc = structuredClone(exported), settings = structuredClone(CAMERA_STATES); mutate(doc, settings); assert.throws(() => createCameraStates(doc, settings)) }
    bad(doc => { doc.cameraStates[1].cameraStateId = 'INITIAL' })
    bad(doc => { doc.cameraStates[0].target = doc.cameraStates[0].position })
    bad(doc => { doc.cameraStates[0].fov = NaN })
    bad((doc, settings) => { settings.states.p1.key = 0 })
    bad((doc, settings) => { settings.states.p1.viewOffset.x = Infinity })
    bad((doc, settings) => { settings.transitions = { 'missing->p1': { duration: 2 } } })
    assert.throws(() => cameraTransition({ duration: -1, easing: 'linear' }))
    assert.throws(() => cameraTransition({ duration: 1, easing: 'unknown' }))
})

test('Position, target, vertical FOV and both offset axes interpolate independently', () => {
    const { rig, frame } = setup(), identity = rig.camera
    rig.setState(b, linear)
    for (let i = 0; i < 5; i++) frame(.1)
    vector(rig.baseCamera.position, [4, 4, 0]); vector(rig.target, [-2.5, 2.5, -15])
    near(rig.camera.fov, 45); near(rig.viewOffset.x, .1); near(rig.viewOffset.y, -.05)
    const direction = rig.target.clone().sub(rig.baseCamera.position).normalize()
    assert.ok(rig.baseCamera.getWorldDirection(new THREE.Vector3()).distanceTo(direction) < 1e-8)
    for (let i = 0; i < 6; i++) frame(.1)
    assert.equal(rig.camera, identity); assert.equal(rig.transition, null)
    vector(rig.camera.position, b.position); vector(rig.target, b.target)
    assert.deepEqual(rig.viewOffset, b.viewOffset)
})

test('Interrupting while panning preserves the displayed pose, target, lens, offsets and pointer', () => {
    const { rig, pan, frame } = setup()
    pan.setPointer(.8, -.5)
    rig.setState(b, linear)
    for (let i = 0; i < 4; i++) frame(.1)
    const position = rig.camera.position.clone(), orientation = rig.camera.quaternion.clone()
    const target = rig.target.clone(), fov = rig.camera.fov, offset = { ...rig.viewOffset }, panOffset = pan.offset.clone()
    rig.setState(a, { duration: .6, easing: 'easeInOutCubic' }); frame(0)
    assert.ok(rig.camera.position.distanceTo(position) < 1e-8)
    assert.ok(rig.camera.quaternion.angleTo(orientation) < 1e-7)
    assert.ok(rig.target.equals(target)); assert.equal(rig.camera.fov, fov)
    assert.deepEqual(rig.viewOffset, offset); assert.ok(pan.offset.equals(panOffset))
    assert.deepEqual(pan.pointer.toArray(), [.8, -.5])
    pan.setPointer(-1, 1); frame(.1)
    assert.ok(!pan.offset.equals(panOffset))
    for (let i = 0; i < 8; i++) frame(.1)
    vector(rig.baseCamera.position, a.position)
    assert.ok(rig.camera.position.distanceTo(rig.baseCamera.position) > .1)
    pan.configure({ enabled: false })
    vector(rig.camera.position, a.position)
})

test('Normalized viewOffset shifts projection without rotating the camera and survives resize and captures', () => {
    const { rig, app, frame } = setup()
    const rotation = rig.camera.quaternion.clone()
    const point = new THREE.Vector3(...a.target)
    rig.setState({ ...a, viewOffset: { x: .2, y: -.1 } }); frame(0)
    near(point.clone().project(rig.camera).x, -.4)
    near(point.clone().project(rig.camera).y, -.2)
    assert.ok(rig.camera.quaternion.angleTo(rotation) < 1e-7)
    app.size.CURRENT.aspect = .7; rig.resize(); frame(0)
    assert.equal(rig.camera.aspect, .7)
    near(point.clone().project(rig.camera).x, -.4)
    const capture = rig.camera.clone(false)
    capture.aspect = 2.4; capture.updateProjectionMatrix()
    near(point.clone().project(capture).x, -.4)
    near(point.clone().project(capture).y, -.2)
    rig.setState(a); frame(0)
    near(point.clone().project(rig.camera).x, 0); near(point.clone().project(rig.camera).y, 0)
})

test('Easing and zero-duration transitions are honored; a coincident interpolated target remains finite', () => {
    const { rig, frame } = setup()
    rig.setState(b, { duration: 1, easing: 'easeInOutCubic' })
    frame(.1); frame(.1); frame(.05)
    near(rig.baseCamera.position.x, .5)
    rig.setState(a, { duration: 0, easing: 'linear' }); frame(0)
    vector(rig.camera.position, a.position); assert.equal(rig.transition, null)
    rig.setState({ ...a, position: a.target, target: a.position }, linear)
    for (let i = 0; i < 5; i++) frame(.1)
    assert.ok(rig.camera.matrixWorld.elements.every(Number.isFinite))
})

test('Configured duration measures elapsed seconds even on slow frames', () => {
    const { rig, frame } = setup()
    rig.setState(b, linear)
    frame(.6); near(rig.camera.fov, 48)
    frame(.4); assert.equal(rig.transition, null); vector(rig.camera.position, b.position)
})

test('Each cameraState owns pan defaults; p1 overrides only its horizontal range from gui.initial.json', () => {
    const config = JSON.parse(fs.readFileSync('static/config/E26902_BladeRunner/gui.initial.json', 'utf8')).camera.mousePan
    const initial = cameraStatePan(config, 'initial'), p1 = cameraStatePan(config, 'p1')
    assert.equal(initial.horizontal, 2); assert.equal(p1.horizontal, .5)
    for (const key of ['enabled', 'vertical', 'smoothness']) assert.equal(initial[key], p1[key])
    assert.deepEqual(cameraStatePan(config, 'newState'), initial)
    const states = createCameraStates(exported, CAMERA_STATES)
    states[0].mousePan.horizontal = .3
    assert.equal(states[1].mousePan.horizontal, 2)
    assert.equal(cameraStatePan({ default: config.default, states: { p1: { horizontalTravelMeters: 0, enabled: false } } }, 'p1').horizontal, 0)
})

test('Pan range follows travelling easing at fixed pointer, interrupts continuously and returns to default', () => {
    const { rig, pan, frame } = setup()
    const initial = { ...a, mousePan: { horizontal: 2, vertical: .5, smoothness: 0, enabled: true } }
    const p1 = { ...b, mousePan: { horizontal: .5, vertical: .5, smoothness: 0, enabled: true } }
    rig.setState(initial); pan.setPointer(1, 1); frame(0)
    near(pan.offset.x, -2)
    rig.setState(p1, { duration: 1, easing: 'smoothstep' }); frame(.25)
    near(rig.mousePan.horizontal, 2 + (.5 - 2) * .15625)
    near(pan.offset.x, -rig.mousePan.horizontal); near(pan.offset.y, .5)
    frame(.25); near(pan.settings.horizontal, 1.25); near(pan.offset.x, -1.25)
    const position = rig.camera.position.clone(), range = rig.mousePan.horizontal
    rig.setState(initial, linear); frame(0)
    near(rig.mousePan.horizontal, range)
    assert.ok(rig.camera.position.distanceTo(position) < 1e-8)
    frame(1); near(pan.offset.x, -2)
    rig.setState(p1, { duration: 0, easing: 'linear' }); frame(0)
    near(pan.settings.horizontal, .5); near(pan.offset.x, -.5)
})

test('Smoothed pointer stays independent of changing ranges, including a zero range', () => {
    const { rig, pan, frame } = setup()
    rig.setState({ ...a, mousePan: { horizontal: 2, vertical: .5, smoothness: 1.4 } })
    pan.setPointer(1, -1); frame(.1)
    const normalized = pan.smoothedPointer.clone()
    rig.setState({ ...b, mousePan: { horizontal: 0, vertical: 0, smoothness: .2 } }, linear)
    frame(.5)
    near(pan.settings.horizontal, 1); near(pan.settings.smoothness, .8)
    assert.ok(pan.smoothedPointer.x < normalized.x)
    assert.ok(Math.abs(pan.offset.x) <= pan.settings.horizontal)
    frame(.5); near(pan.offset.length(), 0)
    const pointer = pan.smoothedPointer.clone()
    rig.setState({ ...a, mousePan: { horizontal: 2, vertical: .5, smoothness: .2 } })
    frame(0)
    assert.ok(pan.smoothedPointer.equals(pointer)); near(pan.offset.x, pointer.x * 2)
})

test('Disabled destination fades the range to zero without clearing the pointer during travelling', () => {
    const { rig, pan, frame } = setup()
    rig.setState({ ...a, mousePan: { horizontal: 2, smoothness: 0, enabled: true } })
    pan.setPointer(1, 0); frame(0)
    rig.setState({ ...b, mousePan: { horizontal: 2, smoothness: 0, enabled: false } }, linear)
    frame(.5); near(pan.offset.x, -1); assert.equal(pan.settings.enabled, true)
    frame(.5); near(pan.offset.x, 0); assert.equal(pan.settings.enabled, false)
    assert.equal(pan.pointer.x, 1)
})

test('GUI pan edit survives travelling completion without changing the position animation', () => {
    const { rig, frame } = setup()
    rig.setState({ ...b, mousePan: { horizontal: .5 } }, linear)
    frame(.5); const position = rig.baseCamera.position.clone()
    rig.configurePan({ horizontal: .8 })
    frame(0); assert.ok(rig.baseCamera.position.equals(position)); near(rig.mousePan.horizontal, .8)
    frame(.5); near(rig.mousePan.horizontal, .8); vector(rig.baseCamera.position, b.position)
})
