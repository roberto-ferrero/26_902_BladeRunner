//import gsap from "gsap"
import * as THREE from 'three'
import * as THREE_GPU from 'three/webgpu'
import * as TSL from 'three/tsl';
// import { time, sin, float } from 'three/tsl';

import AssetLoader from '../../../core/AssetLoder/AssetLoader';
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'


class SimpleProjectGPU{
    constructor (){
        console.log("(SimpleProjectGPU.CONSTRUCTOR)!")
        this.type = "WEBGPU_APP"
        //----------------------
    }
    init(app){
        console.log("(SimpleProjectGPU.init)!")
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
        console.log("(SimpleProjectGPU.build)!");

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
        const material = new THREE_GPU.MeshBasicNodeMaterial()
        material.colorNode = TSL.texture(devTexture, TSL.uv())
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
        this.physical_material = new THREE_GPU.MeshPhysicalNodeMaterial({
            transmission: 1.0,      // Totalmente transmisivo
            thickness: 1.0,         // Grosor del "cristal"
            ior: 1.5,               // Índice de refracción
            roughness: 0.3,         // Rugosidad (afecta al blur de la refracción)
            iridescence: 0.5,       // Opcional: efecto irisado
            metalness: 0,
            transparent: true,
            wireframe: false
        });

        // El grosor oscilará suavemente, cambiando la refracción
        this.physical_material.thicknessNode = TSL.sin(TSL.time).mul(1.5).add(2.0);

        // El color de la iridiscencia puede reaccionar a la posición local
        this.physical_material.iridescenceNode = TSL.sin(TSL.time);

        this.suzanne_mesh.traverse((child) => {
        if (child.isMesh) {
            child.material = this.physical_material;
            
            // Optimización WebGPU: permite que la malla genere sombras 
            // y reciba refracciones correctamente
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
        // NADA
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
export default SimpleProjectGPU
