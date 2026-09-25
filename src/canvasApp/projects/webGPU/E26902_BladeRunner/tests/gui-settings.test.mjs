import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { loadCameraSource } from './load-camera-source.mjs'
const { GUI_BINDINGS, flattenSettings, prepareGUISettings, applyGUISettings } = loadCameraSource('TyrellGUISettings.js')
const initial = JSON.parse(fs.readFileSync('static/config/E26902_BladeRunner/gui.initial.json', 'utf8'))
function fixture() {
    const values = flattenSettings(initial), calls = []
    const controls = new Map(GUI_BINDINGS.map(([path, label]) => {
        const value = values[path]
        const control = { type: typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'range' : 'select-one', tagName: typeof value === 'string' ? 'SELECT' : 'INPUT', min: '', max: '', options: [{ value }], value: '', checked: false }
        control.onchange = event => calls.push([path, event.target.type === 'checkbox' ? event.target.checked : event.target.value])
        return [`[aria-label="${label}"]`, control]
    }))
    return { root: { querySelector: selector => controls.get(selector) }, controls, calls }
}
const cameras = [{ cameraStateId: 'initial' }, { cameraStateId: 'p1' }, { cameraStateId: 'p2' }]
test('Startup configuration covers each binding and applies falsy values through the UI actions', () => {
    const { root, calls } = fixture(), settings = structuredClone(initial)
    settings.atmosphere.dust.enabled = false
    settings.city.distantTraffic.densityPercent = 0
    const prepared = prepareGUISettings(root, settings, cameras)
    assert.equal(calls.length, 0)
    applyGUISettings(prepared)
    assert.equal(calls.length, GUI_BINDINGS.length)
    assert.deepEqual(calls.find(([path]) => path === 'atmosphere.dust.enabled'), ['atmosphere.dust.enabled', false])
    assert.deepEqual(calls.find(([path]) => path === 'city.distantTraffic.densityPercent'), ['city.distantTraffic.densityPercent', '0'])
})
test('Invalid, incomplete and unknown settings fail before any scene mutation', () => {
    for (const mutate of [
        c => { c.schemaVersion = 2 }, c => { c.camera.initialState = 'missing' },
        c => { c.sky.heightPercent = '50' }, c => { delete c.sky.enabled },
        c => { c.sky.heigthPercent = 50 }, c => { c.viewer.quality = 'Ultra' },
        c => { c.sky.heightPercent = NaN }, c => { c.sky = [] }
    ]) {
        const { root, calls } = fixture(), settings = structuredClone(initial)
        mutate(settings)
        assert.throws(() => prepareGUISettings(root, settings, cameras))
        assert.equal(calls.length, 0)
    }
})
test('Numeric settings outside the control range are rejected instead of silently clamped', () => {
    const { root, controls } = fixture()
    controls.get('[aria-label="Altura del cielo"]').max = '200'
    const settings = structuredClone(initial)
    settings.sky.heightPercent = 201
    assert.throws(() => prepareGUISettings(root, settings, cameras), /sky.heightPercent/)
})

test('Numbers between valid slider steps fail instead of being rounded by the browser', () => {
    const { root, controls } = fixture()
    Object.assign(controls.get('[aria-label="Altura del cielo"]'), { min: '10', max: '200', step: '1' })
    const settings = structuredClone(initial)
    settings.sky.heightPercent = 50.5
    assert.throws(() => prepareGUISettings(root, settings, cameras), /paso/)
})
test('Legacy schema 1 preserves manual quality and inherits new orientation flags', () => {
    const { root, controls, calls } = fixture(), settings = structuredClone(initial)
    delete settings.viewer.deviceMode
    delete settings.glassware
    settings.viewer.quality = 'Baja'
    controls.get('[aria-label="Calidad"]').options.push({ value: 'Baja' })
    delete settings.city.buildings.orientationColor.extraLowQualityEnabled
    delete settings.city.buildings.orientationColor.ultraHighQualityEnabled
    settings.city.buildings.orientationColor.lowQualityEnabled = false
    applyGUISettings(prepareGUISettings(root, settings, cameras))
    assert.deepEqual(calls.find(([path]) => path === 'viewer.deviceMode'), ['viewer.deviceMode', 'auto'])
    assert.deepEqual(calls.find(([path]) => path === 'glassware.bottleHeightScale'), ['glassware.bottleHeightScale', '1.2'])
    assert.deepEqual(calls.find(([path]) => path === 'viewer.quality'), ['viewer.quality', 'Baja'])
    assert.deepEqual(calls.find(([path]) => path.endsWith('extraLowQualityEnabled')), ['city.buildings.orientationColor.extraLowQualityEnabled', false])
})

