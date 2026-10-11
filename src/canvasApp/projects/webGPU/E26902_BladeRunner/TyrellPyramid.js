import { BufferAttribute, Vector3 } from 'three'
import { createTowerWindows, createFaceWindows } from './TyrellPyramidWindows'
import TyrellPyramidElevators from './TyrellPyramidElevators'

// Tyrell pyramid v3 (Blender: Carpeta trabajo Claude/Edificio piramide/piramide_v3.blend): replaces the original
// building of the scene GLB with Tyrell_Pyramid_v3.glb (same world placement), with procedural office windows on the
// towers and on the pyramid faces, and the elevator lane (darker rails, moving cabins, lamps, beams and strobes).
export const PYRAMID = Object.freeze({
    asset: 'glbs/E26902_BladeRunner/Tyrell_Pyramid_v3.glb?v=1',
    replaces: 'Tyrell_Corporation_Pyramid',
    building: 'Tyrell_Pyramid_v1',
    leaning: 'Tyrell_Pyramid_v1001'   // the leaning buildings (glTF 'Tyrell_Pyramid_v1.001', sanitized by GLTFLoader): the only part kept with { main: false }
})

// The back (-Z) and left (-X) facades face away from every camera of the scene, which all sit on the
// +Z side of the pyramid. They meet the visible facades at the corner edges over the diagonal dx + dz = 0
// around the pyramid axis. A piece (an island of connected triangles) that lies at least 80 % on one side
// of that diagonal belongs whole to that side, so a leaning building, terrace or elevator rail that just
// crosses a corner stays with its own facade. Pieces that really turn a corner (the pyramid body, the
// window bands) are clipped exactly at the diagonal. Runs before the elevators and the beacons, so
// neither is placed on the removed faces.
const hiddenFacade = sum => sum < 0   // dx + dz: union of the -X and -Z quadrants
function cullHiddenFaces(scene, building) {
    const centre = building.getWorldPosition(new Vector3()), v = new Vector3()
    let removed = 0
    scene.traverse(object => {
        if (!object.isMesh || object.name === PYRAMID.leaning || /ascensor/.test(object.name) && !/carriles/.test(object.name)) return
        const geometry = object.geometry, positions = geometry.attributes.position
        const index = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: positions.count }, (_, i) => i)
        // Pieces: islands of triangles connected through shared positions (glTF splits vertices at seams).
        const world = new Float32Array(positions.count * 3), welded = new Int32Array(positions.count), keys = new Map()
        for (let i = 0; i < positions.count; i++) {
            v.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).sub(centre)
            world.set([v.x, v.y, v.z], i * 3)
            const key = `${Math.round(v.x * 1e3)},${Math.round(v.y * 1e3)},${Math.round(v.z * 1e3)}`
            if (!keys.has(key)) keys.set(key, keys.size)
            welded[i] = keys.get(key)
        }
        const parent = Int32Array.from({ length: keys.size }, (_, i) => i)
        const root = x => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x }
        for (let t = 0; t < index.length; t += 3)
            for (let k = 1; k < 3; k++) parent[root(welded[index[t + k]])] = root(welded[index[t]])
        const side = i => world[i * 3] + world[i * 3 + 2]
        const pieces = new Map(), e1 = new Vector3(), e2 = new Vector3()
        for (let t = 0; t < index.length; t += 3) {
            const r = root(welded[index[t]])
            if (!pieces.has(r)) pieces.set(r, { area: 0, hiddenArea: 0 })
            const piece = pieces.get(r), [i, j, k] = [index[t], index[t + 1], index[t + 2]]
            e1.set(world[j * 3] - world[i * 3], world[j * 3 + 1] - world[i * 3 + 1], world[j * 3 + 2] - world[i * 3 + 2])
            e2.set(world[k * 3] - world[i * 3], world[k * 3 + 1] - world[i * 3 + 1], world[k * 3 + 2] - world[i * 3 + 2])
            const area = e1.cross(e2).length() / 2
            piece.area += area
            if (hiddenFacade(side(i) + side(j) + side(k))) piece.hiddenArea += area
        }
        for (const piece of pieces.values()) {
            const share = piece.area ? piece.hiddenArea / piece.area : 0
            piece.mode = share >= .8 ? 'hidden' : share <= .2 ? 'visible' : 'clip'
        }
        // Output vertices: an original vertex [i] or a point on a cut edge [i, j, t].
        const vertices = [], ids = new Map(), out = []
        const vertex = (i, j = i, t = 0) => {
            const key = t === 0 ? `${i}` : t === 1 ? `${j}` : i < j ? `${i}:${j}:${t}` : `${j}:${i}:${1 - t}`
            if (!ids.has(key)) { ids.set(key, vertices.length); vertices.push(t === 1 ? [j, j, 0] : [i, j, t]) }
            return ids.get(key)
        }
        for (let t = 0; t < index.length; t += 3) {
            const tri = [index[t], index[t + 1], index[t + 2]]
            const piece = pieces.get(root(welded[tri[0]]))
            if (piece.mode !== 'clip') {
                if (piece.mode === 'hidden') removed++
                else out.push(...tri.map(i => vertex(i)))
                continue
            }
            const d = tri.map(side)
            if (d.every(value => value >= 0)) { out.push(...tri.map(i => vertex(i))); continue }
            removed++
            if (d.every(value => value <= 0)) continue
            // Sutherland-Hodgman against the visible half-plane, then a fan.
            const polygon = []
            for (let k = 0; k < 3; k++) {
                const i = tri[k], j = tri[(k + 1) % 3], di = d[k], dj = d[(k + 1) % 3]
                if (di >= 0) polygon.push(vertex(i))
                if ((di >= 0) !== (dj >= 0)) polygon.push(vertex(i, j, di / (di - dj)))
            }
            for (let k = 1; k + 1 < polygon.length; k++) out.push(polygon[0], polygon[k], polygon[k + 1])
        }
        if (!removed) return
        for (const [name, attribute] of Object.entries(geometry.attributes)) {
            // glTF attributes may be interleaved: interpolate the raw (possibly normalized) components.
            const size = attribute.itemSize, interleaved = attribute.isInterleavedBufferAttribute
            const source = interleaved ? attribute.data.array : attribute.array
            const stride = interleaved ? attribute.data.stride : size, offset = interleaved ? attribute.offset : 0
            const integer = !(source instanceof Float32Array || source instanceof Float64Array)
            const array = new source.constructor(vertices.length * size)
            vertices.forEach(([i, j, t], n) => {
                for (let k = 0; k < size; k++) {
                    const value = source[i * stride + offset + k] * (1 - t) + source[j * stride + offset + k] * t
                    array[n * size + k] = integer ? Math.round(value) : value
                }
            })
            geometry.setAttribute(name, new BufferAttribute(array, size, attribute.normalized))
        }
        geometry.setIndex(out)
        geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    })
    return removed
}

