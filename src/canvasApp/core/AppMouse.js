//import gsap from "gsap"
import * as THREE from 'three'

import EasedOutValue from "../utils/EasedOutValue"
import NumberUtils from "../utils/NumberUtils"

class AppMouse{
    constructor (obj){
        // this.app.trace("(AppMouse.CONSTRUCTORA): ", obj)
        this.app = obj.app
        //--
        this.OVER = false
        //--
        this.DOWN = false
        this.DOWN_POS_NORM2 = new THREE.Vector2(0, 0) //from -1 to 1
        this.MOVE_POS_NORM2 = new THREE.Vector2(0, 0) //from -1 to 1
        this.DRAG_OFFSET_NORM2 = new THREE.Vector2(0, 0) //from -1 to 1
        //--
        this.POSITION_NORM = { // from -1 to 1
            x:0,
            y:0
        }
        this.POSITION_NORM_V2 = new THREE.Vector2(0, 0) // from -1 to 1
        //----------

        this.POSITION2_NORM = { // from 0 to 1
            x:0,
            y:0
            
        }
        this.POSITION3_NORM = { // from 0 to 1
            x:0,
            y:0
        }
        this.POSITION_EASED = { // from -1 to 1
            x: new EasedOutValue(0, 0.01, 0.001, this.app.emitter, "onUpdateRAF"),
            y: new EasedOutValue(0, 0.01, 0.001, this.app.emitter, "onUpdateRAF")
        }
        this.POSITION2_EASED = { // from 0 to 1
            x: new EasedOutValue(0, 0.02, 0.001, this.app.emitter, "onUpdateRAF"),
            y: new EasedOutValue(0, 0.02, 0.001, this.app.emitter, "onUpdateRAF"),
            position: new THREE.Vector2(0, 0),
            last0_x:0,
            last0_y:0,
            last_x:0,
            last_y:0,
            delta_x:0,
            delta_y:0,
            dir: new THREE.Vector2(0, 0)
        }
        this.POSITION3_EASED = { // from 0 to 1
            x: new EasedOutValue(0, 0.1, 0.001, this.app.emitter, "onUpdateRAF"),
            y: new EasedOutValue(0, 0.1, 0.001, this.app.emitter, "onUpdateRAF"),
            position: new THREE.Vector2(0, 0),
            last0_x:0,
            last0_y:0,
            last_x:0,
            last_y:0,
            delta_x:0,
            delta_y:0,
            dir: new THREE.Vector2(0, 0)
        }
        //---------------
        this.INERTIA = 0
        //---------------

        //--
        if(this.app.$mouseEvents){
            //console.log("this.app.$mouseEvents: ", this.app.$mouseEvents);
            this.createListeners(this.app.$mouseEvents)
        }
        /*
        this.domTarget.addEventListener('mouseover', this.listener_mouseover = (self) =>{
            // this.app.trace("mouseover");
            this.set_OVER(true)
        }, false);

        this.domTarget.addEventListener('mouseout', this.listener_mouseout = (self) =>{
            this.app.trace("mouseout");
            this.set_OVER(false)
            this._stop_drag()
            this.MOVE_POS_NORM2 = new THREE.Vector2(0, 0)
            this.DRAG_OFFSET_NORM2 = new THREE.Vector2(0, 0)

        }, false);

        
        this.domTarget.addEventListener('click', this.listener_click = (self) =>{
            this.app.emitter.emit("onAppMouseClick", {})
        }, false);
        
        this.domTarget.addEventListener('mousemove', this.listener_mousemove = (self) =>{
            this._update_mousemove(self)
            this._update_drag(self.clientX, self.clientY)
        }, false);

        this.domTarget.addEventListener('mousedown', this.listener_click = (self) =>{
            this._start_drag(self.clientX, self.clientY)
        }, false);

        this.domTarget.addEventListener('mouseup', this.listener_click = (self) =>{
            this._stop_drag()
        }, false);
        */
       this.app.emitter.on("onAppSetMouseListener", (e)=>{
            this.kill()
            this.createListeners(e.domTarget)
       })
       this.app.project.emitter.on("onProjectSetMode", (e)=>{
            this._eval_touchEvents()
       })
       
    }
    //----------------------------------------------
    // PUBLIC:
    update_RAF(){
        // this._update_INERTIA()
        this._update_POSITION2_EASED()
        //--
    }
    createListeners(domTarget){
        // this.app.trace("(AppMouse.createListeners): ", domTarget)
        this.domTarget = domTarget
        this.domTarget.addEventListener('mouseover', this.listener_mouseover = (self) =>{
            // this.app.trace("mouseover");
            this.set_OVER(true)
        }, false);

        this.domTarget.addEventListener('mouseout', this.listener_mouseout = (self) =>{
            // this.app.trace("mouseout");
            this.set_OVER(false)
            this._stop_drag()
            this.MOVE_POS_NORM2 = new THREE.Vector2(0, 0)
            this.DRAG_OFFSET_NORM2 = new THREE.Vector2(0, 0)

        }, false);

        
        this.domTarget.addEventListener('click', this.listener_click = (self) =>{
            this.app.emitter.emit("onAppMouseClick", {})
        }, false);
        
        this.domTarget.addEventListener('mousemove', this.listener_mousemove = (self) =>{
            //console.log("mousemove!");
            this._update_mousemove(self)
            this._update_drag(self.clientX, self.clientY)
        }, false);

        this.domTarget.addEventListener('mousedown', this.listener_click = (self) =>{
            //console.log("mousedown!");
            this._start_drag(self.clientX, self.clientY)
        }, false);
        
        this.domTarget.addEventListener('mouseup', this.listener_click = (self) =>{
            //console.log("mouseup!");
            this._stop_drag()
        }, false);

        this._eval_touchEvents()

    }
    kill(){
        this.app.trace("(AppMouse.kill)!")
        this.domTarget.removeEventListener('mousemove', this.listener_mousemove, false)
        this.domTarget.removeEventListener('mouseover', this.listener_mouseover, false)
        this.domTarget.removeEventListener('mouseout', this.listener_mouseout, false)
        this.domTarget.removeEventListener('click', this.listener_click, false)
        this.domTarget.removeEventListener('mousedown', this.listener_click, false)
        this.domTarget.removeEventListener('mouseup', this.listener_click, false)
        this.kill_touchEvents()
        
    }
    _eval_touchEvents(){
        if(this.app.state.MOBILE_MODE && this.app.project.MODE == "home"){
            this.create_touchEvents()
        }else{
            this.kill_touchEvents()
        }
    }
    create_touchEvents(){
        if(!this.TOUCH_EVENTS_CREATED){
            this.TOUCH_EVENTS_CREATED = true
            this.domTarget.addEventListener("touchstart", this.listener_touchstart = (event) => {
                // Prevent default to avoid unwanted scroll or zoom behavior
                event.preventDefault();
            
                // Get initial touch coordinates
                const clientX = event.touches[0].clientX;
                const clientY = event.touches[0].clientY;
                //console.log("Touch started at:", clientX, clientY);
                this._start_drag(clientX, clientY)
            });
            this.domTarget.addEventListener("touchend", this.listener_touchend =(event) => {
                this._stop_drag()
            });
            this.domTarget.addEventListener("touchmove", this.listener_touchmove =(event) => {
                const clientX = event.touches[0].clientX;
                const clientY = event.touches[0].clientY;
                this._update_mousemove(self)
                this._update_drag(clientX, clientY)
            });
        }
    }

