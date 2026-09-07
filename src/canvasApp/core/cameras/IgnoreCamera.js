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
        this.CAMERA_POSITION = new THREE.Vector3(0, 0, 2000)
        this.TARGET_POSITION = new THREE.Vector3(0, 0, 0)
        this.FOV = obj.fov || 30
        this.NEAR = obj.near || 0.1
        this.FAR = obj.far || 3000
        this.XPAN_LIMIT = obj.xpan_limit || 100 // Maximun absolute traslation of this.camera_xpan in the x axis. This is the "pan" effect, so it should be a small value, like 100 or 200
        this.YPAN_LIMIT = obj.ypan_limit || 100 // Maximun absolute traslation of this.camera_ypan in the y axis. This is the "pan" effect, so it should be a small value, like 100 or 200
        this.XPAN_FACTOR = obj.xpan_factor || 0 // -1 to 1 factor that multiplies the mouse position to generate the camera_xpan translation. So if the mouse is at the right edge of the screen, and xpan_factor is 0.5, the camera_xpan will be translated 50 units to the right (if xpan_limit is 100). If the mouse is at the left edge of the screen, and xpan_factor is 0.5, the camera_xpan will be translated 50 units to the left (if xpan_limit is 100). If xpan_factor is 0, there will be no pan effect.
        this.YPAN_FACTOR = obj.ypan_factor || 0 // -1 to 1 factor that multiplies the mouse position to generate the camera_ypan translation. So if the mouse is at the top edge of the screen, and ypan_factor is 0.5, the camera_ypan will be translated 50 units up (if ypan_limit is 100). If the mouse is at the bottom edge of the screen, and ypan_factor is 0.5, the camera_ypan will be translated 50 units down (if ypan_limit is 100). If ypan_factor is 0, there will be no pan effect.
        //--
        this.camera = new THREE.PerspectiveCamera(
            this.FOV,
            this.size.width / this.size.height,
            this.NEAR,
            this.FAR
        )
        //-------
        // STRUCTURE: camera_holder > camera_xpan > camera_ypan > camera
        this.camera_holder = new THREE.Object3D()
        this.camera_holder.name = "camera_holder"
        this.parent3D.add(this.camera_holder)
        this.camera_xpan = new THREE.Object3D()
        this.camera_xpan.name = "camera_xpan"
        this.camera_holder.add(this.camera_xpan)
        this.camera_ypan = new THREE.Object3D()
        this.camera_ypan.name = "camera_ypan"
        this.camera_xpan.add(this.camera_ypan)
        this.camera_ypan.add(this.camera)
        //-------
        this.camera_holder.copy(this.CAMERA_POSITION)
        this.camera.lookAt(this.TARGET_POSITION)
        this.camera.name = "stageCamera"
        this.camera.updateProjectionMatrix()
        //--
        this.camera_holder_helper = 
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
