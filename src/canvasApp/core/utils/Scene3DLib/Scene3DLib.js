//import gsap from "gsap"
//import * as THREE from 'three'

import SpotsLib from "./SpotsLib"
import MeshesLib from "./MeshesLib"
import MeshGroupsLib from "./MeshGroupsLib"
import LightsLib from "./LightsLib"
import MaterialLib from "./MaterialLib"

class Scene3DLib{
    // this.app.project.libs
    constructor (obj){
        // console.log("(Scene3DLib.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        //--------------------------
        this.materials = new MaterialLib({
            app:this.app,
            project:this.project,
        })
        //--------------------------
        this.spots = new SpotsLib({
            app:this.app,
            project:this.project,
        })
        this.cameraspots = new SpotsLib({
            app:this.app,
            project:this.project,
        })
        this.cameratargets = new SpotsLib({
            app:this.app,
            project:this.project,
        })
        this.meshes = new MeshesLib({
            app:this.app,
            project:this.project,
        })
        this.meshgroups = new MeshGroupsLib({
            app:this.app,
            project:this.project,
        })
        this.arealights = new LightsLib({
            app:this.app,
            project:this.project,
        })
        this.pointlights = new LightsLib({
            app:this.app,
            project:this.project,
        })
        this.sunlights = new LightsLib({
            app:this.app,
            project:this.project,
        })
        //--------------------------
        
        
        //--------------------------
        
    }
    //----------------------------------------------
    // INTERNAL:
    init(GLB_PROJECT){
        this.materials.init()
        //--------------------------
        // console.log("(Scene3DLib.init)!");
        GLB_PROJECT.children.map((item)=>{
            const nameArray = item.name.split("-")
            const family = nameArray[0]
            const itemId = nameArray[1]
            const type = item.type
            // console.log("itemId:"+itemId+"  family:"+family+"  type:"+type);
            //--
            if(family === "spot"){
                // console.log("   spot found: "+itemId);
                this.spots.addItem(itemId, item)
            }else if(family === "cameratarget"){
                // console.log("   cameratarget found: "+itemId);
                this.cameratargets.addItem(itemId, item)
            }else if(family === "cameraspot"){
                // console.log("   cameraspot found: "+itemId);
                this.cameraspots.addItem(itemId, item)
            }else if(family === "mesh"){
                if(item.type == "Group"){
                    // console.log("   meshgroup found: "+itemId);
                    this.meshgroups.addItem(itemId, item)
                }else{
                    // console.log("   mesh found: "+itemId);
                    const materialId = nameArray[2]
                    this.meshes.addItem(itemId, item, materialId)
                }
            }else if(family === "arealight"){
                // console.log("   arealight found: "+itemId);
                this.arealights.addItem(itemId, item)
            }else if(family === "pointlight"){
                // console.log("   pointlight found: "+itemId);
                this.pointlights.addItem(itemId, item)
            }else if(family === "sunlight"){
                // console.log("   sunlight found: "+itemId);
                this.sunlights.addItem(itemId, item)
            }
        })
        //--------------------------
    }
    //----------------------------------------------
    // PUBLIC:
    
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default Scene3DLib