// Phase 6 checks: the post-processing settings and where each of them came from.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const babel = require('@babel/core')
const root = path.resolve('src/canvasApp/projects/webGPU/E26902_BladeRunner')
function load(file, imports = {}) {
    const result = babel.transformSync(fs.readFileSync(file, 'utf8'), {
        filename: file, configFile: false, babelrc: false,
        plugins: ['@babel/plugin-transform-modules-commonjs']
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', result.code)(key => {
        if (!(key in imports)) throw new Error('Unexpected import: ' + key)
        return imports[key]
    }, module, module.exports)
    return module.exports
}
const { TYRELL } = load(path.join(root, 'config.js'))
const capture = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase6/fase6-cam01-comparacion.json'), 'utf8'))

test('The bloom keeps Blender numbers where they transfer and a measured one where they do not', () => {
    // Blender's Fog Glow: threshold 1,2 and size 0,72 act on the same linear render, so they
    // carry across unchanged.
    assert.equal(TYRELL.post.bloom.threshold, 1.2)
    assert.equal(TYRELL.post.bloom.radius, 0.72)
    // Its strength does not: Blender's glare mixes and Three's bloom adds. Sweeping it against
    // the reference put the minimum at 0,3, so copying Blender's 0,6 would have been wrong.
    assert.equal(TYRELL.post.bloom.strength, 0.3)
    assert.notEqual(TYRELL.post.bloom.strength, 0.6)
})

test('The dust keeps the colour Blender authored', () => {
    // Principled Volume in the master: colour (0,66, 0,61, 0,47), density 0,005.
    assert.deepEqual(TYRELL.post.beams.color, [0.66, 0.61, 0.47])
    assert.ok(TYRELL.post.beams.resolutionScale <= 0.5, 'los haces se trazan a media resolución')
})

test('The two atmospheres stay separated, which is the point of the first item', () => {
    // The room ends around 16 m and the pyramid sits at 269 m, so the exterior haze must not
    // start until well past the walls.
    assert.ok(TYRELL.post.aerial.startMetres >= 40, `empieza a ${TYRELL.post.aerial.startMetres} m`)
    assert.ok(TYRELL.post.aerial.fullMetres > TYRELL.post.aerial.startMetres)
    // Aimed at the sky's own measured linear colour, so hazing the sky is close to a no-op and
    // only the darker distant geometry lifts toward it.
    const [r, g, b] = TYRELL.post.aerial.color
    assert.ok(r > g && g > b, 'el color de la bruma debe ser cálido como el cielo')
    assert.ok(0.2126 * r + 0.7152 * g + 0.0722 * b < 0.2, 'no debe ser más brillante que el cielo')
})

test('Every effect can be switched off on its own, and the viewer records which are on', () => {
    const post = capture.post
    assert.ok(post, 'el diagnóstico debe registrar la tubería')
    assert.deepEqual(Object.keys(post.effects).sort(), ['bloom', 'bruma', 'haces'])
    for (const [name, on] of Object.entries(post.effects)) {
        assert.equal(typeof on, 'boolean', `${name} debe registrar su estado`)
    }
    // The pipeline must keep applying the renderer's own tone mapping, or phase 3 would need
    // recalibrating.
    assert.equal(post.outputColorTransform, true)
})

test('The shipped frame really went through the pipeline', () => {
    // The pass plus the bloom chain costs draw calls; without them the count is phase 4's 328.
    assert.ok(capture.metrics.drawCalls > 328, `${capture.metrics.drawCalls} llamadas de dibujo`)
    assert.equal(capture.lighting.indirect.mode, 'escena')
})
