//import gsap from "gsap"
//import * as THREE from 'three'
import Datos from "./utils/Datos"
import ScrollItem from "./utils/ScrollItem"

class AppScrolls{
    constructor (obj){
        // console.log("(AppScrolls.CONSTRUCTOR): ", obj)
        this.app = obj.app
        ///---
        this.scrolls = new Datos()
        for(var i=0; i<obj.scrolls.length; i++){
            const scroll_id = obj.scrolls[i]
            const scroll_item = new ScrollItem({
                app:this.app,
                id:scroll_id,
                emit:true,
            })
            this.scrolls.nuevoItem(scroll_id, scroll_item)
        }
    }
    //----------------------------------------------
    // PUBLIC:
    update_scrollProgress(scroll_id, value, offsetY){
        this.scrolls.getItem(scroll_id).update(value, offsetY) // Emits: onAppScrollUpdate
    }
    //----------------------------------------------
    // UPDATES:
    update_RAF(){
        this.scrolls.callAll("update_RAF")
    }
    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default AppScrolls