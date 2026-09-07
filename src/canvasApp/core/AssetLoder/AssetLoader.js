//import gsap from "gsap"
//import * as THREE from 'three'

import TextureLib from "./TextureLib"
import HDRLib from "./HDRLib"
import GLTFLib from "./GLTFLib"
import VideoLib from "./VideoLib"
import JSONLib from "./JSONLib" // <--- 1. Import

const EventEmitter = require('events');

class AppLoaders{
    constructor (obj){
        // console.log("(AppLoaders.CONSTRUCTOR): ", obj)
        this.app = obj.app
        this.pathPrefix = obj.pathPrefix
        //--
        this.all_loaded = false
        this.emitter = new EventEmitter()
        //----------------------
        this._init_textureLib()
        this._init_hdrLib()
        this._init_gltfLib()
        this._init_videoLib()
        this._init_jsonLib() // <--- 2. Init

    }
    //----------------------------------------------
    // PUBLIC:
    start(){
        // console.log("(AppLoaders.start)!");
        this.textureLib.start()
        this.hdrLib.start()
        this.gltfLib.start()
        this.videoLib.start()
        this.jsonLib.start() // <--- 3. Start
    }
    //--
    add_texture(itemId, path, options){
        // console.log("(AppLoaders.add_texture): ", itemId, path, options);
        this.textureLib.addLoad(itemId, path, options)
    }
    add_gltf(itemId, path, isScene){
        this.gltfLib.addLoad(itemId, path, isScene)
    }
    add_hdr(itemId, path){
        this.hdrLib.addLoad(itemId, path)
    }
    add_videoTexture(itemId, path){
        this.videoLib.addLoad(itemId, path)
    }
    // NEW METHODS FOR JSON
    add_json(itemId, path){
        // console.log("(AppLoaders.add_json): ", itemId, path);
        this.jsonLib.addLoad(itemId, path)
    }
    //--
    get_texture(itemId){
        // console.log("(AppLoaders.get_texture): ", itemId);
        return this.textureLib.get(itemId)
    }
    get_gltf(itemId){
        return this.gltfLib.get(itemId)
    }
    get_hdr(itemId){
        return this.hdrLib.get(itemId)
    }
    get_videoTexture(itemId){
        return this.videoLib.get(itemId)
    }
    get_json(itemId){
        return this.jsonLib.get(itemId)
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:
    _init_videoLib(){
        ////console.log("(AppLoaders._init_videoLib): ", this.app)
        this.videoLib = new VideoLib({
            app: this.app
        })
        this.videoLib.emitter.addListener("onCompleted", ()=>{
            this._eval_all_loaded()
        })
    }

    _init_textureLib(){
        this.textureLib = new TextureLib()
        this.textureLib.emitter.addListener("onCompleted", ()=>{
            this._eval_all_loaded()
        })
    }

    _init_hdrLib(){
        this.hdrLib = new HDRLib()
        this.hdrLib.emitter.addListener("onCompleted", ()=>{
            this._eval_all_loaded()
        })
    }

    _init_gltfLib(){
        this.gltfLib = new GLTFLib({
            draco_pathPrefix:this.pathPrefix
        })
        this.gltfLib.emitter.addListener("onCompleted", ()=>{
            this._eval_all_loaded()
        })
    }
    _init_jsonLib(){ // <--- 4. Define Init Logic
        this.jsonLib = new JSONLib()
        this.jsonLib.emitter.addListener("onCompleted", ()=>{
            this._eval_all_loaded()
        })
    }

    _eval_all_loaded(){
        //console.log("(AppLoaders._eval_all_loaded)!")
        //console.log("this.textureLib.all_loaded: "+this.textureLib.all_loaded)
        //console.log("this.hdrLib.all_loaded: "+this.hdrLib.all_loaded)
        //console.log("this.gltfLib.all_loaded: "+this.gltfLib.all_loaded)
        //console.log("this.videoLib.all_loaded: "+this.videoLib.all_loaded)
        if(
            this.textureLib.all_loaded && 
            this.hdrLib.all_loaded && 
            this.gltfLib.all_loaded && 
            this.videoLib.all_loaded && 
            this.jsonLib.all_loaded && // <--- 5. Add to condition
            !this.all_loaded
        ){
            // console.log("ALL LOADED!");
            this.all_loaded = true
            this.emitter.emit("onCompleted")
        }
    }
    //----------------------------------------------
    // AUX:

}
export default AppLoaders