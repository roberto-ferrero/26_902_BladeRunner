//import gsap from "gsap"
//import * as THREE from 'three'

class ScrollItem{
    constructor (obj){
        //console.log("(ScrollItem.CONSTRUCTOR): ", obj)
        this.app = obj.app
        this.id = obj.id
        this.emit = obj.emit
        //--
        this.PROGRESS = 0
        this.LAST = 0
        this.LAST_RAF = 0
        this.DELTA = 0
        this.VEL = 0
        this.OFFESET_Y = 0
    }
    //----------------------------------------------
    // PUBLIC:
    update(value, offsetY){
        this.LAST = this.PROGRESS
        this.PROGRESS = value
        //--
        if(Math.abs(this.LAST-this.PROGRESS) < 0.0001){
            this.DELTA = 0
        }else if(this.LAST < this.PROGRESS){
            this.DELTA = 1
        }else if(this.LAST > this.PROGRESS){
            this.DELTA = -1
        }
        //--
        this.OFFESET_Y = offsetY
        //--
        if(this.emit){
            this.app.emitter.emit("onAppScrollUpdate", {
                id:this.id,
                scroll: this
            })
        }
    }
    update_RAF(){
        this.VEL = this.LAST_RAF-this.PROGRESS
        this.LAST_RAF = this.PROGRESS
    }
    //----------------------------------------------
    // PRIVATE:
    //----------------------------------------------
    // AUX:

  
}
export default ScrollItem