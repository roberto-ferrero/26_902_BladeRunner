import * as THREE from 'three'
import { TYRELL } from './config'

// Back-face culling, decided by measuring the geometry instead of trusting the file.
//
// All 27 materials of the GLB arrive double-sided, which is the Blender exporter's habit rather
// than an authoring decision. Drawing both sides of a closed solid costs fill for nothing and
// forces a larger shadow bias, but culling an open surface makes it disappear from one side.
//
// The test: on a closed surface the area-weighted face normals cancel out, so the length of
// their sum over the sum of their lengths tends to zero. On a flat card every normal points the
// same way and the ratio is one. It costs one pass over the triangles, needs no vertex welding,
// and it separates this model decisively: the sky backdrop and the sun disc measure 1,0 and
// every other surface measures 0,15 or less.

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3()
const _ab = new THREE.Vector3(), _ac = new THREE.Vector3(), _cross = new THREE.Vector3()
const _sum = new THREE.Vector3()

export function closureRatio(geometry) {
    const position = geometry.attributes.position
    const index = geometry.index
    const count = index ? index.count : position.count
    _sum.set(0, 0, 0)
    let total = 0
    for (let t = 0; t + 2 < count; t += 3) {
        const i0 = index ? index.getX(t) : t
        const i1 = index ? index.getX(t + 1) : t + 1
        const i2 = index ? index.getX(t + 2) : t + 2
        _a.fromBufferAttribute(position, i0)
        _b.fromBufferAttribute(position, i1)
        _c.fromBufferAttribute(position, i2)
        _ab.subVectors(_b, _a)
        _ac.subVectors(_c, _a)
        _cross.crossVectors(_ab, _ac)
        _sum.add(_cross)
        total += _cross.length()
    }
    return total > 0 ? _sum.length() / total : 1
}

/**
 * Turns on back-face culling for every material whose surfaces are all closed. One open surface
 * is enough to keep a material double-sided, because the material is shared.
 *
 * Returns what it decided, for the diagnostics file.
 */
export function applyBackfaceCulling(root) {
    const { enabled, closureThreshold } = TYRELL.backfaceCulling
    if (!enabled) return null

    const worst = new Map()          // material -> highest ratio among the meshes that use it
    const started = performance.now()
    let measured = 0
    root.traverse(object => {
        if (!object.isMesh) return
        const ratio = closureRatio(object.geometry)
        measured++
        for (const material of [].concat(object.material)) {
            if (!worst.has(material) || ratio > worst.get(material).ratio) {
                worst.set(material, { ratio, mesh: object.name })
            }
        }
    })

    const culled = [], kept = []
    for (const [material, evidence] of worst) {
        // Being closed is not enough. Three approximates a transmissive volume by drawing the
        // back faces and then the front ones, so culling the back of the glass costs it its
        // refraction: measured on CAM 02, the tumbler moved from 1,72e-1 to 1,88e-1 against
        // Blender's 2,83e-2, and nothing else in the frame changed.
        const transmissive = material.transmission > 0
        const closed = evidence.ratio < closureThreshold
        const entry = {
            material: material.name, ratio: +evidence.ratio.toFixed(4), worstMesh: evidence.mesh,
            reason: transmissive ? 'transmisión' : closed ? 'cerrada' : 'abierta'
        }
        if (closed && !transmissive) {
            material.side = THREE.FrontSide
            culled.push(entry)
        } else {
            material.side = THREE.DoubleSide
            kept.push(entry)
        }
        material.needsUpdate = true
    }
    return {
        threshold: closureThreshold, measuredMeshes: measured, materials: worst.size,
        culled: culled.length, kept: kept.map(k => ({ material: k.material, reason: k.reason })),
        elapsedMs: +(performance.now() - started).toFixed(1),
        detail: [...culled, ...kept].sort((a, b) => b.ratio - a.ratio)
    }
}
