import * as THREE from "three"
import Datos from "../utils/Datos"

const EventEmitter = require('events');

class VideoLib{
    constructor (obj){
        ////console.log("(VideoLib.CONSTRUCTOR)!", obj)
        this.app = obj.app
        //--
        this.emitter = new EventEmitter()
        this.data = new Datos()
        this.itemsLoaded = 0
        this.all_loaded = true
    }
        
    //----------------------
    // PUBLICAS:
    start(){
        ////console.log("(VideoLib.start)!")
        for(var i=0; i<this.data.arrayItems.length; i++){
            const item = this.data.getItemAt(i)
            //item.$video.load()
            //item.$video.start()
        }
    }
    addLoad(itemId, path){
        ////console.log("(VideoLib.addLoad) "+itemId+": ", path)
        ////console.log(this.app.$container)
        this.all_loaded = false
        const item = {}
        item.id = itemId
        item.path = path
        item.loaded = false
        item.$video = null
        item.texture = null
        this.data.nuevoItem(item.id, item)
        //--
        item.$video = document.createElement( 'video' );
        item.$video.setAttribute("id", item.id);
        item.$video.setAttribute("style", "display: none;");
        item.$video.src = item.path
        //item.$video.autoplay = true
        item.$video.muted = true
        item.$video.loop = true
        this.app.$container.append(item.$video)

        

        item.$video.addEventListener('loadeddata', (e)=>{
            ////console.log("VIDEO LOADED!")
            this.itemsLoaded++
            if(this.itemsLoaded == this.data.arrayItems.length){
                this._completed()
            }
        }, false);
    }
    get(itemId){
        ////console.log("(VideoLib.get): ", this.data.getItem(itemId))
        const video = document.getElementById(itemId)
        const videoTexture = new THREE.VideoTexture(video )
        videoTexture.format = THREE.RGBAFormat;
        return videoTexture
    }
    get_dimensions(itemId){
        ////console.log("(VideoLib.get_dimensions): ", this.get(itemId).image)
        const obj ={
            width: this.get(itemId).image.width,
            height: this.get(itemId).image.height
        }
        return obj
    }

    //----------------------
    // PRIVADAS:
    _completed(){
        //console.log("(VideoLib._completed)!", this.data)
        for(var i=0; i<this.data.arrayItems.length; i++){
            // const item = this.data.getItemAt(i)
            // const video = document.getElementById(item.id)
            // item.texture = new THREE.VideoTexture( video )
        }
        this.all_loaded = true
        this.emitter.emit("onCompleted")
    }
        
}
export default VideoLib