import { Matrix4, Vector3 } from 'three'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (value, start, end) => {
    const t = clamp((value - start) / (end - start))
    return t * t * (3 - 2 * t)
}

export function vkPose(progress, breathing = 0) {
    const p = clamp(progress)
    return {
        fold: 1 - smooth(p, 0, .6),
        slide: 1 - smooth(p, .15, .7),
        head: 1 - smooth(p, .55, 1),
        compression: (1 - smooth(p, .45, 1)) * .78 + .22 + breathing,
        light: smooth(p, .88, 1)
    }
}

// All motion is derived from immutable rest transforms. Placement remains on
// an outer parent and therefore cannot be overwritten by a mechanical update.
export default class TyrellVKMotion {
    constructor(root) {
        this.root = root
        this.progress = 0
        this.state = 'closed'
        this.breathTime = 0
        this.duration = 5
        this.settleBreath = 0
        this.inverseRoot = new Matrix4()
        this.a = new Vector3(); this.b = new Vector3(); this.normal = new Vector3()
        this.nodes = {}
        for (const name of ['VK_Mast_Hinge', 'VK_Mast_Slide', 'VK_Head_Level', 'VK_Camera_Fold']) {
            const node = root.getObjectByName(name)
            if (!node) throw new Error(`Falta el control del VK: ${name}`)
            this.nodes[name] = { node, position: node.position.clone(), quaternion: node.quaternion.clone() }
        }
        this.plates = []
        root.traverse(node => {
            if (node.userData.role === 'bellows_plate') this.plates.push({ node, position: node.position.clone() })
        })
        if (this.plates.length !== 4) throw new Error('El VK necesita cuatro bisagras de fuelle rígidas.')
        root.updateWorldMatrix(true, true)
        this.inverseRoot.copy(root.matrixWorld).invert()
        this.bindings = []
        root.traverse(mesh => {
            if (!mesh.isMesh || (!mesh.userData.anchorA && mesh.userData.role !== 'bellows_skirt')) return
            const skirt = mesh.userData.role === 'bellows_skirt'
            const anchorA = skirt ? root : root.getObjectByName(mesh.userData.anchorA)
            const anchorB = root.getObjectByName(skirt ? mesh.userData.movingAnchor : mesh.userData.anchorB)
            if (!anchorA || !anchorB) throw new Error(`Anclajes incompletos: ${mesh.name}`)
            const rest = new Matrix4().multiplyMatrices(this.inverseRoot, mesh.matrixWorld)
            const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal
            const restPositions = new Float32Array(positions.count * 3), restNormals = new Float32Array(normals.count * 3)
            const weights = new Float32Array(positions.count)
            const start = new Vector3().fromArray(mesh.userData.weightStart || [0, 0, 0])
            const direction = new Vector3().fromArray(mesh.userData.weightEnd || [0, 1, 0]).sub(start)
            const lengthSq = direction.lengthSq()
            for (let i = 0; i < positions.count; i++) {
                this.a.fromBufferAttribute(positions, i).applyMatrix4(rest).toArray(restPositions, i * 3)
                weights[i] = skirt ? (this.a.y > mesh.userData.anchorBaseY + .00001 ? 1 : 0)
                    : smooth(this.b.copy(this.a).sub(start).dot(direction) / lengthSq, 0, 1)
                this.a.fromBufferAttribute(normals, i).transformDirection(rest).toArray(restNormals, i * 3)
            }
            this.bindings.push({ mesh, anchorA, anchorB, positions, normals, restPositions, restNormals, weights,
                inverseMesh: rest.clone().invert(),
                inverseA: new Matrix4().multiplyMatrices(this.inverseRoot, anchorA.matrixWorld).invert(),
                inverseB: new Matrix4().multiplyMatrices(this.inverseRoot, anchorB.matrixWorld).invert(),
                matrixA: new Matrix4(), matrixB: new Matrix4() })
            mesh.frustumCulled = false // small deforming parts; cached rest bounds are not valid while folding
        })
        this.apply()
    }
    get moving() { return this.state === 'deploying' || this.state === 'retracting' }
    setOpen(open) {
        if (this.moving || (open && this.state === 'open') || (!open && this.state === 'closed')) return false
        this.settleBreath = open ? 0 : this.compression - vkPose(this.progress).compression
        this.state = open ? 'deploying' : 'retracting'
        this.duration = open ? 5 : 4.2
        this.breathTime = 0
        return true
    }
    seek(progress) {
        this.progress = clamp(progress)
        this.state = this.progress === 0 ? 'closed' : this.progress === 1 ? 'open' : 'preview'
        this.breathTime = 0
        this.settleBreath = 0
        this.apply()
    }
    update(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return false
        const dt = Math.min(seconds, .1)
        if (this.moving) {
            this.progress = clamp(this.progress + (this.state === 'deploying' ? dt : -dt) / this.duration)
            if (this.progress >= 1 - 1e-10) { this.progress = 1; this.state = 'open' }
            if (this.progress <= 1e-10) { this.progress = 0; this.state = 'closed' }
        } else if (this.state === 'open') this.breathTime += dt
        else return false
        this.apply()
        return true
    }
    apply() {
        const breath = this.state === 'open' ? .16 * Math.sin(this.breathTime * Math.PI * 2 / 3.8)
            : this.state === 'retracting' ? this.settleBreath * smooth(this.progress, .85, 1) : 0
        const pose = vkPose(this.progress, breath)
        const { node: hinge } = this.nodes.VK_Mast_Hinge
        hinge.rotation.z = this.root.userData.foldAngleZ * pose.fold
        const slide = this.nodes.VK_Mast_Slide
        slide.node.position.copy(slide.position).addScaledVector(this.a.set(.9115, -.4113, 0), this.root.userData.slideTravel * pose.slide)
        const { node: motor } = this.nodes.VK_Head_Level
        motor.rotation.set(0, 0, this.root.userData.headLevelAngleZ * pose.fold)
        this.nodes.VK_Camera_Fold.node.rotation.set(this.root.userData.cameraFoldAngleX * pose.head, 0, 0)
        for (const plate of this.plates) {
            plate.node.rotation.z = plate.node.userData.closedAngleZ * pose.compression
            plate.node.position.copy(plate.position)
            plate.node.position.y += plate.node.userData.closedOffsetY * pose.compression
        }
        this.light = pose.light
        this.compression = pose.compression
        this.deform()
    }
    deform() {
        const { root, a, b, normal } = this
        root.updateWorldMatrix(true, true)
        this.inverseRoot.copy(root.matrixWorld).invert()
        for (const binding of this.bindings) {
            const { mesh, anchorA, anchorB, matrixA, matrixB, positions, normals, weights, restPositions, restNormals } = binding
            matrixA.copy(this.inverseRoot).multiply(anchorA.matrixWorld).multiply(binding.inverseA)
            matrixB.copy(this.inverseRoot).multiply(anchorB.matrixWorld).multiply(binding.inverseB)
            for (let i = 0; i < positions.count; i++) {
                const weight = weights[i]
                a.fromArray(restPositions, i * 3); b.copy(a)
                a.applyMatrix4(matrixA); b.applyMatrix4(matrixB)
                a.lerp(b, weight).applyMatrix4(binding.inverseMesh)
                positions.setXYZ(i, a.x, a.y, a.z)
                a.fromArray(restNormals, i * 3); b.copy(a)
                a.transformDirection(matrixA); b.transformDirection(matrixB)
                normal.copy(a).lerp(b, weight).normalize().transformDirection(binding.inverseMesh)
                normals.setXYZ(i, normal.x, normal.y, normal.z)
            }
            positions.needsUpdate = true; normals.needsUpdate = true
            // Tension sides have only sixteen triangles; their geometric normals
            // follow the hinge deformation rather than a blended rigid normal.
            if (mesh.userData.role === 'bellows_skirt') mesh.geometry.computeVertexNormals()
        }
    }
    diagnostics() {
        return { state: this.state, progress: this.progress, compression: this.compression,
            light: this.light, flexibleVertices: this.bindings.reduce((n, b) => n + b.positions.count, 0),
            rigidBellowsPlates: this.plates.length, breathingPeriod: 3.8 }
    }
}
