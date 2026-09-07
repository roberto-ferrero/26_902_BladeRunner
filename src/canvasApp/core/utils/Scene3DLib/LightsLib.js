//import gsap from "gsap"
import * as THREE from 'three'
import Datos from '../Datos'

class LightLib{ //
    // app.project.libs[arealights, pointlights, sunlights]
    constructor (obj){
        // console.log("(LightLib.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.scenario = obj.scenario
        //-----------------------------
        this.DATA = new Datos()
        this.arrayIds = []
        //-----------------------------
    }
    //----------------------------------------------
    // PUBLIC:
    addItem(itemId, obj3D){
        // console.log("(LightLib.add_spot): ", itemId);
        this.arrayIds.push(itemId)
        this.DATA.nuevoItem(itemId, obj3D)
    }
    getItem(itemId){
        return this.DATA.getItem(itemId);
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default LightLib