    kill_touchEvents(){
        if(this.TOUCH_EVENTS_CREATED){
            this.TOUCH_EVENTS_CREATED = false
            this.domTarget.removeEventListener("touchstart", this.listener_touchstart, false)
            this.domTarget.removeEventListener("touchend", this.listener_touchend, false)
            this.domTarget.removeEventListener("touchmove", this.listener_touchmove, false)
        }
    }

    set_OVER(value){
        if(this.OVER != value){
            this.OVER = value
            if(this.OVER){
                this.app.emitter.emit("onAppMouseOver", {})
            }else{
                this.POSITION_NORM.x = 0;
                this.POSITION_NORM.y = 0;
                this.POSITION_NORM_V2.set(this.POSITION_NORM.x, this.POSITION_NORM.y);
                this.POSITION2_NORM.x = 0;
                this.POSITION2_NORM.y = 0;
                this.POSITION3_NORM.x = 0;
                this.POSITION3_NORM.y = 0;
                this.app.emitter.emit("onAppMouseOut", {})
            }
        }
    }
    
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    _update_INERTIA(){
        this.INERTIA_ARRAY[this.INERTIA_INSERT_INDEX].x = this.POSITION2_EASED.delta_x
        this.INERTIA_ARRAY[this.INERTIA_INSERT_INDEX].y = this.POSITION2_EASED.delta_y
        this.INERTIA_INSERT_INDEX++
        if(this.INERTIA_INSERT_INDEX>=this.INERTIA_ARRAY.length){
            this.INERTIA_INSERT_INDEX = 0
        }
        //----------------
        const origin = this.INERTIA_ARRAY[0]
        for(let i=1; i<this.INERTIA_ARRAY.length; i++){
            const current = this.INERTIA_ARRAY[i]
            origin.x += current.x
            origin.y += current.y
        }

    }

