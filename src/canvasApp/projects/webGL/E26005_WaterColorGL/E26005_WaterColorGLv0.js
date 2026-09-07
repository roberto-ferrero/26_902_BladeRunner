import * as THREE from 'three'

import AssetLoader from '../../../core/AssetLoder/AssetLoader'
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'


class E26005_WaterColorGL {
    constructor() {
        console.log("(E26005_WaterColorGL.CONSTRUCTOR)!")
        this.type = "WEBGL_APP"
    }

    init(app) {
        console.log("(E26005_WaterColorGL.init)!")
        this.app = app
        this.scene = this.app.render.scene
        this.clock = new THREE.Clock()

        this.stageCamera = new StageOrtoCamera({
            app: this.app,
            project: this,
            parent3D: this.scene,
            size: this.app.size.CURRENT
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())

        this.loader = new AssetLoader({
            app: this.app,
            pathPrefix: this.app.pathPrefix
        })

        this.loader.add_texture("photo", this.app.pathPrefix + "img/E26005_WaterColorGL/photo2.jpg", {
            generateMipmaps: true
        })

        this.loader.emitter.on("onCompleted", () => {
            console.log("ALL ASSETS LOADED!")
            this.app.emitter.emit("onProjectLoaded", {})
        })

        this.loader.start()
    }

    build() {
        console.log("(E26005_WaterColorGL.build)!")

        this.params = {
            revealDuration: 6.4
        }

        this.world3D = new THREE.Object3D()
        this.scene.add(this.world3D)

        this.frame = new OrtoResponsiveFrame({
            app: this.app,
            project: this,
            itemRef: this.world3D,
            refWidth: this.app.size.REF.width,
            refHeight: this.app.size.REF.height,
            MODE: "COVER",
            SCALE_FACTOR: 1.0
        })

    }

    update_RAF() {
        this.frame.update_RAF()

    }

}

export default E26005_WaterColorGL
