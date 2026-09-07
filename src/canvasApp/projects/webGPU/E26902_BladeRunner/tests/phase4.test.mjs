// Phase 4 checks: the rig carries the master's photometry, not the GLB's, and the sun's shadow
// frustum really is fitted to the room.
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
const lighting = load(path.join(root, 'TyrellLighting.js'), { three: THREE, './config': { TYRELL } })
const rig = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase4/luces-blender.json'), 'utf8'))
const check = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase4/luces.json'), 'utf8'))
const WATTS_TO_LUMENS = 683

test('The sun carries the master photometry, not the GLB one', () => {
    const master = rig.lights.find(light => light.type === 'SUN')
    assert.equal(TYRELL.lighting.sun.intensity, master.energy)
    assert.deepEqual(TYRELL.lighting.sun.color, master.color)
    // The check has to stay meaningful: the GLB really does disagree, which is why this matters.
    assert.notEqual(check.sun.gltf.intensityLux, master.energy * WATTS_TO_LUMENS)
    assert.equal(check.sun.conversion.fromGltf, 1)
    // The transform is the one thing the GLB got right, so it is kept.
    assert.ok(check.sun.directionDriftDeg < 0.01, `desvío ${check.sun.directionDriftDeg}°`)
    // The visible disc must sit where the light comes from.
    assert.ok(check.sun.disc.driftFromSunDeg < 1, `disco desviado ${check.sun.disc.driftFromSunDeg}°`)
})

test('Each area fill keeps the power Blender authored', () => {
    const masters = rig.lights.filter(light => light.type === 'AREA')
    assert.equal(TYRELL.lighting.areaFills.length, masters.length)
    for (const fill of TYRELL.lighting.areaFills) {
        const master = masters.find(light => light.name === fill.name)
        assert.ok(master, `falta ${fill.name} en el maestro`)
        assert.equal(fill.watts, master.energy)
        assert.deepEqual(fill.color, master.color)
        assert.deepEqual(fill.position, master.position)
        // A square of the same area as the disc, radiating the same total power.
        const area = fill.size * fill.size
        assert.ok(Math.abs(area - Math.PI * (master.sizeX / 2) ** 2) < 0.01, `${fill.name}: área ${area}`)
        assert.ok(Math.abs(fill.intensity - master.energy / (area * Math.PI)) < 1e-3,
            `${fill.name}: radiancia ${fill.intensity}`)
    }
})

test('The world ambient carries the pi the irradiance needs', () => {
    assert.deepEqual(TYRELL.lighting.world.color, rig.world.color)
    assert.ok(Math.abs(TYRELL.lighting.world.intensity - Math.PI * rig.world.strength) < 1e-4)
})

test('Lights are built with linear colours, never through a hex literal', () => {
    const fills = lighting.createAreaFills()
    assert.equal(fills.length, TYRELL.lighting.areaFills.length)
    for (const [index, light] of fills.entries()) {
        const authored = TYRELL.lighting.areaFills[index]
        // A hex path would have run the value through the sRGB decode and darkened it.
        assert.ok(Math.abs(light.color.r - authored.color[0]) < 1e-4, `${light.name}: rojo ${light.color.r}`)
        assert.ok(Math.abs(light.color.g - authored.color[1]) < 1e-4, `${light.name}: verde ${light.color.g}`)
        assert.equal(light.intensity, authored.intensity)
        assert.equal(light.width, authored.size)
        assert.equal(light.userData.watts, authored.watts)
    }
    const world = lighting.createWorldLight()
    assert.ok(Math.abs(world.color.g - TYRELL.lighting.world.color[1]) < 1e-4)
    assert.equal(world.intensity, TYRELL.lighting.world.intensity)
})

test('The sun override keeps the GLB transform and survives being cloned', () => {
    const sun = new THREE.DirectionalLight(0xffffff, 683)
    sun.position.set(0.3, 7.2, -100)
    sun.target.position.set(0, 0, -1)
    sun.add(sun.target)
    lighting.applySunFromMaster(sun)
    assert.equal(sun.intensity, TYRELL.lighting.sun.intensity)
    assert.ok(Math.abs(sun.color.g - TYRELL.lighting.sun.color[1]) < 1e-4)
    assert.deepEqual(sun.position.toArray(), [0.3, 7.2, -100])
    assert.equal(sun.userData.gltfIntensity, 683)
    // The quality switch clones the light, and clone() puts userData through JSON.
    const clone = sun.clone(false)
    assert.ok(Array.isArray(clone.userData.gltfColor), 'el color del GLB debe sobrevivir al clonado')
    assert.equal(clone.userData.gltfColor.length, 3)
})

