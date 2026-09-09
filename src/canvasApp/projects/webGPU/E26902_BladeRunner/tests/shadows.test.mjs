import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { DirectionalLight, Scene, Vector3 } from 'three'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync('src/canvasApp/projects/webGPU/E26902_BladeRunner/config.js', 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const m = { exports: {} }; new Function('exports', 'module', code)(m.exports, m)
const { TYRELL } = m.exports

test('Solar shadow volume covers the room with margin for every calibrated lighting profile', () => {
    const scene = new Scene(), light = new DirectionalLight()
    scene.add(light, light.target)
    Object.assign(light.shadow.camera, TYRELL.shadows.camera)
    light.shadow.camera.updateProjectionMatrix()
    for (const key of [TYRELL.lighting.discPosition, TYRELL.calibratedLighting.keyPosition]) {
        const center = new Vector3(...TYRELL.lighting.target)
        light.position.copy(center).addScaledVector(new Vector3(...key).sub(center).normalize(), TYRELL.lighting.shadowDistance)
        light.target.position.copy(center); scene.updateMatrixWorld(true); light.shadow.updateMatrices(light)
        for (const x of [-12, 12]) for (const y of [0, 8]) for (const z of [-16, 14]) {
            const projected = new Vector3(x, y, z).project(light.shadow.camera)
            assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1,
                `Room corner outside shadow camera: ${x},${y},${z}: ${projected.toArray()}`)
        }
    }
    assert.ok(TYRELL.shadows.glassOpacity > 0 && TYRELL.shadows.glassOpacity < 1)
})
