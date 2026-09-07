//import gsap from "gsap"
import * as THREE from 'three'

class StagePerspectiveCamera{
    constructor (obj){
        // console.log("(StagePerspectiveCamera.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.parent3D = obj.parent3D
        this.size = obj.size
        //--
        this.DISTANCE_TO_ORIGIN = 1000
        this.CAMERA_POSITION = new THREE.Vector3(0, 0, this.DISTANCE_TO_ORIGIN)
        this.TARGET_POSITION = new THREE.Vector3(0, 0, 0)
        this.VISIBLE_HEIGHT_AT_TARGET = 1000
        //--
        this.camera = new THREE.PerspectiveCamera(
            this._get_fov_for_targetHeight(),
            this.size.width / this.size.height,
            0.1,
            this.DISTANCE_TO_ORIGIN+500
        )
        
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
    get_visibleHeightAtTarget(){
        return this.VISIBLE_HEIGHT_AT_TARGET
    }
    get_visibleSizeAtTarget(){
        return {
            width: this.VISIBLE_HEIGHT_AT_TARGET * this.camera.aspect,
            height: this.VISIBLE_HEIGHT_AT_TARGET,
            aspect: this.camera.aspect
        }
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
        this.camera.fov = this._get_fov_for_targetHeight()
        this.camera.updateProjectionMatrix()
        this.camera_helper?.update()
    }
    //----------------------------------------------
    // AUX:
    _get_fov_for_targetHeight(){
        const targetDistance = this.CAMERA_POSITION.distanceTo(this.TARGET_POSITION)

        if(targetDistance <= 0){
            console.warn("StagePerspectiveCamera: CAMERA_POSITION and TARGET_POSITION cannot be the same.")
            return 35
        }

        return THREE.MathUtils.radToDeg(
            2 * Math.atan(this.VISIBLE_HEIGHT_AT_TARGET / (2 * targetDistance))
        )
    }

  
}
export default StagePerspectiveCamera
