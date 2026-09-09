import { Box3, Raycaster, Vector3 } from 'three'

// Small, measured assembly correction. Never change shared vertex buffers or the GLB.
export function settleInstrumentCase(root) {
    root.updateMatrixWorld(true)
    const body = root.getObjectByName('Instrument_case')
    const members = ['Instrument_case', 'Instrument_lid', 'Instrument_clasp', 'Instrument_clasp001'].map(name => root.getObjectByName(name))
    const supports = ['Table_Slab', 'Mesa_|_campo_de_cuero'].map(name => root.getObjectByName(name)).filter(Boolean)
    const report = { assembly: 'Instrument_case', applied: false, offsetY: 0, reason: 'missing assembly or support' }
    if (!body || members.some(object => !object) || !supports.length) return report
    const box = new Box3().setFromObject(body, true), gaps = []
    const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, .02)
    for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) {
        ray.ray.origin.set(x, box.min.y + .01, z)
        const hit = ray.intersectObjects(supports, true)[0]
        if (hit) gaps.push(box.min.y - hit.point.y)
    }
    report.probes = gaps.length
    report.gapsBefore = gaps
    // Require four consistent supports and a small positive gap; fail closed for other assets.
    if (gaps.length !== 4 || Math.min(...gaps) <= .0002 || Math.max(...gaps) > .005 || Math.max(...gaps) - Math.min(...gaps) > .0001) {
        report.reason = 'no uniform gap within 0.2–5 mm'
        return report
    }
    const offset = -Math.min(...gaps)
    for (const object of members) {
        const position = object.getWorldPosition(new Vector3())
        position.y += offset
        object.position.copy(object.parent.worldToLocal(position))
    }
    root.updateMatrixWorld(true)
    return { ...report, applied: true, offsetY: offset, reason: 'four supported corners', members: members.map(object => object.name) }
}
