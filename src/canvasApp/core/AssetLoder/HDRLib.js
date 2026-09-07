import * as THREE from "three"
import Datos from "../utils/Datos"
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader"

const EventEmitter = require('events');

class HDRLib{
    constructor (obj){
        ////console.log("(HDRLib.CONSTRUCTOR)!")
        //--
        this.emitter = new EventEmitter()
        this.data = new Datos()
        this.itemsLoaded = 0
        this.all_loaded = false
    }
        
    //----------------------
    // PUBLICAS:
    start(){
        ////console.log("(HDRLib.start)!")
        if(this.data.arrayItems.length != 0){
            this.loadingManager = new THREE.LoadingManager(
                ()=>{
                    this._completed()
                }
            )
            this.textureLoader  = new RGBELoader(this.loadingManager);
            for(let i=0; i<this.data.arrayItems.length; i++){
                const itemId = this.data.arrayItems[i]
                const item = this.data.getItemAt(i)
                item.texture = this.textureLoader.load(item.path, (response)=>{
                    //console.log("LOAD: ",response)
                    this.itemsLoaded++
                })
            }
        }else{
            this._completed()
        }
    }
    addLoad(itemId, path){
        ////console.log("(HDRLib.addLoad)!")
        const item = {}
        item.id = itemId
        item.path = path
        item.loaded = false
        item.loader = null
        item.texture = null
        this.data.nuevoItem(item.id, item)
    }
    get(itemId){
        ////console.log("(HDRLib.get): "+itemId)
        //console.log(this.data.getItem(itemId))
        return this.data.getItem(itemId).texture
    }

    //----------------------
    // PRIVADAS:
    _completed(){
        ////console.log("(HDRLib._completed)!", this.data)
        this.all_loaded = true
        this.emitter.emit("onCompleted")
    }
        
}
export default HDRLib