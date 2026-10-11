import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellAirTraffic.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
// Glow pixels are already covered by building-lights.test; these tests exercise
// motion, bounded ownership and control semantics without requiring WebGPU.
new Function('require', 'module', 'exports', code)(name => name === 'three' ? THREE : {
    createBeaconGlow: () => new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
}, module, module.exports)
const { default: Traffic, createAirRoutes, airStrobe, PYRAMID_BOUNDS } = module.exports
const advance = (traffic, frames, dt) => { for (let i = 0; i < frames; i++) traffic.update(dt) }
const release = traffic => {
    const materials = new Set()
    traffic.group.traverse(o => { if (o.material) materials.add(o.material) })
    materials.forEach(m => m.dispose()); traffic.geometry.dispose(); traffic.glow.dispose()
}

test('One corridor just behind the pyramid, one in front of it; the low crossing goes right to left', () => {
    const routes = createAirRoutes(), pyramid = PYRAMID_BOUNDS
    for (let i = 0; i <= 1000; i++) {
        const behind = routes[0].getPointAt(i / 1000), ahead = routes[1].getPointAt(i / 1000)
        assert.ok(behind.y > pyramid.max[1] + 10, 'Keep the hull clear of the apex')
        assert.ok(behind.z < pyramid.min[2] - 15 && behind.z > pyramid.min[2] - 60, 'Just behind the pyramid')
        assert.ok(ahead.z > pyramid.max[2] + 20 && ahead.z < -80, 'In front of the pyramid, outside the room')
        assert.ok(ahead.y > 20, 'Above the low crossing and the nearest towers')
    }
    assert.equal(routes.length, 3, 'Only the three through-corridors remain')
    const front = routes[2]
    for (let i = 0; i <= 1000; i++) {
        const p = front.getPointAt(i / 1000)
        assert.ok(p.z > pyramid.max[2] + 6, 'Entire enlarged hull must clear the nearest pyramid vertex')
        assert.ok(p.z < -105, 'Keep crossings well outside the office')
        assert.ok(p.y > 9 && p.y < 13, 'Lower frontal crossings while keeping them above the low roofs')
        assert.ok(front.getTangentAt(i / 1000).x < 0, 'Travel right to left throughout the crossing')
    }
})

test('Traffic motion is frame-rate independent; zero disables everything and density reuses the pool', () => {
    const world = new THREE.Group(), marker = new THREE.Object3D(); world.add(marker)
    const a = new Traffic(world), b = new Traffic(new THREE.Group())
    const identities = a.flights.map(f => f.group)
    advance(a, 180, 1 / 60); advance(b, 90, 1 / 30)
    assert.equal(a.diagnostics().activeVehicles, 8)
    for (let i = 0; i < 8; i++) assert.ok(a.flights[i].position.distanceTo(b.flights[i].position) < 1e-8)
    a.configure({ density: 0 }); assert.equal(a.group.visible, false)
    assert.equal(a.diagnostics().flights.length, 0)
    const time = a.time; advance(a, 30, 1 / 30); assert.equal(a.time, time)
    a.configure({ density: 1 }); advance(a, 90, 1 / 30)
    assert.equal(a.diagnostics().activeVehicles, 10)
    assert.deepEqual(a.flights.map(f => f.group), identities)
    assert.equal(new Set(a.flights.map(f => f.body.geometry)).size, 1)
    assert.equal(new Set(a.flights.map(f => f.positionMaterial.map)).size, 1)
    assert.equal(world.children.length, 2); assert.equal(marker.parent, world)
    a.configure({ density: NaN }); assert.equal(a.settings.density, 1)
    a.configure({ density: -1 }); assert.equal(a.settings.density, 0)
    release(a); release(b)
})

test('Route repeats are faded, strobes are brief and staggered, resume deltas are bounded', () => {
    const traffic = new Traffic(new THREE.Group())
    advance(traffic, 120, 1 / 60)
    const flight = traffic.flights[0]
    flight.progress = .99999; traffic.update(.1)
    assert.ok(flight.progress < .002)
    assert.ok(flight.body.material.opacity < .01, 'Do not pop across the sky when a route repeats')
    const time = traffic.time; traffic.update(300)
    assert.ok(traffic.time - time <= .100001)
    let lit = 0
    for (let i = 0; i < 270; i++) if (airStrobe(i / 100) > .01) lit++
    assert.ok(lit > 10 && lit < 25, 'Short double flash with a long dark interval')
    assert.ok(airStrobe(.06) > .95); assert.ok(airStrobe(.29) > .95)
    assert.equal(airStrobe(.06, .413), 0)
    release(traffic)
})

test('Eight default vehicles renew continuously and keep corridor spacing over ten minutes', () => {
    const traffic = new Traffic(new THREE.Group()), renewals = []
    for (let frame = 0; frame < 6000; frame++) {
        const cycles = traffic.flights.slice(0, 8).map(f => f.cycle)
        traffic.update(.1)
        traffic.flights.slice(0, 8).forEach((f, i) => {
            if (f.cycle !== cycles[i]) renewals.push(traffic.time)
        })
    }
    assert.ok(renewals.length >= 70, 'Sustained renewal, not only a starting burst')
    for (let i = 1; i < renewals.length; i++) assert.ok(renewals[i] - renewals[i - 1] <= 15.1)
    for (const lane of [0, 1, 2]) {
        const flights = traffic.flights.slice(0, 8).filter(f => f.corridor === lane)
        assert.equal(flights.length, lane === 2 ? 2 : 3)
        assert.ok(flights.every(f => f.route === lane), 'Every flight must stay on its corridor: no hangar branch after regeneration')
        const phases = flights.map(f => f.progress).sort((a, b) => a - b)
        for (let i = 0; i < phases.length; i++) {
            const gap = (phases[(i + 1) % phases.length] - phases[i] + 1) % 1
            assert.ok(Math.abs(gap - 1 / phases.length) < 1e-9, 'Regeneration must not bunch up the traffic')
        }
    }
    release(traffic)
})
