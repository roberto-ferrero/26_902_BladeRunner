//import gsap from "gsap"
//import * as THREE from 'three'

class OrtoResponsiveFrame{
    constructor (obj){
        // console.log("(OrtoResponsiveFrame.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.itemRef = obj.itemRef
        this.REF_WIDTH = obj.refWidth // Width of the reference object/scene to scale
        this.REF_HEIGHT = obj.refHeight // Height of the reference object/scene to scale
        this.REF_ASPECT = this.REF_WIDTH / this.REF_HEIGHT
        this.SCALE_FACTOR = obj.SCALE_FACTOR || 1.0 // Additional scale factor to fine-tune the scaling
        this.MODE = obj.MODE || "COVER"
        /* MODES:
           COVER: ASPECT SAFE. CONTENT OVERFLOW
           CONTAIN: ASPECT SAFE. SHOWS ALL CONTENT
           STRETCH: NO ASPECT SAFE. ADJUST
        */
        /* AVAILABLE DATA:
            this.app.size.CURRENT.width // Current width of the viewport
            this.app.size.CURRENT.height // Current height of the viewport
            this.app.size.CURRENT.aspect // Current aspect ratio of the viewport

            this.app.size.ORIGINAL.width // Original width of the viewport
            this.app.size.ORIGINAL.height // Original height of the viewport
            this.app.size.ORIGINAL.aspect // Original aspect ratio of the viewport
        */

    }
    //----------------------------------------------
    // PUBLIC:
    
    //----------------------------------------------
    // UPDATE RAF:
    update_RAF(){
        const frameSize = this._get_frameSize()
        const currentAspect = frameSize.aspect
        // console.log("currentAspect: ", currentAspect+" / this.REF_ASPECT: ", this.REF_ASPECT);
        if(this.MODE == "COVER"){
            if(currentAspect > this.REF_ASPECT){
                // VIEWPORT MAS ANCHO
                this._adjust_frameWidth_to_VPWidth(frameSize)
            }else{
                // VIEWPORT MAS ALTO
                this._adjust_frameHeight_to_VPHeight(frameSize)
            }
            // return
        }else if(this.MODE == "CONTAIN"){
            // console.log("*** CONTAIN ***");
            if(currentAspect > this.REF_ASPECT){
                // VIEWPORT MAS ANCHO
                this._adjust_frameHeight_to_VPHeight(frameSize)
            }else{
                // VIEWPORT MAS ALTO
                this._adjust_frameWidth_to_VPWidth(frameSize)
            }
            // return
        } else if(this.MODE == "STRETCH"){
            this._adjust_both(frameSize)
            // return
        }
        //--
        //console.log("this.itemRef: ", this.itemRef);

        // console.log("this.itemRef.scale: ", this.itemRef.scale);
    }
    //----------------------------------------------
    // PRIVATE:
    _adjust_frameWidth_to_VPWidth(frameSize){
        const scale = (frameSize.width / this.REF_WIDTH) * this.SCALE_FACTOR
        this.itemRef.scale.x = scale
        this.itemRef.scale.y = scale
    }
    _adjust_frameHeight_to_VPHeight(frameSize){
        const scale = (frameSize.height / this.REF_HEIGHT) * this.SCALE_FACTOR
        this.itemRef.scale.x = scale
        this.itemRef.scale.y = scale
    }
    _adjust_both(frameSize){
        this.itemRef.scale.x = (frameSize.width / this.REF_WIDTH) * this.SCALE_FACTOR
        this.itemRef.scale.y = (frameSize.height / this.REF_HEIGHT) * this.SCALE_FACTOR
    }
    _get_frameSize(){
        const cameraVisibleSize = this.project?.stageCamera?.get_visibleSizeAtTarget?.()

        if(cameraVisibleSize){
            return cameraVisibleSize
        }

        return this.app.size.CURRENT
    }
    //----------------------------------------------
    // AUX:

  
}
export default OrtoResponsiveFrame
