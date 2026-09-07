//import gsap from "gsap"
import * as THREE from 'three'
import Datos from '../Datos'

class MeshesLib{ //
    constructor (obj){
        // console.log("(MeshesLib.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.scenario = obj.scenario
        //-----------------------------
        this.DATA = new Datos()
        //-----------------------------
    }
    //----------------------------------------------
    // PUBLIC:
    addItem(meshId, obj3D, materialId){
        // console.log("(MseshesLib.addItem): ", meshId, materialId);
        obj3D.__materialId = materialId
        this.DATA.nuevoItem(meshId, obj3D)
    }
    getItem(meshId){
        // console.log("(MeshesLib.get_spot): ", meshId);
        return this.DATA.getItem(meshId);
    }
    // getItem2(meshId){
    //     // console.log("(MeshesLib.get_spot): ", meshId);
    //     return this.DATA.getItem(meshId).clone();
    // }
    getItem2(meshId){
        const original = this.DATA.getItem(meshId);
        const clon = original.clone();
        
        // Copiar propiedades custom manualmente
        if(original.__materialId) clon.__materialId = original.__materialId;
        
    return clon;
    }

    getItemPosition(spotId){
        // console.log("(SpotsLib.get_spot): ", spotId);
        return this.DATA.getItem(spotId).position.clone();
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:
    //----------------------------------------------
    // AUX:

  
}
export default MeshesLib