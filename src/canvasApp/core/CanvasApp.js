import gsap from "gsap"
import * as THREE from 'three'

import AppState from './AppState';
import AppSize from './AppSize';
import AppDev from './AppDev';
import AppRender from './AppRender';
import AppScrolls from './AppScrolls';

// import AppLoaders from './AppLoaders';
// import AppState from './AppState';
// import AppMouse from './AppMouse';

// import Datos from '../utils/Datos';

const EventEmitter = require('events');

const APP_READY_MODES = {
    BUILD: "BUILD",
    FIRST_ACTIVE_RENDER: "FIRST_ACTIVE_RENDER"
}

class CanvasApp{
    constructor (obj){
        // // console.log("(CanvasApp.CONSTRUCTOR): build:"+__APP_BUILD_VER__, obj)
        // console.log("(CanvasApp.CONSTRUCTOR):", obj)
        this.app = this
        this.rnd = Math.random()
        this.$container = obj.$container // DIV contenedor donde se añadirá el canvas
        this.$mouseEvents = obj.$mouseEvents // DIV donde se escucharán los eventos de mouse (puede ser el mismo que el contenedor del canvas o otro distinto)
        //----------------------
        // INIT PARAMETERS:
        this.instanceId = obj.instanceId 
        this.id= obj.id
        this.modelId = obj.model
        this.modelPosition = new THREE.Vector3(
            Number(obj.x) || 0,
            Number(obj.y) || 0,
            0
        ),
        this.scenarioWidth = this.$container.offsetWidth
        this.scenarioHeight = this.$container.offsetHeight
        this.modelScale = Number(obj.scale) || 1
        this.responsiveScale = this.scenarioWidth/1531
        this.modelScale *= this.responsiveScale
        //-------
        this.pathPrefix = obj.pathPrefix
        this.initData = obj.initData
        this.render_background_color = obj.render_background_color || 0x000000
        //----------------------
        this.project = obj.project || null
        //----------------------
        this.TYPE = obj.project.type || "WEBGL_APP" // "WEBGL_APP", "WEBGPU_APP"
        this.DEBUG_MODE = obj.debug_mode ?? true;
        this.GUI_MODE = obj.gui_mode;
        this.MOBILE_MODE = obj.mobile_mode || false;
        this.AUTO_ACTIVE = obj.auto_active === true;
        // APP_READY_MODE: "BUILD" emits ready after build; "FIRST_ACTIVE_RENDER" waits for real RAF renders.
        this.APP_READY_MODE = obj.app_ready_mode || obj.ready_mode || APP_READY_MODES.FIRST_ACTIVE_RENDER;
        this.APP_READY_RENDER_COUNT = obj.app_ready_render_count || 2;
        //----------------------
        // this.ACTIVE = true;
        // this.BUILT = false;
        //----------------------
        //-- RAF state
        this._rafId = null
        this._isRunning = false
        this._isKilled = false
        //----------------------
        // EMITTER:
        this.emitter = new EventEmitter()
        this.emitter.setMaxListeners(2000)
        //----------------------
        // CLOCK:
        this.clock = new THREE.Clock()
        this.DELTA_TIME = 0
        this.ELAPSED_TIME = 0
        //----------------------


        //----------------------
        // APP STATE:
        this.state = new AppState({app:this})
        //----------------------

        //----------------------
        // APP SIZE:
        this.size = new AppSize({app:this})
        //----------------------

        //----------------------
        // APP DEV:
        this.app.emitter.on("onRendererReady", ()=>{
            this._eval_init()
        })
        this.dev = new AppDev({app:this})
        //----------------------
        
        //----------------------
        // APP SCROLLS:
        if(obj.scrolls) this.scrolls = new AppScrolls({app:this, scrolls:obj.scrolls})
        //----------------------

        //----------------------
        // APP RENDER:
        this.render = new AppRender({app:this})
        //----------------------
        
        //----------------------
        // MOUSE:
        // this.mouse = new AppMouse({app:this})
        //----------------------




        //----------------------
        this.bindedRAF = this._update_RAF.bind(this)
        //----------------------


        
        //----------------------
        this.app.emitter.on("onProjectLoaded", ()=>{
            this._build()
        })


        //----------------------
        this.state.set_appConstructed()
        this._eval_init()

        //----------------------
    }
    //----------------------------------------------
    // INICIALIZATION:
    _eval_init(){
        if(this.state.RENDER_READY && this.state.APP_CONSTRUCTED){
            this._init()
        }
    }
    _init(){
        // console.log("(CanvasApp.init)!")
        this.scene = this.render.scene
        this.dev.add_gui_controls()
        //--
        this.project.init(this)
        this.render.set_stageCamera(this.project.stageCamera.get_camera())
        //--
        this.emitter.emit("onAppInit")
        //--
        
    }
    _build(){
        console.log("(CanvasApp._build)!")
        this.project.build()
        this.emitter.emit("onAppBuild")
        //--
        if(this.APP_READY_MODE === APP_READY_MODES.BUILD){
            this._setAppReady()
        }
        if(this.AUTO_ACTIVE){
            this.activate()
        }else if(this.state.ACTIVE){
            this._startRAF()
        }
    }


