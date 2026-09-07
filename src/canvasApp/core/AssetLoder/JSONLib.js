import * as THREE from "three"
import Datos from "../utils/Datos";

const EventEmitter = require('events');

class JSONLib {
    constructor(obj) {
        // console.log("(JSONLib.CONSTRUCTOR)!")
        this.emitter = new EventEmitter()
        this.data = new Datos() // Assuming this is your Key-Value store utility
        this.itemsLoaded = 0
        this.all_loaded = false
    }

    //----------------------
    // PUBLIC:
    start() {
        // console.log("(JSONLib.start)!")
        if (this.data.arrayItems.length != 0) {
            // Use Three.js LoadingManager for consistency with other libs
            this.loadingManager = new THREE.LoadingManager(
                () => {
                    this._completed()
                }
            )
            
            this.fileLoader = new THREE.FileLoader(this.loadingManager);
            this.fileLoader.setResponseType('json'); // Automatically parse to JSON

            for (let i = 0; i < this.data.arrayItems.length; i++) {
                const itemId = this.data.arrayItems[i]
                const item = this.data.getItemAt(i)
                
                // console.log("Loading JSON:", item.path)
                this.fileLoader.load(
                    item.path,
                    (response) => {
                        // Success
                        // console.log("Successfully loaded JSON:", itemId);
                        item.json = response
                        this.itemsLoaded++
                    },
                    undefined, // onProgress
                    (err) => {
                        // console.error('(JSONLib) Error loading: ' + itemId, err);
                    }
                )
            }
        } else {
            this._completed()
        }
    }

    addLoad(itemId, path) {
        // console.log("(JSONLib.addLoad) " + itemId + ": ", path)
        const item = {}
        item.id = itemId
        item.path = path
        item.loaded = false
        item.json = null
        this.data.nuevoItem(item.id, item)
    }

    get(itemId) {
        return this.data.getItem(itemId).json
    }

    //----------------------
    // PRIVATE:
    _completed() {
        // console.log("(JSONLib._completed)!")
        this.all_loaded = true
        this.emitter.emit("onCompleted")
    }
}

export default JSONLib