//import gsap from "gsap"
import * as THREE from 'three'

import AssetLoader from '../../../core/AssetLoder/AssetLoader';
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'


class SimpleProjectGL{
    constructor (){
        console.log("(SimpleProjectGL.CONSTRUCTOR)!")
        this.type = "WEBGL_APP"
        //----------------------
    }
    init(app){
        console.log("(SimpleProjectGL.init)!")
        this.app = app
        this.scene = this.app.render.scene
        //---------------

        //---------------
        // STAGE CAMERA:
        this.stageCamera = new StageOrtoCamera({
            app:this.app,
            project:this,
            parent3D:this.scene,
            size:this.app.size.CURRENT
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())
        //---------------

        //---------------
        // LOADER:
        this.loader = new AssetLoader({
            app:this.app,
            pathPrefix: this.app.pathPrefix
        })
        //--
        this.loader.add_texture("dev", this.app.pathPrefix+"img/bg.jpg", true)
        this.loader.add_gltf("suzanne", this.app.pathPrefix+"glbs/suzanne.glb", false)
        //--
        this.loader.emitter.on("onCompleted", ()=>{
            console.log("ALL ASSETS LOADED!");
            this.app.emitter.emit("onProjectLoaded", {})
        })
        this.loader.start()
        //---------------
    }
    build(){
        console.log("(SimpleProjectGL.build)!");

        //-------------
        // WORLD3D_
            this.world3D = new THREE.Object3D()
            this.scene.add(this.world3D)
        //-------------


        //-------------
        // FRAME:
        this.frame = new OrtoResponsiveFrame({
            app:this.app,
            project:this,
            itemRef: this.world3D,
            refWidth: this.app.size.REF.width,
            refHeight: this.app.size.REF.height,
            MODE: "COVER",
            SCALE_FACTOR: 1.0
        })
        //-------------


        const devTexture = this.loader.get_texture("dev")
        const geometry = new THREE.PlaneGeometry(this.app.size.REF.width, this.app.size.REF.height)
        const material = new THREE.MeshBasicMaterial({
            map: devTexture
        })
        this.mesh = new THREE.Mesh(geometry, material)
        this.world3D.add(this.mesh)


        //-------------
        // LIGHTS:
        const envLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(envLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);
        //-------------
        this.suzanne_mesh = this.loader.get_gltf("suzanne")
        this.physical_material = new THREE.MeshPhysicalMaterial({
            transmission: 1.0,
            thickness: 2.0,
            ior: 1.5,
            roughness: 0.2,
            iridescence: 0.0,
            iridescenceIOR: 1.3,
            reflectivity: 0.5,
            envMapIntensity: 1.0,
            side: THREE.DoubleSide,
            metalness: 0,
            transparent: true,
            wireframe: false
        });

        this.suzanne_mesh.traverse((child) => {
        if (child.isMesh) {
            child.material = this.physical_material;
            child.castShadow = true;
            child.receiveShadow = true;
        }
        });
        this.suzanne_mesh.scale.set(100, 100, 100)
        this.suzanne_mesh.position.set(0, 0, 200)
        this.world3D.add(this.suzanne_mesh);

    }
    //----------------------------------------------
    // UPDATES:
    update_RAF(){
        this.frame.update_RAF()
        //--
        const time = this.app.ELAPSED_TIME
        this.physical_material.thickness = Math.sin(time) * 1.5 + 2.0
        this.physical_material.iridescence = Math.max(0, Math.sin(time))
    }
    //----------------------------------------------
    // PUBLIC API:
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

}
export default SimpleProjectGL
