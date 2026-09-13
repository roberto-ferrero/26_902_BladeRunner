import { Box3, Vector3 } from 'three'

// Conservative standing-body footprint; no physics meshes or render geometry.
export default class TyrellCollision {
    constructor(world) {
        this.radius = .25
        this.bounds = { minX: -8.9, maxX: 8.9, minZ: -14.26, maxZ: 12 }
        this.boxes = []
        world.updateMatrixWorld(true)
        world.traverse(object => {
            if (!object.isMesh || /^(Pavimento|Mortero|Tyrell)/.test(object.name)) return
            const box = new Box3().setFromObject(object, true)
            if (box.max.y < .05 || box.min.y > 2 || box.min.x < -20 || box.max.x > 20 || box.min.z < -20 || box.max.z > 20) return
            this.boxes.push({ name: object.name, minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z })
        })
    }
    free(x, z) {
        const r = this.radius, b = this.bounds
        return x >= b.minX + r && x <= b.maxX - r && z >= b.minZ + r && z <= b.maxZ - r &&
            !this.boxes.some(b => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r)
    }
    settle(position, height) {
        // Presets may be inside a wall or outside the walking area. Find the nearest valid entry.
        const b = this.bounds, r = this.radius
        const x = Math.max(b.minX + r, Math.min(b.maxX - r, position.x))
        const z = Math.max(b.minZ + r, Math.min(b.maxZ - r, position.z))
        if (this.free(x, z)) { position.set(x, height, z); return }
        let best = null, distance = Infinity
        for (let px = b.minX + r; px <= b.maxX - r; px += .1) {
            for (let pz = b.minZ + r; pz <= b.maxZ - r; pz += .1) {
                const d = (px - x) ** 2 + (pz - z) ** 2
                if (d < distance && this.free(px, pz)) { best = [px, pz]; distance = d }
            }
        }
        if (!best) throw new Error('No hay espacio válido para iniciar el recorrido.')
        position.set(best[0], height, best[1])
    }
    move(position, delta, height) {
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.z)) / .05))
        for (let i = 0; i < steps; i++) {
            const x = position.x + delta.x / steps, z = position.z + delta.z / steps
            if (this.free(x, position.z)) position.x = x
            if (this.free(position.x, z)) position.z = z
        }
        position.y = height
    }
    diagnostics() { return { obstacles: this.boxes.length, bodyWidth: this.radius * 2, bounds: this.bounds, method: 'Conservative XZ boxes, 5 cm substeps, sliding; raised platform blocked' } }
}
