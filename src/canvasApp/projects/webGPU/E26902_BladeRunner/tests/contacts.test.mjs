import test from 'node:test'
import assert from 'node:assert/strict'
import { Group } from 'three'
import { loadGeometry, contactModule, auditContacts } from '../scripts/audit-contacts.mjs'

test('Removed instrument assembly consumes no scene resources and correction safely skips it', async () => {
    const scene = await loadGeometry()
    const { settleInstrumentCase } = contactModule(), report = settleInstrumentCase(scene)
    assert.equal(report.applied, false)
    for (const name of ['Instrument_case', 'Instrument_lid', 'Instrument_clasp', 'Instrument_clasp001']) {
        assert.equal(scene.getObjectByName(name), undefined)
    }
    const audit = auditContacts(scene)
    assert.equal(audit.contacts.some(o => o.name === 'Instrument_case'), false)
    assert.equal(audit.floorMisses, 0)
    assert.equal(settleInstrumentCase(new Group()).applied, false)
})
