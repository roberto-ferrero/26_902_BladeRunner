//import gsap from "gsap"
//import * as THREE from 'three'

class AppSize{
    constructor (obj){
        // this.app.trace("(AppSize.CONSTRUCTOR): ", obj)
        this.app = obj.app
        this.camvasElem = document.getElementById("canvas")
        //--
        this.REF = {
            width:2000,
            height:1000,
            aspect:0,
        }
        this.REF.aspect = this.REF.width/this.REF.height
        //--
        this.ORIGINAL = {
            width:0,
            height:0,
            aspect:0,
        }
        
        //--
        //--
        this.CURRENT = {
            width:0,
            height:0,
            aspect:0,
        }
        //--
        this.RESPONSIVE_SCALE = {
            x:0,
            y:0
        }
        //--
        window.addEventListener('resize', this.listener_resize = ()=>{
            this.update()
        })
        //--
        this.app.emitter.on("onAppInit", ()=>{
            this.ORIGINAL.width = this.app.$container.offsetWidth
            this.ORIGINAL.height = this.app.$container.offsetHeight
            this.ORIGINAL.aspect = this.ORIGINAL.width/this.ORIGINAL.height
            // console.log("this.ORIGINAL: ", this.ORIGINAL);
        })
        //--
        this.update()
    }
    //----------------------------------------------
    // PUBLIC:
    update(){
        // let newWidth = document.documentElement.clientWidth
        // let newHeight = document.documentElement.clientHeight
        let newWidth = this.app.$container.offsetWidth
        let newHeight = this.app.$container.offsetHeight
        //----
        if(newWidth != this.CURRENT.width || newHeight != this.CURRENT.height){
            this.CURRENT.width = newWidth
            this.CURRENT.height = newHeight
            this.CURRENT.aspect = this.CURRENT.width/this.CURRENT.height
            this.RESPONSIVE_SCALE.x = this.CURRENT.width/this.REF.width
            this.RESPONSIVE_SCALE.y = this.CURRENT.height/this.REF.height
            if(this.app.render) this.app.render.update_resize();
            //--
            this.app.emitter.emit("onAppSizeUpdate")
        }
    }
    kill(){
        window.removeEventListener('resize', this.listener_resize, false)
    }
    update_RAF(){
        if(this.CURRENT.height != this.app.$container.offsetHeight){
            this.update()
        }
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:
}
export default AppSize