    _start_drag(x, y){
        if(!this.DOWN){
            //console.log("_start_drag");
            this.DOWN = true
            const POS_NORM2 = this._get_POS_NORM2(x, y)
            this.DOWN_POS_NORM2.x = POS_NORM2.x
            this.DOWN_POS_NORM2.y = POS_NORM2.y
            this.app.emitter.emit("onAppStartDrag", {})
        }
    }
    _stop_drag(){
        if(this.DOWN){
            //console.log("_stop_drag");
            this.DOWN = false
            this.DOWN_POS_NORM2.x = 0
            this.DOWN_POS_NORM2.y = 0
            this.MOVE_POS_NORM2.x = 0
            this.MOVE_POS_NORM2.y = 0
            this.DRAG_OFFSET_NORM2.x = 0
            this.DRAG_OFFSET_NORM2.y = 0
            this.app.emitter.emit("onAppStopDrag", {})
        }
    }
    _update_drag(x, y){
        if(this.DOWN){
            //console.log("_update_drag");
            const POS_NORM2 = this._get_POS_NORM2(x, y)
            this.MOVE_POS_NORM2.x = POS_NORM2.x
            this.MOVE_POS_NORM2.y = POS_NORM2.y
            this.DRAG_OFFSET_NORM2.x = this.MOVE_POS_NORM2.x-this.DOWN_POS_NORM2.x
            this.DRAG_OFFSET_NORM2.y = this.MOVE_POS_NORM2.y-this.DOWN_POS_NORM2.y
            // this.app.trace("   ---");
            // this.app.trace("   this.DOWN_POS_NORM2: ",this.DOWN_POS_NORM2);
            // this.app.trace("   this.MOVE_POS_NORM2: ",this.MOVE_POS_NORM2);
            // this.app.trace("   this.DRAG_OFFSET_NORM2: ",this.DRAG_OFFSET_NORM2);
            this.app.emitter.emit("onAppMouseDrag", {})
        }
    }

    _get_POS_NORM2(x, y){
        // form -1 to +1
        const container_rect = this.domTarget.getBoundingClientRect()
        const rel_mouse_posX = x/container_rect.width
        const rel_mouse_posY = (container_rect.height-y)/container_rect.height
        const x2 = (rel_mouse_posX*2)-1
        const y2 = (rel_mouse_posY*2)-1
        const obj = {x:x2, y:y2}
        return obj
    }

