import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'

// Reuse only the exposed original roof surface at the right foot of the pyramid.
// Clip its triangles rather than spanning empty space with another box or wedge.
export const CITY_ROOF = Object.freeze({
    normal: [-.00170480195, .9993908243, .03485791], plane: -13.0929813,
    minX: -5, maxX: 25, minZ: -331, maxZ: -192, offset: .025
})

export function createCityRoof(mesh) {
    if (!mesh) return null
    mesh.updateWorldMatrix(true, false)
    const source = mesh.geometry, positions = source.attributes.position, index = source.index
    const count = index?.count || positions.count, vertices = [], normals = [], uvs = []
    const roofNormal = new Vector3(...CITY_ROOF.normal)
    const surfaces = [
        { normal: roofNormal, plane: CITY_ROOF.plane },
        { normal: roofNormal, plane: -16.29 },
        { normal: new Vector3(.998806136, 0, .048849795), plane: 1.4374261 }
    ]
    const clip = (polygon, axis, limit, sign) => {
        const result = []
        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i], b = polygon[(i + 1) % polygon.length]
            const da = (a[axis] - limit) * sign, db = (b[axis] - limit) * sign
            if (da >= 0) result.push(a)
            if ((da >= 0) !== (db >= 0)) result.push(a.clone().lerp(b, da / (da - db)))
        }
        return result
    }
    for (let i = 0; i < count; i += 3) {
        let polygon = [0, 1, 2].map(j => new Vector3().fromBufferAttribute(positions, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld))
        const normal = polygon[1].clone().sub(polygon[0]).cross(polygon[2].clone().sub(polygon[0])).normalize()
        if (!surfaces.some(surface => normal.dot(surface.normal) > .9999 && Math.abs(surface.normal.dot(polygon[0]) - surface.plane) < .02)) continue
        for (const [axis, limit, sign] of [['x', CITY_ROOF.minX, 1], ['x', CITY_ROOF.maxX, -1], ['z', CITY_ROOF.minZ, 1], ['z', CITY_ROOF.maxZ, -1]])
            polygon = clip(polygon, axis, limit, sign)
        // The original step wall is double sided and Camera_free sees its back.
        // A thin finish on each side keeps it covered without altering its volume.
        for (const side of normal.y > .9 ? [1] : [1, -1]) {
            for (let j = 1; j < polygon.length - 1; j++) {
                const triangle = side > 0 ? [polygon[0], polygon[j], polygon[j + 1]] : [polygon[0], polygon[j + 1], polygon[j]]
                for (const point of triangle) {
                    vertices.push(...point.clone().addScaledVector(normal, CITY_ROOF.offset * side).toArray())
                    normals.push(...normal.clone().multiplyScalar(side).toArray())
                    uvs.push(normal.y > .9 ? point.x / 18 : point.z / 18, normal.y > .9 ? point.z / 18 : point.y / 18)
                }
            }
        }
    }
    if (!vertices.length) return null
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(vertices.length).fill(.94), 3))
    geometry.setAttribute('tyrellPanel', new Float32BufferAttribute(new Float32Array(vertices.length / 3 * 4), 4))
    geometry.setAttribute('tyrellCentral', new Float32BufferAttribute(new Float32Array(vertices.length / 3), 1))
    geometry.setIndex(Array.from({ length: vertices.length / 3 }, (_, i) => i))
    return geometry
}
