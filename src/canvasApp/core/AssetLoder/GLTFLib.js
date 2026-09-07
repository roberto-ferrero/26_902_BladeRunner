import * as THREE from "three"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const EventEmitter = require('events');


import Datos from "../utils/Datos";

class GLTFLib{
    constructor (obj){
        ////console.log("(GLTFLib.CONSTRUCTOR)!")
        this.draco_pathPrefix = obj.draco_pathPrefix
        //--
        this.emitter = new EventEmitter()
        this.data = new Datos()
        this.loadingPos = 0
        this.itemsLoaded = 0
        this.all_loaded = false
    }
        
    //----------------------
    // PUBLICAS:
    start(){
        ////console.log("(GLTFLib.start)!")
        if(this.data.arrayItems.length != 0){
            this.loadingManager = new THREE.LoadingManager(
                ()=>{
                    //this._completed()
                }
            )
            this.dracoLoader = new DRACOLoader()
            this.dracoLoader.setDecoderPath(this.draco_pathPrefix+'glbs/draco/')
            this.dracoLoader.preload()
            //--
            this.gltfLoader = new GLTFLoader(this.loadingManager)
            this.gltfLoader.setDRACOLoader(this.dracoLoader)
            //--
            const item = this.data.getItemAt(this.loadingPos)
            this._loadItem(item)
        }else{
            this._completed()
        }
    }
    addLoad(itemId, path, isScene = false){
        ////console.log("(GLTFLib.addLoad)!")
        const item = {}
        item.id = itemId
        item.path = path
        item.loaded = false
        item.mesh = null
        item.isScene = isScene
        this.data.nuevoItem(item.id, item)
    }
    get(itemId){
        return this.data.getItem(itemId).mesh.clone()
    }
    
    //----------------------
    // PRIVADAS:
    _loadItem(item){
        //console.log("(GLTFLib._loadItem): "+item.id)
        this.gltfLoader.load(item.path, (response)=>{
            const itemId = this.data.arrayItems[this.loadingPos]
            const item = this.data.getItem(itemId)
            //console.log("item: ", item)
            if(!item.isScene){
                item.mesh = response.scene.children[0]
            }else{
                //console.log("*2");
                item.mesh = response.scene

            }
            ////console.log("item.mesh: ", item.mesh)
            this.itemsLoaded++
            //--
            this._nextLoad()
        })
      }
    _nextLoad(){
        if(this.loadingPos<this.data.arrayItems.length-1){
            this.loadingPos++
            const item = this.data.getItemAt(this.loadingPos)
            this._loadItem(item)
        }else{
            this._completed()
        }
    }

    _completed(){
        ////console.log("(GLTFLib._completed)!", this.data)
        this.all_loaded = true
        this.emitter.emit("onCompleted")
    }
        
}
export default GLTFLib