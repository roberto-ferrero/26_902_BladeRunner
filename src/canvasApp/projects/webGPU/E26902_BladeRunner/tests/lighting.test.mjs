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
    geometry.dispose(); disc.material.dispose(); sky.material.dispose(); texture.dispose()
})
