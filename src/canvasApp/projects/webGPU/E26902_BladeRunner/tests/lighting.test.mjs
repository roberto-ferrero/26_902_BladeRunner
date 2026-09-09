import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url), base = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/'
function load(file, imports) {
    const code = require('@babel/core').transformSync(fs.readFileSync(base + file, 'utf8'), {
        filename: file, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code
    const m = { exports: {} }; new Function('require', 'module', 'exports', code)(key => imports[key], m, m.exports)
    return m.exports
}
const { TYRELL } = load('config.js', {})
const { default: Lighting } = load('TyrellLighting.js', { three: THREE, './config': { TYRELL } })

test('Solar composition aligns light and disc, restores the baseline and survives shadow-light replacement', () => {
    const root = new THREE.Group(), parent = new THREE.Group(), sun = new THREE.DirectionalLight(0xffaa66, 2.25)
    root.position.set(1, 0, 2); root.rotation.y = .2; root.add(parent); parent.rotation.x = .15; parent.add(sun)
    sun.position.set(.3, 7.2, -100); sun.add(sun.target); sun.target.position.set(0, 0, -1)
    const geometry = new THREE.PlaneGeometry(), texture = new THREE.Texture()
    const disc = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()), sky = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ emissive: 0x888888, emissiveMap: texture }))
    disc.name = 'Sol'; disc.position.set(2, 46, -650); disc.scale.setScalar(.777)
    sky.name = 'Cielo'; root.add(disc, sky)
    const fill = new THREE.HemisphereLight(0xffffff, 0x777777, .35), areas = TYRELL.areaFills.map(p => new THREE.RectAreaLight(0xffffff, p.intensity))
    root.updateMatrixWorld(true)
    const before = { position: sun.position.clone(), target: sun.target.getWorldPosition(new THREE.Vector3()), disc: disc.position.clone(), scale: disc.scale.clone(), emission: sky.material.emissive.clone() }
    const lighting = new Lighting(root, sun, fill, areas)
    for (let i = 0; i < 3; i++) {
        lighting.apply('tyrell-light-v1')
        const d = lighting.diagnostics(), lightDirection = new THREE.Vector3(...d.directionToSun)
        const discDirection = new THREE.Vector3(...d.discPosition).sub(new THREE.Vector3(...d.target)).normalize()
        assert.ok(lightDirection.distanceTo(discDirection) < 1e-10)
        assert.equal(sky.material.emissiveMap, texture); assert.equal(disc.geometry, geometry)
        if (i === 0) {
            const old = lighting.sun, replacement = old.clone(false)
            replacement.target = old.target; old.parent.add(replacement); old.removeFromParent(); lighting.sun = replacement
        }
        lighting.apply('provisional')
        assert.ok(lighting.sun.position.equals(before.position))
        assert.ok(lighting.sun.target.getWorldPosition(new THREE.Vector3()).distanceTo(before.target) < 1e-10)
        assert.ok(disc.position.equals(before.disc)); assert.ok(disc.scale.equals(before.scale))
        assert.ok(sky.material.emissive.equals(before.emission)); assert.equal(fill.intensity, .35)
        assert.deepEqual(areas.map(l => l.intensity), TYRELL.areaFills.map(p => p.intensity))
    }
    lighting.apply('tyrell-light-v2')
    const calibrated = lighting.diagnostics()
    const expectedKey = new THREE.Vector3(...TYRELL.calibratedLighting.keyPosition)
        .sub(new THREE.Vector3(...TYRELL.lighting.target)).normalize()
    assert.ok(new THREE.Vector3(...calibrated.directionToSun).distanceTo(expectedKey) < 1e-10)
    assert.ok(new THREE.Vector3(...calibrated.discPosition).distanceTo(new THREE.Vector3(...TYRELL.calibratedLighting.discPosition)) < 1e-10)
    for (const contribution of ['sun', 'hemisphere', 'areas', 'area-0', 'area-1', 'area-2', 'area-3']) {
        lighting.setContribution(contribution)
        const isolated = lighting.diagnostics()
        assert.equal(isolated.sunIntensity, contribution === 'sun' ? calibrated.sunIntensity : 0)
        assert.equal(isolated.hemisphereIntensity, contribution === 'hemisphere' ? calibrated.hemisphereIntensity : 0)
        assert.deepEqual(isolated.areaIntensities, calibrated.areaIntensities.map((v, i) => contribution === 'areas' || contribution === `area-${i}` ? v : 0))
        assert.deepEqual(isolated.discPosition, calibrated.discPosition)
        assert.deepEqual(isolated.skyEmission, calibrated.skyEmission)
        lighting.apply('tyrell-light-v1')
        lighting.apply('tyrell-light-v2')
        assert.deepEqual(lighting.diagnostics(), isolated)
        lighting.setContribution('all')
        assert.deepEqual(lighting.diagnostics(), calibrated)
    }
    const areaParent = new THREE.Group()
    areaParent.position.set(2, 0, -1); areaParent.rotation.y = .3; root.add(areaParent)
    areas.forEach(light => areaParent.attach(light))
    const areaBefore = areas.map(light => ({ position: light.position.clone(), quaternion: light.quaternion.clone(), width: light.width, height: light.height }))
    // Recreate the controller to snapshot the new transformed parent arrangement.
    const shapedLighting = new Lighting(root, lighting.sun, fill, areas)
    shapedLighting.apply('tyrell-light-v2')
    const prior = shapedLighting.diagnostics()
    for (let cycle = 0; cycle < 3; cycle++) {
        shapedLighting.apply('tyrell-light-v3')
        const shaped = shapedLighting.diagnostics()
        assert.deepEqual(shaped.directionToSun, prior.directionToSun)
        assert.deepEqual(shaped.discPosition, prior.discPosition)
        areas.forEach((light, i) => {
            const shape = TYRELL.shapedAreaFills[i], actual = shaped.areas[i]
            assert.ok(new THREE.Vector3(...actual.position).distanceTo(new THREE.Vector3(...shape.position)) < 1e-8)
            const expected = new THREE.Vector3(...shape.target).sub(new THREE.Vector3(...shape.position)).normalize()
            assert.ok(new THREE.Vector3(...actual.emissionDirection).distanceTo(expected) < 1e-8)
            assert.equal(light.width, shape.width); assert.equal(light.height, shape.height)
            assert.equal(light.castShadow, false)
        })
        shapedLighting.setContribution('area-0'); shapedLighting.setContribution('all')
        assert.deepEqual(shapedLighting.diagnostics(), shaped)
        shapedLighting.apply('tyrell-light-v2')
        areas.forEach((light, i) => {
            assert.ok(light.position.equals(areaBefore[i].position)); assert.ok(light.quaternion.equals(areaBefore[i].quaternion))
            assert.equal(light.width, areaBefore[i].width); assert.equal(light.height, areaBefore[i].height)
        })
    }
    // The first controller restores its own snapshot before the original comparison.
    areas.forEach(light => light.removeFromParent())
    lighting.apply('tyrell-light-v2')
    lighting.setContribution('invalid')
    assert.deepEqual(lighting.diagnostics(), calibrated)
    geometry.dispose(); disc.material.dispose(); sky.material.dispose(); texture.dispose()
})
