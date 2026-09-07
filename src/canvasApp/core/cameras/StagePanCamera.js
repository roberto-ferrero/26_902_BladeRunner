//import gsap from "gsap"
import * as THREE from 'three'

class StagePanCamera{
    constructor (obj){
        console.log("(StagePanCamera.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.parent3D = obj.parent3D
        this.size = obj.size
        //--
        // this.CAMERA_POSITION = new THREE.Vector3(0, 0, 2000)
        this.CAMERA_POSITION = new THREE.Vector3(157.6120169124945,54.4969859207974, 255.78109690993813)
        this.TARGET_POSITION = new THREE.Vector3(0, 0, 0)
        this.FOV = obj.fov || 30
        this.NEAR = obj.near || 0.1
        this.FAR = obj.far || 2200
        //--
        this.camera = new THREE.PerspectiveCamera(
            this.FOV,
            this.size.width / this.size.height,
            this.NEAR,
            this.FAR
        )
        this.camera.position.copy(this.CAMERA_POSITION)
        this.camera.lookAt(this.TARGET_POSITION)
        this.camera.name = "stageCamera"
        this.camera.updateProjectionMatrix()
        this.parent3D.add(this.camera)
        //--
        this.camera_helper = new THREE.CameraHelper(this.camera)
        this.parent3D.add(this.camera_helper)
        this.app.dev.register_helper(this.camera_helper)
        this.app.emitter.on("onAppSizeUpdate", ()=>{
            this._resize(this.app.size.CURRENT)
        })
    }
    //----------------------------------------------
    // PUBLIC:
    get_camera(){
        return this.camera
    }
    get_position(){
        return this.CAMERA_POSITION
    }
    get_targetPosition(){
        return this.TARGET_POSITION
    }
    //-----------------
    init(){
        // NADA
    }
    build(){
        // NADA
    }
    start(){
        // NADA
    }
    update_RAF(){
        // NADA
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:
    _resize(size){
        this.size = size
        this.camera.aspect = this.size.width / this.size.height
        this.camera.updateProjectionMatrix()
    }
    //----------------------------------------------
    // AUX:

  
}
export default StagePanCamera
