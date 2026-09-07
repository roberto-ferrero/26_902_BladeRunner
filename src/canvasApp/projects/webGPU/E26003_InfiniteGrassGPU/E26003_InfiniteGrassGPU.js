import * as THREE from 'three'

import AssetLoader from '../../../core/AssetLoder/AssetLoader'
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import StagePanCamera from "../../../core/cameras/StagePanCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'

import Scene3DLib from '../../../core/utils/Scene3DLib/Scene3DLib'

import GrassGPU from './GrassGPU'
import TerrainGLB from './TerrainGLB'
import TerrainVertex from './TerrainVertex'


class E26003_InfiniteGrassGPU {
    constructor() {
        console.log("(E26003_InfiniteGrassGPU.CONSTRUCTOR)!")
        this.type = "WEBGPU_APP"
    }

    init(app) {
        console.log("(E26003_InfiniteGrassGPU.init)!")
        this.app = app
        this.scene = this.app.render.scene
        this.tier = this.app.render.performanceData.tier // "High", "Mid", "Low"


        //---------------------
        // STAGE CAMERA:
        this.stageCamera = new StagePanCamera({
            app: this.app,
            project: this,
            parent3D: this.scene,
            size: this.app.size.CURRENT
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())
        //---------------------

        //---------------------
        // LOAD ASSETS:
        this.loader = new AssetLoader({
            app: this.app,
            pathPrefix: this.app.pathPrefix
        })
        //--
        this.loader.add_gltf("scene", this.app.pathPrefix + "glbs/E26003_InfiniteGrassGPU/E26003_InfiniteGrassGPU_2.glb", true)
        this.loader.add_texture("alpha_channel", this.app.pathPrefix + "img/E26003_InfiniteGrassGPU/blade_matcap.jpg")

        this.loader.add_texture("grass_density", this.app.pathPrefix+"img/E26003_InfiniteGrassGPU/GrassMap1.jpg")
        this.loader.add_texture("height_map", this.app.pathPrefix+"img/E26003_InfiniteGrassGPU/HeightMap1.jpg")
        this.loader.add_texture("terrain_map", this.app.pathPrefix + "img/E26003_InfiniteGrassGPU/TextureMap1.jpg")
        //--
        this.loader.add_hdr("envMap", this.app.pathPrefix + "hdr/je_gray_02_2k.hdr", true)
        //--
        this.loader.emitter.on("onCompleted", () => {
            console.log("ALL ASSETS LOADED!")
            this.app.emitter.emit("onProjectLoaded", {})
        })
        this.loader.start()
        //---------------------
    }

    build() {
        console.log("(E26003_InfiniteGrassGPU.build)!")

        this.app.dev.show_dev_camera()
        this.app.dev.devCamera.position.set(157.6120169124945,54.4969859207974, 255.78109690993813)
        this.app.dev.devCamera.fov = 30
        this.app.dev.devCamera.updateProjectionMatrix()


        this.axisHelper = new THREE.AxesHelper(250)
        this.scene.add(this.axisHelper)

        const envMap = this.loader.get_hdr("envMap")
        envMap.mapping = THREE.EquirectangularReflectionMapping
        this.scene.environment = envMap
        this.scene.background = envMap

        this.world3D = new THREE.Object3D()
        this.scene.add(this.world3D)
        console.log(this.scene.position);
        console.log(this.world3D.position);
        // this.grassFieldSize = {
        //     width: this.app.size.REF.width,
        //     height: this.app.size.REF.height,
        //     aspect: this.app.size.REF.aspect
        // }

        this.sceneLib = new Scene3DLib({
            app: this.app,
            project: this,
        })
        this.sceneLib.init(this.loader.get_gltf("scene"))


        this.grassFieldSize = {
            width: 5000,
            height: 5000,
            aspect: 1
        }
        this.terrainMaxHeight = 200

        this.frame = new OrtoResponsiveFrame({
            app: this.app,
            project: this,
            itemRef: this.world3D,
            refWidth: this.app.size.REF.width,
            refHeight: this.app.size.REF.height,
            MODE: "COVER",
            SCALE_FACTOR: 1.0
        })

        // this._buildGround()
        // this._buildTerrainGLB()
        this._buildTerrainVertex()
        this._buildGrassField()
    }

    _getBladeCountByTier() {
        if (this.tier === "High") return 2000000
        if (this.tier === "Mid") return 75000
        return 250000
    }

    _buildGround() {
        const groundGeo = new THREE.PlaneGeometry(
            this.grassFieldSize.width,
            this.grassFieldSize.height
        )
        const groundMat = new THREE.MeshBasicMaterial({
            color: 0x2d5a27
        })

        this.ground = new THREE.Mesh(groundGeo, groundMat)
        this.ground.rotation.x = -Math.PI * 0.5
        this.ground.position.y = -0.02
        this.world3D.add(this.ground)
    }

    _buildTerrainGLB() {
        this.terrain = new TerrainGLB({
            app: this.app,
            parent3D: this.world3D,
            gltf: this.sceneLib.meshes.getItem("terrain"),
            map: this.loader.get_texture("terrain_map"),
            size: this.grassFieldSize
        })
        this.terrain.build()
    }

    _buildTerrainVertex() {
        this.terrain = new TerrainVertex({
            app: this.app,
            parent3D: this.world3D,
            heightMap: this.loader.get_texture("height_map"),
            textureMap: this.loader.get_texture("terrain_map"),
            size: this.grassFieldSize,
            maxHeight: this.terrainMaxHeight
        })
        this.terrain.build()
    }

    _buildGrassField() {
        this.grass = new GrassGPU({
            app: this.app,
            parent3D: this.world3D,
            stageCamera: this.stageCamera.get_camera(),
            map: this.loader.get_texture("grass_density"),
            heightMap: this.loader.get_texture("height_map"),
            alphaChannel: this.loader.get_texture("alpha_channel"),
            size: this.grassFieldSize,
            bladeCount: this._getBladeCountByTier(),
            maxHeight: this.terrainMaxHeight
        })
        this.grass.build()
    }

    update_RAF() {
        const activeCamera = this.app.render.get_activeCamera()
        this.backgroundSphere?.position.copy(activeCamera.position)
        // console.log("world3D: ", this.world3D.position);
        this.frame?.update_RAF()
        this.grass?.update_RAF()
    }
}

export default E26003_InfiniteGrassGPU
