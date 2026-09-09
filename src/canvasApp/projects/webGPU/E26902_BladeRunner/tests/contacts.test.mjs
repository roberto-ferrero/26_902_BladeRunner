import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3, Group } from 'three'
import { loadGeometry, contactModule, auditContacts } from '../scripts/audit-contacts.mjs'

test('Contact correction settles the whole case, preserves other objects and is idempotent', async () => {
    const scene = await loadGeometry(), before = []
    scene.traverse(o => before.push({ o, position: o.position.clone(), geometry: o.geometry, material: o.material }))
    const { settleInstrumentCase } = contactModule(), report = settleInstrumentCase(scene)
    assert.equal(report.applied, true)
    assert.ok(Math.abs(report.offsetY + .0036) < .00001)
    for (const { o, position, geometry, material } of before) {
        const delta = o.position.clone().sub(position)
        if (report.members.includes(o.name)) assert.ok(delta.distanceTo(new Vector3(0, report.offsetY, 0)) < 1e-8)
        else assert.ok(delta.length() === 0)
        assert.equal(o.geometry, geometry); assert.equal(o.material, material)
    }
    assert.equal(settleInstrumentCase(scene).applied, false)
    const audit = auditContacts(scene)
    const body = audit.contacts.find(o => o.name === 'Instrument_case')
    assert.ok(Math.abs(body.minGap) < 1e-6 && Math.abs(body.maxGap) < 1e-6)
    assert.equal(audit.floorMisses, 0)
    assert.equal(settleInstrumentCase(new Group()).applied, false)
})
