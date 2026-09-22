import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const source = fs.readFileSync(new URL('../TyrellGUISettings.js', import.meta.url), 'utf8')
const { GUI_BINDINGS, flattenSettings, prepareGUISettings, applyGUISettings } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
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
const cameras = [{ cameraStateId: 'initial' }, { cameraStateId: 'p1' }]
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
