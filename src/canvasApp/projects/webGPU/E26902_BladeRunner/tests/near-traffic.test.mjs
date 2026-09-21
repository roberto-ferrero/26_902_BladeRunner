import test from 'node:test'
import assert from 'node:assert/strict'
import { Group, Vector3 } from 'three'
import { loadNearTraffic, auditNearTraffic } from '../scripts/audit-near-traffic.mjs'
const { default: Traffic, NEAR_TRAFFIC, createNearRoutes, nearVehicleRotation, createNearFlareTexture } = loadNearTraffic()
const advance = (traffic, seconds, fps = 60) => { for (let i = 0; i < seconds * fps; i++) traffic.update(1 / fps) }

test('Quarter-scale single route stays level, clears architecture and traverses the reference frame left to right', async () => {
    const report = await auditNearTraffic(), routes = createNearRoutes()
    assert.equal(routes.length, 1)
    assert.ok(report.hullRadius < .87)
    const route = report.routes[0]
    assert.ok(Math.abs(route.speed / (route.length / 10) - .25) < 1e-9, 'Cruise at 25% of the rejected ten-second pass speed')
    assert.equal(route.collisions, 0)
    assert.ok(route.conservativeHullClearance > .5)
    for (const name of ['Camera_E', 'CAM_01_|_fotograma_general']) {
        const view = route.views.find(v => v.camera === name)
        assert.ok(view.visibleSamples > 15)
        assert.equal(view.fadedVisible.length, 0, 'Reset and endpoint fades must stay out of sight')
        if (name === 'Camera_E') {
            assert.ok(view.screenSamples[0].x < .35 && view.screenSamples[0].y < .4, 'Enter the upper-left area')
            assert.ok(view.screenSamples.at(-1).x > .75, 'Leave through the right side')
        }
    }
    for (let i = 0; i <= 1000; i++) {
        const p = routes[0].getPointAt(i / 1000)
        assert.ok(Math.abs(p.y - NEAR_TRAFFIC.altitude) < 1e-8, 'No vertical climb or dive')
        const tangent = routes[0].getTangentAt(i / 1000)
        const rotation = nearVehicleRotation(tangent, i / 1000)
        const up = new Vector3(0, 1, 0).applyQuaternion(rotation)
        assert.ok(up.angleTo(new Vector3(0, 1, 0)) <= 20 * Math.PI / 180 + 1e-8, 'Limit absolute bank to twenty degrees; never roll toward 90 degrees')
        const heading = new Vector3(0, 0, 1).applyQuaternion(rotation)
        assert.ok(heading.dot(tangent) > .999999)
    }
})

test('One vehicle repeats only after arrival, remains frame-rate independent and survives GUI speed changes without jumping', () => {
    const a = new Traffic(new Group()), b = new Traffic(new Group())
    advance(a, 65, 60); advance(b, 65, 30)
    assert.equal(a.flights.length, 1); assert.equal(a.routes.length, 1)
    assert.equal(a.flights[0].group.scale.x, .25)
    assert.equal(a.passes, 2)
    assert.ok(a.flights[0].position.distanceTo(b.flights[0].position) < 1e-7)
    const position = a.flights[0].position.clone()
    a.configure({ duration: 60 }); a.update(0)
    assert.ok(a.flights[0].position.distanceTo(position) < 1e-8)
    a.configure({ duration: NaN }); assert.equal(a.settings.duration, 60)
    a.configure({ duration: -5 }); assert.equal(a.settings.duration, 20)
    a.configure({ duration: 999 }); assert.equal(a.settings.duration, 60)
    const time = a.time
    a.configure({ enabled: false }); advance(a, 10)
    assert.equal(a.time, time); assert.equal(a.group.visible, false)
    assert.equal(a.diagnostics().flights.length, 0)
    a.configure({ enabled: true }); advance(a, 3)
    assert.equal(a.flights[0].active, true)
    assert.equal(a.diagnostics().flights.length, 1)
})

test('Ten minutes of repetition retains one identity and conceals recycling, including its optical glow', () => {
    const traffic = new Traffic(new Group()), flight = traffic.flights[0], id = flight.group.uuid
    for (let i = 0; i < 6000; i++) {
        const before = traffic.passes
        traffic.update(.1)
        assert.equal(traffic.flights[0].group.uuid, id)
        assert.ok(traffic.diagnostics().flights.length <= 1)
        assert.equal(flight.route, 0)
        assert.ok(flight.position.toArray().every(Number.isFinite))
        if (traffic.passes !== before) {
            assert.ok(flight.materials[0].opacity < .15)
            assert.ok(flight.optics.every(sprite => sprite.material.opacity < .15))
        }
    }
    assert.equal(traffic.passes, 15)
    assert.equal(traffic.group.children.length, 1)
    assert.ok(flight.optics.some(sprite => sprite.material.color.r > 5), 'A bright optical core must feed existing bloom')
    assert.ok(flight.optics.every(sprite => sprite.material.depthTest && !sprite.material.depthWrite), 'Respect architecture without overwriting scene depth')
    const texture = createNearFlareTexture(), { data, width, height } = texture.image
    assert.equal(data.length, width * height * 4)
    assert.ok(data[(Math.floor(height / 2) * width + Math.floor(width / 2)) * 4 + 3] > 0)
    for (let x = 0; x < width; x++) assert.equal(data[x * 4 + 3], 0, 'No hard rectangular border on optical flare')
    texture.dispose()
})
