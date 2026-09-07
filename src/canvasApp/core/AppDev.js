import * as dat from 'dat.gui';
//import gsap from "gsap"
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

class AppDev{
    constructor (obj){
        // console.log("(AppDev.CONSTRUCTOR): ", obj)
        this.app = obj.app
        //--
        this.SHOW_DEV_CAMERA = false
        this.SHOW_BACKSTAGE = false
        //--
        this.helpers_array = []
        this.devCamera = null
        //--
        this.gui = null
        this.gui_data = {
            show_dev_camera: false,
            show_backstage:false,
            scroll_progress1:0,
            scroll_progress2:0
        }
        //--
        this.init_devCamera()
        if(!this.app.MOBILE_MODE) this.init_controls()
        if(this.app.DEBUG_MODE) this.init_keyShortcuts()
        if(this.app.GUI_MODE) this.init_gui()

        //--   
        this.app.emitter.on("onAppSizeUpdate", ()=>{
            this.helpers_array.forEach((ref)=>{
                if(ref && typeof ref.update === "function") ref.update()
            })
        }) 
    }
    //----------------------------------------------
    // INITS:
    init_gui(){
        if(this.app.GUI_MODE){
            this.gui = new dat.GUI({
                width: 400
            })
        }
    }

    add_gui_controls(){
        if(this.app.GUI_MODE){
            this.gui.add(this.gui_data, 'show_dev_camera').listen().onChange((value) => {
                this.app.emitter.emit("onAppDevCamera", {show:this.SHOW_DEV_CAMERA})
                if(value){
                    this.show_dev_camera()
                    // if(this.controls) this.controls.enabled = true
                }else{
                    this.hide_dev_camera()
                    // if(this.controls) this.controls.enabled = false
                }
            });
            this.gui.add(this.gui_data, 'show_backstage').listen().onChange((value) => {
                if(value){
                    this.show_backstage()
                }else{
                    this.hide_backstage()
                }
            });
            this.gui.open();
            const $dg = document.querySelector(".dg")
            $dg.style.zIndex = "10"
        }
    }

    init_keyShortcuts(){
        document.addEventListener("keydown", this.listener_keypress = (self) =>{
            if(self.key == "b"){
                this.switch_backstage()
            }else if(self.key == "c"){
                this.switch_cameras()
            }
        }, false)
    }

    init_devCamera(){
        this.devCamera = new THREE.PerspectiveCamera(70, this.app.size.CURRENT.width / this.app.size.CURRENT.height, 0.1, 20000 );
        // this.devCamera.position.set(25, 25, 1000)
        this.devCamera.position.set(-99, 22, 2150)
        this.devCamera.lookAt(new THREE.Vector3(0, 0, 0))
        this.devCamera.name = "devCamera"
    }
    init_controls(){
        this.controls = new OrbitControls(this.devCamera, this.app.$mouseEvents)
        // this.controls.autoRotate = trues
        this.controls.enabled = this.SHOW_DEV_CAMERA
    }


    //----------------------------------------------
    // PUBLIC:
    get_devCamera(){
        return this.devCamera
    }
    kill(){
        document.removeEventListener('keydown', this.listener_keypress)
        this.controls?.dispose()
        this.gui?.destroy()
    }
    switch_backstage(){
        if(this.SHOW_BACKSTAGE){
            this.hide_backstage()
        }else{
            this.show_backstage()
        }
    }
    switch_cameras(){
        if(this.SHOW_DEV_CAMERA){
            this.hide_dev_camera()
        }else{
            this.show_dev_camera()
        }
    }
    show_backstage(){
        if(!this.SHOW_BACKSTAGE){
            if(this.app.dev) //console.log("(AppDev.show_backstage):",this.helpers_array);
            this.SHOW_BACKSTAGE = true
            this.app.emitter.emit("onAppDevBackstage", {show:this.SHOW_BACKSTAGE})
            for(var i=0; i<this.helpers_array.length; i++){
                const ref = this.helpers_array[i]
                //console.log(ref);
                ref.visible = true
            }
            if(this.gui) this.gui_data.show_backstage = this.SHOW_BACKSTAGE
        }
    }
    hide_backstage(){
        if(this.SHOW_BACKSTAGE){
            if(this.app.dev) //console.log("(AppDev.hide_backstage):",this.helpers_array);
            this.SHOW_BACKSTAGE = false
            this.app.emitter.emit("onAppDevBackstage", {show:this.SHOW_BACKSTAGE})
            for(var i=0; i<this.helpers_array.length; i++){
                const ref = this.helpers_array[i]
                ref.visible = false
            }
            if(this.gui) this.gui_data.show_backstage = this.SHOW_BACKSTAGE
        }
    }
    
    show_dev_camera(){
        if(!this.SHOW_DEV_CAMERA){
            this.SHOW_DEV_CAMERA = true
            this.app.emitter.emit("onAppDevCamera", {show:this.SHOW_DEV_CAMERA})
            if(this.gui) this.gui_data.show_dev_camera = this.SHOW_DEV_CAMERA
            if(this.controls) this.controls.enabled = true
        }
    }
    hide_dev_camera(){
        if(this.SHOW_DEV_CAMERA){
            this.SHOW_DEV_CAMERA = false
            this.app.emitter.emit("onAppDevCamera", {show:this.SHOW_DEV_CAMERA})
            if(this.gui) this.gui_data.show_dev_camera = this.SHOW_DEV_CAMERA
            if(this.controls) this.controls.enabled = false
        }
    }

    update_RAF(){
        if(this.controls) this.controls.update()
            // console.log(this.devCamera.position);
    }

    register_helper(ref){
        this.helpers_array.push(ref)
        if(this.SHOW_BACKSTAGE){
            ref.visible =true
        }else{
            ref.visible =false
        }
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default AppDev
