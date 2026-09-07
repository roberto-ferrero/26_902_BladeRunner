//import gsap from "gsap"
import * as THREE from 'three'

class StageOrtoCamera{
    constructor (obj){
        // console.log("(StageOrtoCamera.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.parent3D = obj.parent3D
        this.size = obj.size
        //--
        this.CAMERA_POSITION = new THREE.Vector3(0, 0, 1000)
        this.TARGET_POSITION = new THREE.Vector3(0, 0, 0)
        //--
        this.camera = new THREE.OrthographicCamera(-this.size.width*0.5, this.size.width*0.5, this.size.height*0.5, -this.size.height*0.5, 0, 1500)
        this.camera.position.copy(this.CAMERA_POSITION)
        this.camera.lookAt(this.TARGET_POSITION)
        this.camera.name = "stageCamera"
        this.camera.updateProjectionMatrix()
        this.parent3D.add(this.camera)
        //--
        this.camera_helper = new THREE.CameraHelper( this.camera );
        this.parent3D.add( this.camera_helper );
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
        this.camera.left = -this.size.width*0.5
        this.camera.right = this.size.width*0.5
        this.camera.top = this.size.height*0.5
        this.camera.bottom = -this.size.height*0.5
        this.camera.updateProjectionMatrix()
    }
    //----------------------------------------------
    // AUX:

  
}
export default StageOrtoCamera
