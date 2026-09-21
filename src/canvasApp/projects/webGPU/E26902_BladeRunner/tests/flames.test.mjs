import test from 'node:test'
import assert from 'node:assert/strict'
import { Group, Vector3 } from 'three'
import { loadFlames, auditFlames } from '../scripts/audit-flames.mjs'
const { default: Flames, FLAME_TOWERS, flameBounds } = loadFlames()
const create = () => new Flames(new Group(), { group: new Group() })
const advance = (f, seconds, fps) => { for (let i = 0; i < seconds * fps; i++) f.update(1 / fps) }

test('Complete flare envelope stays outside CAM01 with pan and enters lateral views', async () => {
    for (const tower of await auditFlames()) {
        assert.ok(tower.samples.every(s => s.intersections === 0))
        assert.ok(tower.presets.some(v => v.inFrustum && v.centreUnoccluded))
    }
})
test('Ten minutes keep one emission at a time and every enlarged sprite stays within its audited envelope', () => {
    const flames = create(), order = [], ids = flames.emitters.map(e => e.group.uuid)
    let lastCount = 0, activeFrames = 0
    for (let i = 0; i < 36000; i++) {
        const wasActive = !!flames.active
        const refresh = flames.update(1 / 60)
        if (wasActive && !flames.active) {
            assert.ok(refresh && flames.environmentNeedsRefresh, 'Clear the last flame from cached reflections immediately')
        }
        const visible = flames.emitters.filter(e => e.group.visible)
        assert.ok(visible.length <= 1)
        if (visible.length) activeFrames++
        if (flames.emissions !== lastCount) { order.push(flames.active.index); lastCount = flames.emissions }
        for (const emitter of visible) {
            const box = flameBounds(emitter.tower, flames.settings.size, flames.settings.rise)
            for (const sprite of emitter.sprites.filter(s => s.visible)) {
                const pos = sprite.position.clone().add(emitter.group.position)
                const radius = Math.hypot(sprite.scale.x, sprite.scale.y) * (sprite.center.y === 0 ? 1 : .5)
                assert.ok(box.containsPoint(pos.clone().addScalar(radius)) && box.containsPoint(pos.clone().addScalar(-radius)))
                assert.ok(Number.isFinite(sprite.material.opacity))
            }
        }
    }
    assert.ok(flames.emissions >= 120 && flames.emissions <= 145, 'One emission roughly every 4–5 seconds')
    assert.ok(activeFrames > 0)
    assert.deepEqual(new Set(order), new Set([0, 1, 2]))
    assert.deepEqual(flames.emitters.map(e => e.group.uuid), ids)
})
test('FPS-independent schedule, GUI limits, zero intensity and hidden city stop all flares', () => {
    const a = create(), b = create(); advance(a, 107, 60); advance(b, 107, 30)
    assert.equal(a.emissions, b.emissions); assert.ok(Math.abs(a.nextIn - b.nextIn) < 1e-7)
    a.configure({ interval: -1, intensity: 99, size: 99, rise: 99 })
    assert.equal(a.settings.rise, 3)
    assert.equal(a.settings.interval, 2); assert.equal(a.settings.intensity, 1.5); assert.equal(a.settings.size, 5)
    a.configure({ size: -4, rise: -1 }); assert.equal(a.settings.size, 1); assert.equal(a.settings.rise, 1)
    a.configure({ intensity: 0 }); a.update(.1); assert.equal(a.group.visible, false); assert.equal(a.active, null)
    a.configure({ intensity: .65, enabled: false }); a.update(.1); assert.equal(a.group.visible, false)
    a.configure({ enabled: true, size: 3.5 }); advance(a, 3, 60); assert.ok(a.active)
    a.city.group.visible = false; a.update(.1); assert.equal(a.group.visible, false); assert.equal(a.active, null)
    assert.equal(FLAME_TOWERS.length, 3)
})

test('Maximum vertical growth keeps all animated layers within the camera audit envelope', () => {
    const flames = create()
    flames.configure({ size: 5, rise: 3 })
    for (let i = 0; i < 1200; i++) {
        flames.update(1 / 60)
        for (const emitter of flames.emitters.filter(e => e.group.visible)) {
            const box = flameBounds(emitter.tower, 5, 3)
            for (const sprite of emitter.sprites.filter(s => s.visible)) {
                const pos = sprite.position.clone().add(emitter.group.position)
                const radius = Math.hypot(sprite.scale.x, sprite.scale.y) * (sprite.center.y === 0 ? 1 : .5)
                assert.ok(box.containsPoint(pos.clone().addScalar(radius)) && box.containsPoint(pos.clone().addScalar(-radius)))
            }
        }
    }
})
