import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { loadCameraSource } from './load-camera-source.mjs'
const { PYRAMID_CONTROLS, PYRAMID_GROUPS } = loadCameraSource('TyrellPyramidSettings.js')
const { GUI_BINDINGS } = loadCameraSource('TyrellGUISettings.js')
const initial = JSON.parse(fs.readFileSync('static/config/E26902_BladeRunner/gui.initial.json', 'utf8'))

test('Pyramid panel: three groups with unique labels, all bound to the configuration API', () => {
    assert.deepEqual(PYRAMID_GROUPS.map(({ group }) => group), ['towerWindows', 'faceWindows', 'elevators'])
    const labels = GUI_BINDINGS.map(([, label]) => label)
    assert.equal(new Set(labels).size, labels.length, 'aria-labels must be unique across the whole UI')
    for (const { path, label } of PYRAMID_CONTROLS) assert.ok(GUI_BINDINGS.some(([p, l]) => p === path && l === label), path)
})

test('Pyramid defaults are published in gui.initial.json and respect each control range and step', () => {
    for (const { group, key, type, value, min, max, step } of PYRAMID_CONTROLS) {
        assert.equal(initial.pyramid[group][key], value, `${group}.${key}`)
        if (type === 'color') assert.match(value, /^#[0-9a-f]{6}$/i)
        else if (type === 'checkbox') assert.equal(typeof value, 'boolean')
        else {
            assert.ok(value >= min && value <= max, `${group}.${key} in range`)
            const steps = (value - min) / step
            assert.ok(Math.abs(steps - Math.round(steps)) < 1e-7, `${group}.${key} on step`)
        }
    }
})