test('The shadow frustum is fitted to what casts and the bias follows the texel', () => {
    const sun = new THREE.DirectionalLight(0xffffff, 1)
    sun.position.set(0.3, 7.2, -100)
    sun.target.position.set(0, 0, 0)
    sun.shadow.mapSize.setScalar(2048)

    // A 20 x 6 x 24 m box standing in for the room.
    const room = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 24))
    room.position.set(0, 3, 0)
    room.updateMatrixWorld(true)
    sun.updateMatrixWorld(true)
    sun.target.updateMatrixWorld(true)

    const fit = lighting.fitSunShadow(sun, [room])
    assert.ok(fit, 'el ajuste debe devolver lo que decidió')
    const camera = sun.shadow.camera
    const margin = TYRELL.lighting.shadow.marginMetres
    // Wide enough for the room, and not wastefully wider.
    assert.ok(camera.right - camera.left >= 20, `ancho ${camera.right - camera.left}`)
    assert.ok(camera.right - camera.left <= 20 + 2 * margin + 0.5, `ancho ${camera.right - camera.left}`)
    assert.ok(camera.top - camera.bottom < 12, `alto ${camera.top - camera.bottom}`)
    // The near plane must not start at the light; the room is 100 m away.
    assert.ok(camera.near > 50, `cerca ${camera.near}`)
    assert.ok(camera.far > camera.near && camera.far - camera.near < 60, `lejos ${camera.far}`)
    // Bias in texels, so a different map size rescales it instead of needing a retune. The
    // texel is taken from the camera because the report rounds its copy for reading.
    const texel = (camera.right - camera.left) / sun.shadow.mapSize.x
    assert.ok(Math.abs(sun.shadow.normalBias - texel * TYRELL.lighting.shadow.normalBiasTexels) < 1e-9)
    assert.ok(Math.abs(fit.texelMetres - texel) < 1e-5, `texel informado ${fit.texelMetres}`)
    assert.ok(sun.shadow.bias < 0, 'el sesgo debe restar profundidad')

    sun.shadow.mapSize.setScalar(1024)
    const half = lighting.fitSunShadow(sun, [room])
    assert.ok(Math.abs(half.texelMetres - fit.texelMetres * 2) < 1e-4, 'medio mapa, texel doble')
    assert.ok(Math.abs(sun.shadow.normalBias - texel * 2 * TYRELL.lighting.shadow.normalBiasTexels) < 1e-9,
        'el sesgo sigue al texel')
    room.geometry.dispose()
})

test('The fitted frustum really is tighter than the fixed one it replaced', () => {
    // The old rig hardcoded 36 x 24 metres and a 0,1 to 150 depth range.
    assert.ok(check.shadow.fittedWidth < 36, `ancho ${check.shadow.fittedWidth}`)
    assert.ok(check.shadow.fittedHeight < 24, `alto ${check.shadow.fittedHeight}`)
    assert.ok(check.shadow.areaRatioAgainstCurrent < 0.5, `razón de área ${check.shadow.areaRatioAgainstCurrent}`)
    const capture = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase4/fase4-cam01-comparacion.json'), 'utf8'))
    const shadow = capture.lighting?.shadow
    assert.ok(shadow, 'el diagnóstico debe registrar el ajuste de sombra')
    assert.ok(shadow.casters > 100, `${shadow.casters} emisores de sombra`)
    assert.ok(shadow.frustum.width < 36 && shadow.frustum.height < 24)
    assert.ok(shadow.frustum.near > 50, `cerca ${shadow.frustum.near}`)
    assert.equal(capture.lighting.sun.intensity, TYRELL.lighting.sun.intensity)
    assert.equal(capture.lighting.areaFills.length, 4)
})
