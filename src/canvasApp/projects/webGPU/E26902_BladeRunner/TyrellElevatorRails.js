import { materialColor, materialNormal, normalWorld, positionView, positionWorld, vec3 } from 'three/tsl'

// Finish on the authored facade: no backing volume, overlay mesh or displacement.
export const ELEVATOR_SPINE = Object.freeze({
    baseY: -5.8, topY: 32.6, bottomWidth: 14, topWidth: 8,
    axis: -62.12, railCount: 13, recessDepth: .025
})

export default class TyrellElevatorRails {
    constructor() {
        const { baseY, topY, bottomWidth, topWidth, axis, railCount, recessDepth } = ELEVATOR_SPINE
        const height = positionWorld.y.sub(baseY).div(topY - baseY).clamp(0, 1)
        const width = height.mul(topWidth - bottomWidth).add(bottomWidth)
        const across = positionWorld.dot(vec3(.9988062, 0, .0488495)).sub(axis)
        const u = across.div(width).add(.5)
        const edgeDistance = width.mul(.5).sub(across.abs())
        const facing = normalWorld.dot(vec3(-.0358789, .678634, .733600)).smoothstep(.94, .985)
        // Keep the pattern on the central front faces of the combined exterior mesh.
        this.mask = edgeDistance.smoothstep(0, .32)
            .mul(positionWorld.y.smoothstep(baseY, baseY + .3))
            .mul(positionWorld.y.smoothstep(topY - .3, topY).oneMinus())
            .mul(positionWorld.z.greaterThan(-265)).mul(positionWorld.z.lessThan(-165)).mul(facing)
        const lane = u.mul(railCount)
        const resolved = lane.fwidth().smoothstep(.55, 1.25).oneMinus()
        const grooves = lane.mul(Math.PI * 2).cos().smoothstep(.25, .9).mul(this.mask).mul(resolved)
        this.color = materialColor.mul(this.mask.mul(.18).add(grooves.mul(.14)).oneMinus())

        // Surface-gradient bump mapping of shallow inward grooves. Preserve imported
        // normal maps, with no vertex movement or silhouette changes at any angle.
        const depression = grooves.mul(-recessDepth)
        const normal = materialNormal
        const dx = positionView.dFdx(), dy = positionView.dFdy()
        const r1 = dy.cross(normal), r2 = normal.cross(dx)
        const determinant = dx.dot(r1)
        const gradient = r1.mul(depression.dFdx()).add(r2.mul(depression.dFdy())).mul(determinant.sign())
        this.normal = normal.mul(determinant.abs().max(1e-10)).sub(gradient).normalize()
    }
    apply(material, emission) {
        material.colorNode = this.color
        material.normalNode = this.normal
        material.emissiveNode = emission.mul(this.mask.oneMinus())
    }
    diagnostics() {
        return { ...ELEVATOR_SPINE, meshes: 0, triangles: 0, displacement: 0,
            method: 'Original facade material; dark unlit band and darker recessed grooves; normal-only relief' }
    }
}