test('Glass color and optical properties are validated before touching the scene', () => {
    for (const [key, value] of [['color', 'red'], ['transmission', 1.1], ['ior', .9], ['bottleHeightScale', 0]]) {
        const { root, controls, calls } = fixture(), settings = structuredClone(initial)
        Object.assign(controls.get('[aria-label="Color base del cristal"]'), { type: 'color', tagName: 'INPUT' })
        Object.assign(controls.get('[aria-label="Transparencia del cristal"]'), { min: '0', max: '1', step: '.005' })
        Object.assign(controls.get('[aria-label="Índice de refracción del cristal"]'), { min: '1', max: '2.5', step: '.01' })
        Object.assign(controls.get('[aria-label="Altura de la botella"]'), { min: '.5', max: '2', step: '.05' })
        settings.glassware[key] = value
        assert.throws(() => prepareGUISettings(root, settings, cameras), /glassware/)
        assert.equal(calls.length, 0)
    }
})

test('Starting in p1 initializes its effective pan instead of overwriting it with default', () => {
    const { root, calls } = fixture(), settings = structuredClone(initial)
    settings.camera.initialState = 'p1'
    applyGUISettings(prepareGUISettings(root, settings, cameras))
    assert.deepEqual(calls.find(([path]) => path === 'camera.mousePan.default.horizontalTravelMeters'), ['camera.mousePan.default.horizontalTravelMeters', '0.5'])
    assert.deepEqual(calls.find(([path]) => path === 'camera.mousePan.default.verticalTravelMeters'), ['camera.mousePan.default.verticalTravelMeters', '0.2'])
    assert.equal(settings.camera.mousePan.default.horizontalTravelMeters, 2)
})

test('State key bindings validate IDs, digit types and uniqueness before applying GUI settings', () => {
    const { root, calls } = fixture(), valid = structuredClone(initial)
    valid.camera.stateKeys.p2 = '2'
    assert.equal(prepareGUISettings(root, valid, cameras).length, GUI_BINDINGS.length)
    for (const mutate of [
        c => { c.camera.stateKeys.missing = '2' },
        c => { c.camera.stateKeys.p2 = '1' },
        c => { c.camera.stateKeys.p2 = 'v' },
        c => { c.camera.stateKeys.p2 = 2 },
        c => { c.camera.stateKeys.p2 = '10' },
        c => { delete c.camera.stateKeys },
        c => { c.camera.stateKeys = [] }
    ]) {
        const settings = structuredClone(initial)
        mutate(settings)
        assert.throws(() => prepareGUISettings(root, settings, cameras), /stateKeys/)
        assert.equal(calls.length, 0)
    }
})

test('State pan overrides reject unknown IDs, fields, types and invalid slider values before applying anything', () => {
    for (const mutate of [
        c => { c.camera.mousePan.states.missing = {} },
        c => { c.camera.mousePan.states.p1.horizontalTravelMetres = .5 },
        c => { c.camera.mousePan.states.p1.horizontalTravelMeters = '0.5' },
        c => { c.camera.mousePan.states.p1.horizontalTravelMeters = -.5 },
        c => { c.camera.mousePan.states.p1.horizontalTravelMeters = 3 },
        c => { c.camera.mousePan.states.p1.horizontalTravelMeters = .005 },
        c => { c.camera.mousePan.states.p1 = null }
    ]) {
        const { root, controls, calls } = fixture(), settings = structuredClone(initial)
        Object.assign(controls.get('[aria-label="Recorrido horizontal"]'), { min: '0', max: '2', step: '.01' })
        mutate(settings)
        assert.throws(() => prepareGUISettings(root, settings, cameras))
        assert.equal(calls.length, 0)
    }
})
