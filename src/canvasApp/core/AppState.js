//import gsap from "gsap"
//import * as THREE from 'three'

class AppState{
    constructor (obj){
        // console.log("(AppState.CONSTRUCTOR): ", obj)
        this.app = obj.app
        //--
        this.ACTIVE = false
        this.BUILT = false
        this.MOBILE_MODE = obj.mobile_mode || false
        this.APP_CONSTRUCTED = false
        this.APP_READY = false
        this.RENDER_READY = false
        this.RENDER_COUNT = 0
        //--
        this.app.emitter.on("onRendererReady", ()=>{
            this.RENDER_READY = true
        })
        this.app.emitter.on("onAppBuild", ()=>{
            if(this.BUILT){
                console.warn("WebGLApp SHOULD ONLY BE BUILT ONCE!!")
            } 
            this.BUILT = true
            // console.log("(AppState.onAppBuild): BUILT =", this.BUILT);
        })
    }
    //----------------------------------------------
    // PUBLIC:
    activate(){
        let hasChanged = false
        if(!this.ACTIVE){
            hasChanged = true
        }
        this.ACTIVE = true
        if(hasChanged){
            console.log("(AppState.activate)("+this.app.instanceId+"): ACTIVE =", this.ACTIVE);
            this.app.emitter.emit("onAppStateActivate")
        }
    }
    deactivate(){
        let hasChanged = false
        if(this.ACTIVE){
            hasChanged = true
        }
        this.ACTIVE = false
        if(hasChanged){
            console.log("(AppState.deactivate)("+this.app.instanceId+"): ACTIVE =", this.ACTIVE);
            this.app.emitter.emit("onAppStateDeactivate")
        } 
    }

    update_MOBILE_MODE(value){
        let hasChanged = false
        if(value != this.MOBILE_MODE){
            hasChanged = true
        }
        this.MOBILE_MODE = value
        if(hasChanged){
            console.log("(AppState.update_MOBILE_MODE): MOBILE_MODE =", this.MOBILE_MODE);
            this.app.emitter.emit("onAppStateNewMobileMode")
        }
    }
    set_appConstructed(){
        if(this.APP_CONSTRUCTED){
            console.warn("CanvasApp SHOULD ONLY SET TO APP_CONSTRUCTED ONCE!!")
        } 
        this.APP_CONSTRUCTED = true
        // console.log("(AppState.set_appConstructed): APP_CONSTRUCTED =", this.APP_CONSTRUCTED);
        this.app.emitter.emit("onAppConstructed")
    }
    set_appReady(){
        if(this.APP_READY){
            console.warn("CanvasApp SHOULD ONLY SET TO APP_READY ONCE!!")
        } 
        this.APP_READY = true
        // console.log("(AppState.set_appReady): APP_READY =", this.APP_READY);
        this.app.emitter.emit("onAppStateReady")
    }
    update_RAF(){
        this.RENDER_COUNT++
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default AppState