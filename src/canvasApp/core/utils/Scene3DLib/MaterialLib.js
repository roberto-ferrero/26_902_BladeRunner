//import gsap from "gsap"
import * as THREE from 'three'
import Datos from '../Datos'

class MaterialLib{
    //app.project.libs.materials
    constructor (obj){
        // console.log("(MaterialLib.CONSTRUCTORA): ", obj)
        this.app = obj.app
        this.project = obj.project
        this.scenario = obj.scenario
        //-----------------------------
        this.DATA = new Datos()
        //-----------------------------
    }
    init(){
        // console.log("(MaterialLib.init)!")
        const sceneGround_texture = new THREE.MeshPhysicalMaterial({
            color: 0xaaaaaa,       // Blueish
            roughness: 0.9,        // Matte enough to diffuse light, glossy enough for soft sheen
            metalness: 0.1,        // Slight non-metal reflectiveness
            clearcoat: 0.0,        // No varnish
            reflectivity: 0.5,
            side: THREE.DoubleSide,
            // aoMap: this.stage.loader.get_texture("ao"),
            // aoMapIntensity: 1.0,
            // aoNode: true,
            })
        // sceneGround_texture.aoMap.sflipY = false;
        this.DATA.nuevoItem("sceneGround", sceneGround_texture)
        //-----------------------------
        this.DATA.nuevoItem("level1Mat", new THREE.MeshPhysicalMaterial({
                color: 0x573136,       // Pure white
                roughness: 0.9,        // Matte enough to diffuse light, glossy enough for soft sheen
                metalness: 0.1,        // Slight non-metal reflectiveness
                clearcoat: 0.0,        // No varnish
                reflectivity: 0.0,
                wireframe: false,
                side: THREE.DoubleSide   
            })
        )
        //-----------------------------
        this.DATA.nuevoItem("level2Mat", new THREE.MeshPhysicalMaterial({
                color: 0x62373D,       // Pure white
                roughness: 0.9,        // Matte enough to diffuse light, glossy enough for soft sheen
                metalness: 0.1,        // Slight non-metal reflectiveness
                clearcoat: 0.0,        // No varnish
                reflectivity: 0.5,
                side: THREE.DoubleSide
            })
        )
        //-----------------------------
        this.DATA.nuevoItem("level3Mat", new THREE.MeshPhysicalMaterial({
            color: 0x6F444A,       // Blueish
            roughness: 0.9,        // Matte enough to diffuse light, glossy enough for soft sheen
            metalness: 0.1,        // Slight non-metal reflectiveness
            clearcoat: 0.0,        // No varnish
            reflectivity: 0.5,
            side: THREE.DoubleSide
            })
        )
        //-----------------------------
        this.DATA.nuevoItem("level4Mat", new THREE.MeshPhysicalMaterial({
            color: 0x82545A,       // Blueish
            roughness: 0.9,        // Matte enough to diffuse light, glossy enough for soft sheen
            metalness: 0.1,        // Slight non-metal reflectiveness
            clearcoat: 0.0,        // No varnish
            reflectivity: 0.5,
            side: THREE.DoubleSide
            })
        )
        //-----------------------------
        // this.DATA.nuevoItem("buildingGlass", new THREE.MeshPhysicalMaterial({
        //     color: 0x2c3431,       // 
        //     roughness: 0.0,        // Matte enough to diffuse light, glossy enough for soft sheen
        //     metalness: 0.2,        // Slight non-metal reflectiveness
        //     clearcoat: 0.0,        // No varnish
        //     reflectivity: 0.8,
        //     side: THREE.DoubleSide,
        //     transparent: true,
        //     opacity: 0.5,
        //     })
        // )
        this.DATA.nuevoItem("buildingGlass", new THREE.MeshPhysicalMaterial({
            color: 0x515855,       // 
            metalness: 0,
            roughness: 0,       // Esencial para que sea liso como el cristal
            transmission: 1.0,  // 1.0 = totalmente transparente (deja pasar la luz)
            thickness: 0.01,     // Grosor del volumen para calcular la refracción
            ior: 1.5,           // Index of Refraction (1.5 es estándar para vidrio)
            transparent: false, // ¡Importante! En PhysicalMaterial usas transmission, no opacity
            })
        )
        //-----------------------------
        // this.DATA.nuevoItem("storeGlass", new THREE.MeshPhysicalMaterial({
        //     color: 0x2c3431,       // 
        //     roughness: 0.0,        // Matte enough to diffuse light, glossy enough for soft sheen
        //     metalness: 0.2,        // Slight non-metal reflectiveness
        //     clearcoat: 0.0,        // No varnish
        //     reflectivity: 0.8,
        //     side: THREE.DoubleSide,
        //     transparent: true,
        //     opacity: 0.5,
        // }))
        this.DATA.nuevoItem("storeGlass", new THREE.MeshPhysicalMaterial({
            color: 0x515855,       // 
            metalness: 0,
            roughness: 0,       // Esencial para que sea liso como el cristal
            transmission: 1.0,  // 1.0 = totalmente transparente (deja pasar la luz)
            thickness: 0.01,     // Grosor del volumen para calcular la refracción
            ior: 1.5,           // Index of Refraction (1.5 es estándar para vidrio)
            transparent: false, // ¡Importante! En PhysicalMaterial usas transmission, no opacity
            // side: THREE.DoubleSide
        }))
        //-----------------------------
        this.DATA.nuevoItem("futureBlueLight", new THREE.MeshPhysicalMaterial({
        color: 0x3981b5,        // Base color
        emissive: 0x3981b5,     // The color the mesh emits (Key for neon)
        emissiveIntensity: 4.0, // Push > 1.0 to trigger Bloom (HDR)
        
        roughness: 0.2,         // Slightly smoother for glass tubing feel
        metalness: 0.0,         // Neon tubes are glass/gas, not metal
        
        // Glass/Tube effect (Optional, replaces simple transparency)
        transmission: 0.0,      // Set to > 0.6 if you want it to look like a glass tube when "off"
            thickness: 0.5,         
            
            // Performance/Rendering settings
            side: THREE.DoubleSide,
            transparent: false,     // Disable alpha-transparency to prevent depth sorting artifacts with the glow
            opacity: 1.0, 
            toneMapped: false       // Set to false if you want pure, blown-out color (no fading to white)
        })
        );
        //-----------------------------
        this.DATA.nuevoItem("futureBlue", new THREE.MeshPhysicalMaterial({
                color: 0x3981b5,       // Pure white
                roughness: 0.5,        // Matte enough to diffuse light, glossy enough for soft sheen
                metalness: 0.1,        // Slight non-metal reflectiveness
                clearcoat: 0.0,        // No varnish
                reflectivity: 0.5,
                side: THREE.DoubleSide
            })
        )
        //-----------------------------
        this.DATA.nuevoItem("whiteMat", new THREE.MeshPhysicalMaterial({
                color: 0xffffff,       // Pure white
                roughness: 0.5,        // Matte enough to diffuse light, glossy enough for soft sheen
                metalness: 0.1,        // Slight non-metal reflectiveness
                clearcoat: 0.0,        // No varnish
                reflectivity: 0.0,
                wireframe: false,
                side: THREE.DoubleSide   
            })
        )
        //-----------------------------
        this.DATA.nuevoItem("yellowMat", new THREE.MeshPhysicalMaterial({
                color: 0xc6a04a,       // Pure white
                roughness: 0.5,        // Matte enough to diffuse light, glossy enough for soft sheen
                metalness: 0.1,        // Slight non-metal reflectiveness
                clearcoat: 0.0,        // No varnish
                reflectivity: 0.0,
                wireframe: false,
                side: THREE.DoubleSide   
            })
        )
    }
    //----------------------------------------------
    // PUBLIC:
    addItem(materialId, material){
        // console.log("(MaterialLib.add_spot): ", spotId);
        this.DATA.nuevoItem(materialId, material)
    }
    getItem(materialId){
        // console.log("(MaterialLib.get_spot): ", spotId);
        return this.DATA.getItem(materialId)
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default MaterialLib