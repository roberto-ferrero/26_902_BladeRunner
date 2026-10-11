import { BufferAttribute } from 'three'
import { createTowerWindows, createFaceWindows } from './TyrellPyramidWindows'
import TyrellPyramidElevators from './TyrellPyramidElevators'

// Tyrell pyramid v3 (Blender: Carpeta trabajo Claude/Edificio piramide/piramide_v3.blend): replaces the original
// building of the scene GLB with Tyrell_Pyramid_v3.glb (same world placement), with procedural office windows on the
// towers and on the pyramid faces, and the elevator lane (darker rails, moving cabins, lamps, beams and strobes).
export const PYRAMID = Object.freeze({
    asset: 'glbs/E26902_BladeRunner/Tyrell_Pyramid_v3.glb?v=1',
    replaces: 'Tyrell_Corporation_Pyramid',
    building: 'Tyrell_Pyramid_v1'
})

export default class TyrellPyramid {
    constructor(world, scene, { windows = true } = {}) {
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
    }
    configure(group, values) {
        if (group === 'elevators') this.elevators.configure(values)
        else this.windows[group]?.configure(values)
    }
    update(delta) { return this.elevators.update(delta) }
    diagnostics() {
        return { asset: PYRAMID.asset, replaced: this.removed, ...this.stats, windowMaterials: this.materials.length, sharedTextures: this.sharedTextures,
            elevators: this.elevators.diagnostics() }
    }
    dispose() {
        this.elevators.dispose()
        this.materials.forEach(material => material.dispose())
        // Geometry, textures and the remaining materials belong to the GLB scene (disposeScene).
    }
}