export default class TyrellPyramid {
    constructor(world, scene, { windows = true, main = true, cullHidden = false } = {}) {
        const old = world.getObjectByName(PYRAMID.replaces)
        this.removed = old ? old.name : null
        if (old) { old.removeFromParent(); old.traverse(object => object.geometry?.dispose()) }   // its concrete material may be shared
        this.root = scene
        scene.name = 'Tyrell / pirámide v3'
        world.add(scene)
        scene.updateMatrixWorld(true)
        // Same weathered concrete as the scene GLB: reuse its GPU textures and drop the copies of the building GLB.
        const source = old && [].concat(old.material).find(material => material.map)
        this.sharedTextures = 0
        if (source) {
            const copies = new Set()
            scene.traverse(object => {
                for (const material of object.isMesh ? [].concat(object.material) : []) {
                    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
                        if (!material[key] || !source[key] || material[key] === source[key]) continue
                        copies.add(material[key]); material[key] = source[key]; material.needsUpdate = true
                    }
                }
            })
            for (const texture of copies) { texture.source?.data?.close?.(); texture.dispose() }
            this.sharedTextures = copies.size
        }
        this.building = scene.getObjectByName(PYRAMID.building)
        if (!this.building) throw new Error(`Falta ${PYRAMID.building} en el GLB de la pirámide.`)
        this.culled = cullHidden ? cullHiddenFaces(scene, this.building) : 0
        this.windows = { towerWindows: createTowerWindows(), faceWindows: createFaceWindows() }
        const systems = windows ? { 'Torres | ventanas': this.windows.towerWindows, 'Piramide | ventanas': this.windows.faceWindows } : {}
        const replaced = new Map()
        this.stats = { meshes: 0, triangles: 0 }
        scene.traverse(object => {
            if (!object.isMesh) return
            this.stats.meshes++
            const geometry = object.geometry
            this.stats.triangles += (geometry.index?.count || geometry.attributes.position.count) / 3
            // The rail mesh has no UVs but shares the textured concrete: planar coordinates in metres.
            if (!geometry.attributes.uv && [].concat(object.material).some(material => material.map)) {
                const p = geometry.attributes.position, uv = new Float32Array(p.count * 2)
                for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) + p.getZ(i)) / 400; uv[2 * i + 1] = p.getY(i) / 400 }
                geometry.setAttribute('uv', new BufferAttribute(uv, 2))
            }
            const swap = material => {
                const system = systems[material.name]
                if (!system) return material
                if (!replaced.has(material)) replaced.set(material, system.material(material))
                return replaced.get(material)
            }
            object.material = Array.isArray(object.material) ? object.material.map(swap) : swap(object.material)
        })
        this.materials = [...replaced.values()]
        this.elevators = new TyrellPyramidElevators(scene, this.building)
        // Temporary: without the main building, only the leaning buildings stay (no elevators, windows or beacons).
        this.main = main
        if (!main) {
            this.elevators.dispose()
            for (const object of [...scene.children]) {
                if (object.name === PYRAMID.leaning) continue
                object.removeFromParent(); object.traverse(child => child.geometry?.dispose())
            }
        }
    }
    configure(group, values) {
        if (group === 'elevators') { if (this.main) this.elevators.configure(values) }
        else this.windows[group]?.configure(values)
    }
    update(delta) { return this.main ? this.elevators.update(delta) : false }
    diagnostics() {
        return { asset: PYRAMID.asset, replaced: this.removed, ...this.stats, windowMaterials: this.materials.length, sharedTextures: this.sharedTextures,
            main: this.main, culledTriangles: this.culled, elevators: this.main ? this.elevators.diagnostics() : null }
    }
    dispose() {
        if (this.main) this.elevators.dispose()
        this.materials.forEach(material => material.dispose())
        // Geometry, textures and the remaining materials belong to the GLB scene (disposeScene).
    }
}
