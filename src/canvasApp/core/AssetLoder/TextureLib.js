import * as THREE from "three"
import Datos from "../utils/Datos"

const EventEmitter = require('events');

class TextureLib{
    /*
    this.loader.add_texture("dev", this.app.pathPrefix+"img/dev.jpg", true)
    */
    constructor (obj){
        ////console.log("(TextureLib.CONSTRUCTOR)!")
        //--
        this.emitter = new EventEmitter()
        this.data = new Datos()
        this.itemsLoaded = 0
        this.all_loaded = false
    }

    //----------------------
    // PUBLICAS:
    start(){
        ////console.log("(TextureLib.start)!")
        if(this.data.arrayItems.length != 0){
            this.loadingManager = new THREE.LoadingManager(
                ()=>{
                    this._completed()
                }
            )
            this.textureLoader  = new THREE.TextureLoader(this.loadingManager);
            for(let i=0; i<this.data.arrayItems.length; i++){
                const itemId = this.data.arrayItems[i]
                const item = this.data.getItemAt(i)
                item.texture = this.textureLoader.load(
                    item.path,
                    (response)=>{
                        ////console.log("loaded: ", response)
                        this.itemsLoaded++
                    },
                    undefined,
                    ( err ) =>{
                        // onError callback
                        //console.error( 'An error happened: '+itemId+" - "+item.path, err );
                    }
                )
                /*
                https://discourse.threejs.org/t/warning-from-threejs-image-is-not-power-of-two/7085
                This warning is only logged when using WebGL1 since you need power-of-two (POT) textures for mipmapping. There are a few options to avoid this message. You can disable mipmapping by:

                Set Texture.minFilter to THREE.LinearFilter
                Set Texture.generateMipmaps to false
                You can also use a WebGL 2 rendering context. Or you just ensure your image is POT.
                */
                //item.texture.minFilter  = THREE.LinearFilter
                //item.texture.magFilter  = THREE.LinearFilter
                //item.texture.generateMipmaps = true
                // //item.texture.mapping = 20
                // // item.texture.wrapS = THREE.MirroredRepeatWrapping
                //----
                if(item.options.minFilter){
                    //console.log("minFilter!");
                    item.texture.minFilter = item.options.minFilter
                }
                if(item.options.magFilter){
                    //console.log("magFilter!");
                    item.texture.magFilter = item.options.magFilter
                }
                if(item.options.mapping){
                    //console.log("mapping!");
                    item.texture.mapping = item.options.mapping
                }
                if(item.options.wrapS){
                    //console.log("wrapS!");
                    item.texture.wrapS = item.options.wrapS
                }
                if(item.options.generateMipmaps != undefined){
                    //console.log("generateMipmaps!");
                    item.texture.generateMipmaps = item.options.generateMipmaps
                }
            }
        }else{
            this._completed()
        }
    }
    addLoad(itemId, path, options){
        ////console.log("(TextureLib.addLoad) "+itemId+": ", path)
        const item = {}
        item.id = itemId
        item.path = path
        item.loaded = false
        item.texture = null
        item.options = options || {}
        this.data.nuevoItem(item.id, item)
    }
    get(itemId){
        // console.log("(TextureLib.sget): ", this.data.getItem(itemId))
        return this.data.getItem(itemId).texture
    }
    get_dimensions(itemId){
        ////console.log("(TextureLib.get_dimensions): ", this.get(itemId).image)
        const obj ={
            width: this.get(itemId).image.width,
            height: this.get(itemId).image.height
        }
        return obj
    }

    //----------------------
    // PRIVADAS:
    _completed(){
        ////console.log("(TextureLib._completed)!", this.data)
        this.all_loaded = true
        this.emitter.emit("onCompleted")
    }

}
export default TextureLib
