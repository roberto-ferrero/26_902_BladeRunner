import { BufferAttribute, Vector3 } from 'three'

// Reconstruct broad planar facade envelopes from the authored geometry. A convex
// outline provides sloping side margins without making diagonal triangle seams.
function hull(points) {
    const sorted = [...new Map(points.map(p => [p.map(v => Math.round(v * 1000)).join(','), p])).values()]
        .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    const half = list => {
        const result = []
        for (const p of list) {
            while (result.length > 1 && cross(result.at(-2), result.at(-1), p) <= .00001) result.pop()
            result.push(p)
        }
        return result
    }
    return half(sorted).slice(0, -1).concat(half([...sorted].reverse()).slice(0, -1))
}

export function facadeGeometry(mesh) {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
    const position = geometry.attributes.position, planes = new Map()
    const points = Array.from({ length: position.count }, (_, i) =>
        new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
    for (let i = 0; i < points.length; i += 3) {
        const [a, b, c] = points.slice(i, i + 3)
        const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a))
        const area = normal.length() / 2
        if (area < .0001) continue
        normal.normalize()
        if (Math.abs(normal.y) > .88) continue
        const key = [...normal.toArray().map(v => Math.round(v * 500)), Math.round(normal.dot(a) * 20)].join(',')
        if (!planes.has(key)) {
            const right = new Vector3(normal.z, 0, -normal.x).normalize()
            const up = new Vector3().crossVectors(normal, right).normalize()
            if (up.y < 0) up.negate()
            planes.set(key, { normal, right, up, area: 0, vertices: [], projected: [] })
        }
        const plane = planes.get(key)
        plane.area += area
        for (let j = i; j < i + 3; j++) {
            plane.vertices.push(j)
            plane.projected.push([points[j].dot(plane.right), points[j].dot(plane.up)])
        }
    }
    const panels = new Float32Array(position.count * 4), styles = new Float32Array(position.count)
    let facades = 0, central = 0
    for (const plane of planes.values()) {
        if (plane.area < 45) continue
        const outline = hull(plane.projected)
        if (outline.length < 3) continue
        const ys = outline.map(p => p[1]), xs = outline.map(p => p[0])
        const bottom = Math.min(...ys), height = Math.max(...ys) - bottom
        const width = Math.max(...xs) - Math.min(...xs)
        if (width < 4 || height < 3) continue
        facades++
        // Upper pyramid and its tall central slab; peripheral inclined wings use columns only.
        const isCentral = height > 32 && (Math.abs(plane.normal.y) > .67 || width < 65)
        if (isCentral) central++
        for (let k = 0; k < plane.vertices.length; k++) {
            const [x, y] = plane.projected[k], intersections = []
            const scanY = Math.max(bottom + .0001, Math.min(bottom + height - .0001, y))
            for (let e = 0; e < outline.length; e++) {
                const a = outline[e], b = outline[(e + 1) % outline.length]
                if (Math.abs(a[1] - b[1]) < .00001 || scanY < Math.min(a[1], b[1]) || scanY > Math.max(a[1], b[1])) continue
                intersections.push(a[0] + (b[0] - a[0]) * (scanY - a[1]) / (b[1] - a[1]))
            }
            const left = Math.min(...intersections), right = Math.max(...intersections)
            const u = intersections.length > 1 ? (x - left) / Math.max(.001, right - left) : .5
            const vertex = plane.vertices[k]
            panels.set([Math.max(0, Math.min(1, u)) * width, y - bottom, width, height], vertex * 4)
            styles[vertex] = isCentral ? 1 : 0
        }
    }
    geometry.setAttribute('tyrellPanel', new BufferAttribute(panels, 4))
    geometry.setAttribute('tyrellCentral', new BufferAttribute(styles, 1))
    geometry.userData.facadeLayout = { facades, central, method: 'Planar convex envelopes in surface coordinates' }
    return geometry
}