    _update_POSITION2_EASED(){
        this.POSITION2_EASED.last_x = this.POSITION2_EASED.last0_x
        this.POSITION2_EASED.last_y = this.POSITION2_EASED.last0_y
        this.POSITION2_EASED.last0_x = this.POSITION2_EASED.x.get()
        this.POSITION2_EASED.last0_y = this.POSITION2_EASED.y.get()
        this.POSITION2_EASED.delta_x = Number(this.POSITION2_EASED.x.get()-this.POSITION2_EASED.last_x)
        this.POSITION2_EASED.delta_y = Number(this.POSITION2_EASED.y.get()-this.POSITION2_EASED.last_y)
        this.POSITION2_EASED.dir.set(this.POSITION2_EASED.delta_x, this.POSITION2_EASED.delta_y)
        this.POSITION2_EASED.position.x = this.POSITION2_EASED.x.get()
        this.POSITION2_EASED.position.y = this.POSITION2_EASED.y.get()
        //this.app.trace("dir: ",this.POSITION2_EASED.dir);
        this.INERTIA = new THREE.Vector2(this.POSITION2_EASED.delta_x, this.POSITION2_EASED.delta_y).length()*100
        this.INERTIA = Math.round(this.INERTIA * 100) / 100
        this.INERTIA = NumberUtils.clamp(this.INERTIA, 0, 1)
    }
    _update_POSITION3_EASED(){
        this.POSITION3_EASED.last_x = this.POSITION3_EASED.last0_x
        this.POSITION3_EASED.last_y = this.POSITION3_EASED.last0_y
        this.POSITION3_EASED.last0_x = this.POSITION3_EASED.x.get()
        this.POSITION3_EASED.last0_y = this.POSITION3_EASED.y.get()
        this.POSITION3_EASED.delta_x = Number(this.POSITION3_EASED.x.get()-this.POSITION3_EASED.last_x)
        this.POSITION3_EASED.delta_y = Number(this.POSITION3_EASED.y.get()-this.POSITION3_EASED.last_y)
        this.POSITION3_EASED.dir.set(this.POSITION3_EASED.delta_x, this.POSITION3_EASED.delta_y)
        this.POSITION3_EASED.position.x = this.POSITION3_EASED.x.get()
        this.POSITION3_EASED.position.y = this.POSITION3_EASED.y.get()

    }
    _update_mousemove(e){
        const container_rect = this.domTarget.getBoundingClientRect()
        const rel_mouse_posX = e.clientX-container_rect.x
        const rel_mouse_posY = e.clientY-container_rect.y
        if(this.OVER){
            this.POSITION_NORM.x = ((rel_mouse_posX/this.app.size.CURRENT.width)*2)-1;
            this.POSITION_NORM.y = -((rel_mouse_posY/this.app.size.CURRENT.height)*2)+1;
            this.POSITION_NORM_V2.set(this.POSITION_NORM.x, this.POSITION_NORM.y);

            this.POSITION2_NORM.x = (rel_mouse_posX/this.app.size.CURRENT.width);
            this.POSITION2_NORM.y = 1-(rel_mouse_posY/this.app.size.CURRENT.height);

            this.POSITION3_NORM.x = (rel_mouse_posX/this.app.size.CURRENT.width);
            this.POSITION3_NORM.y = 1-(rel_mouse_posY/this.app.size.CURRENT.height);

        }else{
            this.POSITION_NORM.x = 0;
            this.POSITION_NORM.y = 0;
            this.POSITION_NORM_V2.set(this.POSITION_NORM.x, this.POSITION_NORM.y);
            this.POSITION2_NORM.x = 0;
            this.POSITION2_NORM.y = 0;
            this.POSITION3_NORM.x = 0;
            this.POSITION3_NORM.y = 0;
        }
        this.POSITION_EASED.x.set(this.POSITION_NORM.x)
        this.POSITION_EASED.y.set(this.POSITION_NORM.y)
        this.POSITION2_EASED.x.set(this.POSITION2_NORM.x)
        this.POSITION2_EASED.y.set(this.POSITION2_NORM.y)
        this.POSITION3_EASED.x.set(this.POSITION3_NORM.x)
        this.POSITION3_EASED.y.set(this.POSITION3_NORM.y)
        this.app.emitter.emit("onAppMouseMove", {})
    }
    //----------------------------------------------
    // AUX:

  
}
export default AppMouse