import * as THREE from 'three'
import * as THREE_GPU from 'three/webgpu'
import * as TSL from 'three/tsl'

class TerrainVertex {
    // Terrain loaded created from vertex data.
    constructor(obj) {
        console.log("(TerrainVertex.CONSTRUCTOR)!")
        this.app = obj.app
        this.parent3D = obj.parent3D || this.app.render.scene
        this.heightMap = obj.heightMap     // TextureMap texture
        this.textureMap = obj.textureMap     // TextureMap texture
        this.size = obj.size   // {width, height}
        this.maxHeight = obj.maxHeight || 100
    }

    build() {
        this._buildTerrain()
    }

    _buildTerrain() {
        if (this.heightMap) {
            this.heightMap.minFilter = THREE.LinearFilter
            this.heightMap.magFilter = THREE.LinearFilter
            this.heightMap.needsUpdate = true
        }

        if (this.textureMap) {
            this.textureMap.colorSpace = THREE.SRGBColorSpace
            this.textureMap.minFilter = THREE.LinearFilter
            this.textureMap.magFilter = THREE.LinearFilter
            this.textureMap.needsUpdate = true
        }

        const terrain = new THREE.Mesh(
            new THREE.PlaneGeometry(
                this.size.width,
                this.size.height,
                this._getSegmentCount(this.heightMap?.image?.width),
                this._getSegmentCount(this.heightMap?.image?.height)
            ),
            this._createTerrainMaterial()
        )

        terrain.rotation.x = -Math.PI * 0.5
        // terrain.rotation.z = Math.PI* 0.5
        terrain.frustumCulled = false

        this.terrain = terrain
        this.parent3D.add(this.terrain)
    }

    _getSegmentCount(sourceSize) {
        const count =  Math.max(1, Math.min((sourceSize || 256) - 1, 1024)) // Limit segments to a maximum of 512 for performance
        console.log("count: ", count);
        return count
    }

    _createTerrainMaterial() {
        const terrainUv = TSL.uv()
        const heightMapWidth = Math.max(1, this.heightMap?.image?.width || this.heightMap?.source?.data?.width || 1)
        const heightMapHeight = Math.max(1, this.heightMap?.image?.height || this.heightMap?.source?.data?.height || 1)
        const texelStepX = TSL.vec2(1 / heightMapWidth, 0.0)
        const texelStepY = TSL.vec2(0.0, 1 / heightMapHeight)
        const height = this.heightMap
            ? TSL.texture(this.heightMap, terrainUv).r.mul(4.0)
                .add(TSL.texture(this.heightMap, terrainUv.add(texelStepX)).r)
                .add(TSL.texture(this.heightMap, terrainUv.sub(texelStepX)).r)
                .add(TSL.texture(this.heightMap, terrainUv.add(texelStepY)).r)
                .add(TSL.texture(this.heightMap, terrainUv.sub(texelStepY)).r)
                .div(8.0)
                .mul(this.maxHeight)
            : TSL.float(0.0)
        const material = new THREE_GPU.MeshBasicNodeMaterial({
            side: THREE.DoubleSide
        })

        material.positionNode = TSL.positionLocal.add(TSL.vec3(0.0, 0.0, height))
        material.colorNode = this.textureMap
            ? TSL.texture(this.textureMap, terrainUv).rgb
            : TSL.vec3(0.35, 0.55, 0.22)

        return material
    }
}

export default TerrainVertex