    //----------------------------------------------
    // PUBLIC API:
    showModel(modelPos){
        if(this.app.id == "multiSobre"){
            console.log("(CanvasApp.showModel): "+modelPos)
            this.project.scenario.showModel(modelPos)
        }
    }
    activate(){
        this.state.activate()
        this._startRAF()
    }
    deactivate(){
        this.state.deactivate()
        this._stopRAF()
    }
    update_scrollProgress(scrollId, progress, offesetY){
        this.scrolls.update_scrollProgress(scrollId, progress, offesetY)
    }

    kill(){
        if (this._isKilled) return
        // console.log("-----------------------------------");
        console.log("(CanvasApp.kill):"+this.id+" rnd:"+this.rnd);
        // console.log("-----------------------------------");
        this._isKilled = true
        this.deactivate()
        this.emitter.emit("onAppKill")
        this.size.kill()
        this.dev.kill()
        gsap.delayedCall(0.1, ()=>{
            this.stage = null
            this.emitter.removeAllListeners()
            // this = null
        })
    }
    get_render(){
        if(this.render.renderer){
            return this.render.renderer
        }else{
            console.warn("CanvasApp.get_render: No renderer available!")
            return null
        }
    }
    //----------------------------------------------
    // INTERNAL:


    //----------------------------------------------
    // UPDATE RAF:
    _startRAF(){
        if(this._isKilled || !this.state.ACTIVE || !this.state.BUILT || this._isRunning || this._rafId !== null){
            return
        }
        this._consumeClockDelta()
        this._isRunning = true
        this._rafId = requestAnimationFrame(this.bindedRAF)
    }
    _stopRAF(){
        this._isRunning = false
        if(this._rafId !== null){
            cancelAnimationFrame(this._rafId)
            this._rafId = null
        }
    }
    _update_RAF(){
        // console.log("(CanvasApp._update_RAF)!")
        // console.log("this.state.ACTIVE", this.state.ACTIVE);
        // console.log("this.state.APP_READY", this.state.APP_READY);

        this._rafId = null
        if(this._isKilled || !this.state.ACTIVE || !this.state.BUILT){
            this._isRunning = false
            return;
        }
        //--
        // console.log("*raf: instanceId:"+this.instanceId);
        //--
        this.DELTA_TIME = this.clock.getDelta();
        this.ELAPSED_TIME = this.clock.getElapsedTime();
        //--
        this.state.update_RAF()
        this.size.update_RAF()
        this.render.update_RAF()
        this.dev.update_RAF()
        // this.mouse?.update_RAF()
        this.project?.update_RAF?.()
        this._updateAppReadyFromRAF()
        // this.fps.update_RAF()
        //--
        // this.scrolls.callAll("update_RAF")
        //--
        this.emitter.emit("onUpdateRAF", {time: this.ELAPSED_TIME, delta: this.DELTA_TIME})
        if(this.state.ACTIVE && !this._isKilled){
            this._rafId = requestAnimationFrame(this.bindedRAF)
        }else{
            this._isRunning = false
        }
    }
    _consumeClockDelta(){
        if(!this.clock){
            return
        }
        this.clock.getDelta()
    }
    _updateAppReadyFromRAF(){
        if(this.APP_READY_MODE !== APP_READY_MODES.FIRST_ACTIVE_RENDER){
            return
        }
        if(!this.state.APP_READY && this.render.RENDER_COUNT >= this.APP_READY_RENDER_COUNT){
            this._setAppReady()
        }
    }
    _setAppReady(){
        if(!this.state.APP_READY){
            this.state.set_appReady()
        }
    }

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:


}
export default CanvasApp
