import * as THREE from 'three'

class TerrainGLB {
    // Terrain loaded from a glb file, with a texture map applied. This is used as the base terrain for the infinite grass field, and can be hidden if desired.
    constructor(obj) {
        console.log("(TerrainGLB.CONSTRUCTOR)!")
        this.app = obj.app
        this.parent3D = obj.parent3D || this.app.render.scene
        this.gltf = obj.gltf   // loaded GLB scene (THREE.Group)
        this.map = obj.map     // TextureMap texture
        this.size = obj.size   // {width, height}
    }

    build() {
        this._buildTerrain()
    }

    _buildTerrain() {
        const terrain = this.gltf

        if (this.map) {
            this.map.colorSpace = THREE.SRGBColorSpace
            const rotatedMap = this.map.clone()
            rotatedMap.center.set(0.5, 0.5)
            rotatedMap.rotation = Math.PI * 0.5
            rotatedMap.needsUpdate = true
            const terrainMaterial = new THREE.MeshBasicMaterial({
                map: rotatedMap,
                side: THREE.DoubleSide,
            })
            terrain.traverse((child) => {
                if (child.isMesh) {
                    child.material = terrainMaterial
                }
            })
        }

        // Scale terrain to match grass field size
        const box = new THREE.Box3().setFromObject(terrain)
        const gltfSize = new THREE.Vector3()
        box.getSize(gltfSize)

        if (gltfSize.x > 0 && gltfSize.z > 0) {
            const scaleX = this.size.width / gltfSize.x
            const scaleZ = this.size.height / gltfSize.z
            const scale = Math.max(scaleX, scaleZ)
            terrain.scale.set(scale, scale, scale)
        }

        // Center XZ, keep bottom at y=0
        box.setFromObject(terrain)
        const center = new THREE.Vector3()
        box.getCenter(center)
        terrain.position.x -= center.x
        terrain.position.z -= center.z
        terrain.position.y -= box.min.y

        this.terrain = terrain
        this.parent3D.add(this.terrain)
    }
}

export default TerrainGLB
