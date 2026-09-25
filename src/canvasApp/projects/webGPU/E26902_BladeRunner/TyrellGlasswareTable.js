import { Mesh, PlaneGeometry } from 'three'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { materialRoughness, uv } from 'three/tsl'

// Only soft contact shading: no mirror plane or additional reflection pass.
export default class TyrellGlasswareTable {
    constructor(root, groups) {
        this.contacts = []
        this.tableMaterials = new Map()
        root.traverse(object => {
            if (!object.isMesh || object.name !== 'Table_Slab') return
            for (const material of [].concat(object.material)) {
                this.tableMaterials.set(material, material.roughnessNode)
                // Preserve the wood's maps while preventing a polished hotspot.
                material.roughnessNode = materialRoughness.max(.46)
                material.needsUpdate = true
            }
        })
        groups.forEach((group, i) => {
            const radius = i === 0 ? .105 : .059
            const shadow = new MeshBasicNodeMaterial({ color: '#170e04', transparent: true,
                depthWrite: false, fog: false })
            const distance = uv().sub(.5).mul(2).length()
            shadow.opacityNode = distance.smoothstep(.62, 1).oneMinus().mul(.24)
            const contact = new Mesh(new PlaneGeometry(radius * 2.6, radius * 2.6), shadow)
            contact.name = 'Glassware / soft table contact'
            contact.rotation.x = -Math.PI / 2
            contact.position.copy(group.position); contact.position.y += .0002
            contact.userData.noCastShadow = true
            root.add(contact); this.contacts.push(contact)
        })
    }
    dispose() {
        for (const [material, roughnessNode] of this.tableMaterials) {
            material.roughnessNode = roughnessNode
            material.needsUpdate = true
        }
        this.tableMaterials.clear()
        for (const mesh of this.contacts) {
            mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose()
        }
        this.contacts.length = 0
    }
}
