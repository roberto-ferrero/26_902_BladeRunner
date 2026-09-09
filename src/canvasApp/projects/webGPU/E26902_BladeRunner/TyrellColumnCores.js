import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide, Vector3 } from 'three'
import profiles from './column-cores.json'

// A single recessed backing mesh closes the through-gaps between the authored stone courses.
export function addColumnCores(root) {
    const positions = [...profiles.positions], indices = [...profiles.indices]
    let returnFaces = 0
    root.updateMatrixWorld(true)
    // These two rear corner profiles have inset returns that catch the sun edge-on.
    // Move only their near-vertical inward-facing returns to the dark recess material.
    root.traverse(object => {
        if (!object.isMesh || !/^Columna_(09|18)_/.test(object.name)) return
        const source = object.geometry, kept = [], moved = []
        for (let i = 0; i < source.index.count; i += 3) {
            const ids = [0, 1, 2].map(j => source.index.getX(i + j))
            const v = ids.map(j => new Vector3().fromBufferAttribute(source.attributes.position, j).applyMatrix4(object.matrixWorld))
            const n = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize()
            const height = Math.max(...v.map(p => p.y)) - Math.min(...v.map(p => p.y))
            if (height > .03 && Math.abs(n.y) < .0001 && n.z < -.3 && Math.abs(n.x) > .9 && Math.abs(n.x) < .96) {
                moved.push(...v)
                returnFaces++
            } else kept.push(...ids)
        }
        if (moved.length) {
            const geometry = new BufferGeometry()
            for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute)
            geometry.setIndex(kept)
            object.geometry = geometry
            for (const point of moved) {
                root.worldToLocal(point)
                indices.push(positions.length / 3)
                positions.push(...point.toArray())
            }
        }
    })
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const material = new MeshBasicMaterial({ color: 0x17120d, side: DoubleSide })
    material.name = 'Tyrell | interior oscuro de juntas'
    const mesh = new Mesh(geometry, material)
    mesh.name = 'Tyrell | núcleos interiores de columnas'
    mesh.userData.columnRepair = { cores: 18, addedMeshes: 1, addedTriangles: profiles.indices.length / 3,
        darkReturnTriangles: returnFaces, recessedPlanarScale: .97 }
    mesh.castShadow = true
    root.add(mesh)
    return mesh
}
