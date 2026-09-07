import gsap from "gsap"
import ScrollTrigger from 'gsap/ScrollTrigger';
//import * as THREE from 'three'

import CanvasApp from './canvasApp/core/CanvasApp';
// // import E26001_GPUTest from "./canvasApp/projects/webGPU/E26001_GPUTest/E26001_GPUTest";
// // import E26005_WaterColorGL from "./canvasApp/projects/webGL/E26005_WaterColorGL/E26005_WaterColorGLv2";
// import E26005_WaterColorGPU from "./canvasApp/projects/webGPU/E26005_WaterColorGPU/E26005_WaterColorGPUv2";
// import E26006_InkRevealGPU from "./canvasApp/projects/webGPU/E26006_InkRevealGPU/E26006_InkRevealGPU";
// import E26005_WaterColorGL from "./canvasApp/projects/webGL/E26005_WaterColorGL/E26005_WaterColorGLv2";
// import E26007_MarsGL from "./canvasApp/projects/webGL/E26007_MarsGL/E26007_MarsGL";
// // import SimpleProjectGL from "./canvasApp/projects/webGL/SimpleProjectGL/SimpleProjectGL";
// // import ParticlesGPU from "./canvasApp/projects/webGPU/ParticlesGPU/ParticlesGPU";
// import E26003_InfiniteGrassGL from "./canvasApp/projects/webGL/E26003_InfiniteGrassGL/E26003_InfiniteGrassGL";
// // import CurrentProject from "./canvasApp/projects/webGPU/E26004_PageCurlGPU/E26004_PageCurlGPU";
// // import E26004_PageCurlGPU from "./canvasApp/projects/webGPU/E26004_PageCurlGPU/E26004_PageCurlGPU";
// // import E26003_InfiniteGrassGPU from "./canvasApp/projects/webGPU/E26003_PageCurlGPU/E26003_InfiniteGrassGPU";
// import E26003_InfiniteGrassGPU from "./canvasApp/projects/webGPU/E26003_InfiniteGrassGPU/E26003_InfiniteGrassGPU";
import E26902_BladeRunner from "./canvasApp/projects/webGPU/E26902_BladeRunner/E26902_BladeRunner";

gsap.registerPlugin(ScrollTrigger);

class Platform{
    constructor (obj){
        console.log("(Platform.CONSTRUCTOR): ", obj)
        //--
        const $webglContainer = document.querySelector('#canvas_app')
        const $mouseEvents = document.querySelector('#canvas_app')

        this.canvasApp = new CanvasApp({
            id:"test_app",
            //type: "WEBGL_APP",
            // type: "WEBGPU_APP",
            project: new E26902_BladeRunner(),
            $container: $webglContainer,
            $mouseEvents: $mouseEvents,
            pathPrefix:"./",
            initData: {},
            debug_mode: false,
            gui_mode: false,
            mobile_mode: false,

            render_background_alpha: 0,
            render_background_color: 0x222222,

            mouse_active: true,


            dev_active: true,        // Indicates if AppDev is instantiated
            dev_gui: true,             // Indicates if dat.gui is created (only if dev_active=true)
            dev_helpers: true,      // Indicates if helpers are instantiated  (only if dev_active=true) (false in prod)

            auto_active: true,
            // auto_init: true

            scrolls: ["scroll_main"],

        })
        // Tyrell is a scene viewer; it does not use the template's page scroll.

    }
    //----------------------------------------------
    // PUBLIC:
    init_scrollTriger(){
        console.log("(Platform.init_scrollTriger)!");
        //--
        this.scroll_main = ScrollTrigger.create({
            trigger: document.querySelector('#content'),
            start: 'top top',
            end: 'bottom bottom',
            markers: false,
            onUpdate: (self) => {   
                // console.log("+");
                const progress = self.progress
                const offesetY = (self.end - self.start) * self.progress
                this.canvasApp.update_scrollProgress("scroll_main", progress, offesetY);
            }
        });
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:
    
}
export default Platform
