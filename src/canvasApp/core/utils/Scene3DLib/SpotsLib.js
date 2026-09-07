//import gsap from "gsap"
import * as THREE from 'three'
import Datos from '../Datos'

class SpotsLib{ //
    constructor (obj){
        // console.log("(SpotsLib.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.scenario = obj.scenario
        //-----------------------------
        this.DATA = new Datos()
        //-----------------------------
    }
    //----------------------------------------------
    // PUBLIC:
    addItem(spotId, obj3D){
        // console.log("(SpostsLib.add_spot): ", spotId, obj3D);
        this.DATA.nuevoItem(spotId, obj3D)
    }
    add_cameraspot(spotId, cameraObj){
        // console.log("(SpotsLib.add_cameraspot): ", cameraObj);
        this.DATA.nuevoItem(spotId, cameraObj)
    }
    //--------
    getItemPosition(spotId){
        // console.log("(SpotsLib.get_spot): ", spotId);
        return this.DATA.getItem(spotId).position.clone();
    }
    getItem(spotId){
        // console.log("(SpotsLib.get_spot): ", spotId);
        return this.DATA.getItem(spotId)
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default SpotsLib