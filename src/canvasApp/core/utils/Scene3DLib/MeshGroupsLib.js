//import gsap from "gsap"
import * as THREE from 'three'
import Datos from '../Datos'
import { array } from 'three/src/nodes/TSL.js'

class MeshGroupsLib{
    //this.app.project.libs.meshgroups
    constructor (obj){
        // console.log("(MeshGroupsLib.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.scenario = obj.scenario
        //-----------------------------
        this.MESH_DATA = new Datos()
        this.GROUP_DATA = new Datos()
        //-----------------------------
    }
    //----------------------------------------------
    // PUBLIC:
    addItem(groupId, group3D){
        const group = {
            groupId: groupId,
            arrayMeshIds: [],
            position: group3D.position.clone(),
            rotation: group3D.rotation.clone(),
            scale: group3D.scale.clone(),
        }
        group3D.children.map( (childMesh) => {
            const meshId = childMesh.name
            //--
            childMesh.position.add( group.position )

            const q1 = new THREE.Quaternion().setFromEuler(childMesh.rotation)
            const q2 = new THREE.Quaternion().setFromEuler(group.rotation)
            q1.multiply( q2 )
            childMesh.rotation.setFromQuaternion(q1)
            
            childMesh.scale.multiply( group.scale )
            //--
            this.MESH_DATA.nuevoItem(meshId, childMesh)
            group.arrayMeshIds.push(meshId)
        })
        this.GROUP_DATA.nuevoItem(groupId, group)
    }
    getGroupMeshes(groupId){
        // console.log("(MeshGroupsLib.get_spot): ", groupId);
        const group = this.GROUP_DATA.getItem(groupId);
        const arrayMeshes = []
        group.arrayMeshIds.map( (meshId) => {
            arrayMeshes.push( this.MESH_DATA.getItem(meshId) )
        })
        return arrayMeshes;
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:
    _filterMesh(rawMesh){
        // Function to ensure we return a Mesh even if the GLB export generated a Group
        if(rawMesh?.type == "Group"){ // DOC: Algunas veces la exportación de Blender genera un grupo en vez de un mesh. La posicion es del group y de la copiamos al mesh
            const position = rawMesh.position
            console.log("   Group!!");
            // console.log("   mesh: ", mesh);
            const firstMesh = rawMesh.children[0]
            firstMesh.position.set(position.x, position.y, position.z)
            return firstMesh.clone()
        }else{
            return rawMesh.clone()
        }
    }
    //----------------------------------------------
    // AUX:

  
}
export default MeshGroupsLib