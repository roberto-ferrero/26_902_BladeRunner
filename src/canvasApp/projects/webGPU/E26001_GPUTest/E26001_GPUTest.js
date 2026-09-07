//import gsap from "gsap"
import * as THREE from 'three'
import * as THREE_GPU from 'three/webgpu'
import * as TSL from 'three/tsl';
// import { time, sin, float } from 'three/tsl';

import AssetLoader from '../../../core/AssetLoder/AssetLoader';
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'


class E26001_GPUTest{
    constructor (){
        console.log("(E26001_GPUTest.CONSTRUCTOR)!")
        this.type = "WEBGPU_APP"
        //--
         this.PARTICLE_SIZE = 1
        this.FORCE_STRENGTH_MIN = 200.0
        this.FORCE_STRENGTH_MAX = 400.0
        this.FORCE_STRENGTH_PERIOD = 10.0
        this.FORCE_STRENGTH = (this.FORCE_STRENGTH_MIN + this.FORCE_STRENGTH_MAX) * 0.5
        this.FORCE_STRENGTH_RANDOMNESS = 0.2
        this.FRICTION_MIN = 0.80
        this.FRICTION_MAX = 0.98
        this.FRICTION_PERIOD = 10.0
        this.FRICTION = (this.FRICTION_MIN + this.FRICTION_MAX) * 0.5
        this.FRICTION_RANDOMNESS = 0.02
        this.RANDOM_FORCE_MIN = -20.0
        this.RANDOM_FORCE_MAX = 20.0
        this.GRAVITY_FORCE = 100.0
        this.MOUSE_FORCE = 1400.0
        this.MOUSE_RADIUS = 180.0
        this.MOUSE_TRAIL_RADIUS = 620.0
        this.MOUSE_SMOOTHING = 0.18
        this.elapsedTime = 0
        this.mouseTarget = new THREE.Vector2(100000, 100000)
        this.mouseCurrent = new THREE.Vector2(100000, 100000)
        this.mouseTrail = new THREE.Vector2(100000, 100000)
        this.mouseIsActive = false
        //----------------------
    }
    init(app){
        console.log("(E26001_GPUTest.init)!")
        this.app = app
        this.scene = this.app.render.scene
        //---------------

        switch (this.app.render.performanceData.tier) {
            case 'Low':
                this.NUM_PARTICLES = 250000;
                break;
            case 'Mid':
                this.NUM_PARTICLES = 1000000;
                break;
            case 'High':
            default:
                this.NUM_PARTICLES = 1500000;
                break;
        }
        // this.NUM_PARTICLES = 2500000 // Max around 4 million with 8gb of VRAM, but it depends on the complexity of the simulation and render shaders. Adjust as needed.
       

        //---------------
        // STAGE CAMERA:
        this.stageCamera = new StageOrtoCamera({
            app:this.app,
            project:this,
            parent3D:this.scene,
            size:this.app.size.CURRENT
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())
        //---------------

        //---------------
        // LOADER:
        this.loader = new AssetLoader({
            app:this.app,
            pathPrefix: this.app.pathPrefix
        })
        //--
        this.loader.add_texture('forceField1', this.app.pathPrefix + 'img/velMap3.jpg', {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            generateMipmaps: false,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping
        });
        // this.loader.add_texture('forceField2', this.app.pathPrefix + 'img/velMap9.jpg', {
        //     minFilter: THREE.LinearFilter,
        //     magFilter: THREE.LinearFilter,
        //     generateMipmaps: false,
        //     wrapS: THREE.ClampToEdgeWrapping,
        //     wrapT: THREE.ClampToEdgeWrapping
        // });
        this.loader.add_texture("dev", this.app.pathPrefix+"img/bg.jpg", true)
        this.loader.add_gltf("suzanne", this.app.pathPrefix+"glbs/suzanne.glb", false)
        //--
        this.loader.emitter.on("onCompleted", ()=>{
            console.log("ALL ASSETS LOADED!");
            this.app.emitter.emit("onProjectLoaded", {})
        })
        this.loader.start()
        //---------------

        this._setupMouseInteraction()
    }
    build(){
        console.log("(E26001_GPUTest.build)!");

        //-------------
        // WORLD3D:
            this.world3D = new THREE.Object3D()
            this.scene.add(this.world3D)
        //-------------


        //-------------
        // FRAME:
        this.frame = new OrtoResponsiveFrame({
            app:this.app,
            project:this,
            itemRef: this.world3D,
            refWidth: this.app.size.REF.width,
            refHeight: this.app.size.REF.height,
            MODE: "COVER",
            SCALE_FACTOR: 1.0
        })
        //-------------

        this.forceField1 = this.loader.get_texture('forceField1');
        this._buildSimulation();
        // this._buildRender_points();s
        this._buildRender_cuads();
        this._buildSuzanne()

    }
    //----------------------------------------------
    // UPDATES:

    _buildBgPlane(){
        const devTexture = this.loader.get_texture("dev")
        const geometry = new THREE.PlaneGeometry(this.app.size.REF.width, this.app.size.REF.height)
        const material = new THREE_GPU.MeshBasicNodeMaterial()
        material.colorNode = TSL.texture(devTexture, TSL.uv())
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.set(0, 0, -100)
        this.world3D.add(this.mesh)
    }

    _buildSuzanne(){
        //-------------
        // LIGHTS:
        const envLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(envLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(500, 500, 500);
        this.scene.add(dirLight);
        const dirLight_helper = new THREE.DirectionalLightHelper(dirLight, 1000);
        this.scene.add(dirLight_helper);
        this.app.dev.register_helper(dirLight_helper)
        //-------------

        //-------------
        // SUZANNE MESH:
        this.suzanne_mesh = this.loader.get_gltf("suzanne")
        this.physical_material = new THREE_GPU.MeshPhysicalNodeMaterial({
            transmission: 0.8,      // Totalmente transmisivo
            thickness: 1.0,         // Grosor del "cristal"
            ior: 1.5,               // Índice de refracción
            roughness: 0.1,         // Rugosidad (afecta al blur de la refracción)
            iridescence: 0.5,       // Opcional: efecto irisado
            metalness: 0.0,
            transparent: true,
            wireframe: false,
            colorNode: TSL.vec3(0.3, 0.3, 1.0) // Color base ligeramente azulado
        });

        // El grosor oscilará suavemente, cambiando la refracción
        this.physical_material.thicknessNode = TSL.sin(TSL.time).mul(1.5).add(2.0);

        // El color de la iridiscencia puede reaccionar a la posición local
        this.physical_material.iridescenceNode = TSL.sin(TSL.time);

        this.suzanne_mesh.traverse((child) => {
        if (child.isMesh) {
            child.material = this.physical_material;
            
            // Optimización WebGPU: permite que la malla genere sombras 
            // y reciba refracciones correctamente
            child.castShadow = true;
            child.receiveShadow = true;
        }
        });
        this.suzanne_mesh.scale.set(300, 300, 300)
        this.suzanne_mesh.position.set(0, 0, 500)
        this.world3D.add(this.suzanne_mesh);

    }

    //----------------------------------------------
    // SIMULATION PIPELINE:

    _getUV(position) {
        return TSL.vec2(
            position.x.add(this.halfWidthUniform).div(this.stageWidthUniform),
            position.y.add(this.halfHeightUniform).div(this.stageHeightUniform)
        ).clamp(0.0, 1.0);
    }

    _getTextureForce(uv, strength) {
        return TSL.texture(this.forceField1, uv).rg.sub(0.5).mul(strength);
    }

    _getGravityForce() {
        return TSL.vec2(0.0, this.gravityForceUniform.negate());
    }

    _getMouseForce_trail(position, target, radius, strength) {
        const delta = target.sub(position.xy);
        const distance = delta.length().add(0.0001);
        const influence = TSL.float(1.0).sub(distance.div(radius).clamp(0.0, 1.0));
        // Using squared influence for smoother falloff
        return delta.div(distance).mul(influence.mul(influence).mul(strength));
    }

    _getMouseForce_repulsion(position, target, radius, strength) {
        const delta = position.xy.sub(target);
        const distance = delta.length().add(0.0001);
        const influence = TSL.float(1.0).sub(distance.div(radius).clamp(0.0, 1.0));
        return delta.div(distance).mul(influence.mul(influence).mul(strength));
    }

    _applyBounds(position) {
        TSL.If(position.x.lessThan(this.halfWidthUniform.negate()), () => {
            position.x.assign(this.halfWidthUniform);
        });

        TSL.If(position.x.greaterThan(this.halfWidthUniform), () => {
            position.x.assign(this.halfWidthUniform.negate());
        });

        TSL.If(position.y.lessThan(this.halfHeightUniform.negate()), () => {
            position.y.assign(this.halfHeightUniform);
        });

        TSL.If(position.y.greaterThan(this.halfHeightUniform), () => {
            position.y.assign(this.halfHeightUniform.negate());
        });
    }

    _getColor(velocity) {
        const speed = velocity.xy.length();
        return TSL.vec3(
            speed.mul(0.02).add(0.0),
            TSL.float(0.2),
            TSL.float(1.0)
        );
    }

    _buildSimulation() {
        const width = this.app.size.REF.width;
        const height = this.app.size.REF.height;

        const positions = new Float32Array(this.NUM_PARTICLES * 4);
        const velocities = new Float32Array(this.NUM_PARTICLES * 4);
        const randomValues = new Float32Array(this.NUM_PARTICLES * 4);

        for (let i = 0; i < this.NUM_PARTICLES; i++) {
            const i4 = i * 4;
            positions[i4 + 0] = (Math.random() - 0.5) * width;
            positions[i4 + 1] = (Math.random() - 0.5) * height;
            positions[i4 + 2] = 0.0;
            positions[i4 + 3] = 1.0;

            velocities[i4 + 0] = (Math.random() - 0.5) * 5.0;
            velocities[i4 + 1] = (Math.random() - 0.5) * 5.0;
            velocities[i4 + 2] = 0.0;
            velocities[i4 + 3] = 0.0;

            randomValues[i4 + 0] = THREE.MathUtils.lerp(this.RANDOM_FORCE_MIN, this.RANDOM_FORCE_MAX, Math.random());
            randomValues[i4 + 1] = THREE.MathUtils.lerp(this.RANDOM_FORCE_MIN, this.RANDOM_FORCE_MAX, Math.random());
            randomValues[i4 + 2] = THREE.MathUtils.lerp(1 - this.FORCE_STRENGTH_RANDOMNESS, 1 + this.FORCE_STRENGTH_RANDOMNESS, Math.random());
            randomValues[i4 + 3] = THREE.MathUtils.lerp(1 - this.FRICTION_RANDOMNESS, 1 + this.FRICTION_RANDOMNESS, Math.random());
        }

        this.positionStorage = TSL.instancedArray(positions, 'vec4').setName('particlePositions');
        this.velocityStorage = TSL.instancedArray(velocities, 'vec4').setName('particleVelocities');
        this.randomStorage = TSL.instancedArray(randomValues, 'vec4').setName('particleRandomness');

        this.deltaUniform = TSL.uniform(1 / 60);
        this.stageWidthUniform = TSL.uniform(width);
        this.stageHeightUniform = TSL.uniform(height);
        this.halfWidthUniform = TSL.uniform(width * 0.5);
        this.halfHeightUniform = TSL.uniform(height * 0.5);
        this.forceStrengthUniform = TSL.uniform(this.FORCE_STRENGTH);
        this.frictionUniform = TSL.uniform(this.FRICTION);
        this.gravityForceUniform = TSL.uniform(this.GRAVITY_FORCE);
        this.mousePositionUniform = TSL.uniform(new THREE.Vector2(this.mouseCurrent.x, this.mouseCurrent.y));
        this.mouseTrailUniform = TSL.uniform(new THREE.Vector2(this.mouseTrail.x, this.mouseTrail.y));
        this.mouseActiveUniform = TSL.uniform(0.0);
        this.mouseForceUniform = TSL.uniform(this.MOUSE_FORCE);
        this.mouseRadiusUniform = TSL.uniform(this.MOUSE_RADIUS);
        this.mouseTrailRadiusUniform = TSL.uniform(this.MOUSE_TRAIL_RADIUS);

        this.simulationCompute = TSL.Fn(() => {
            const position = this.positionStorage.element(TSL.instanceIndex);
            const velocity = this.velocityStorage.element(TSL.instanceIndex);
            const randomData = this.randomStorage.element(TSL.instanceIndex);

            // 1. Inputs
            const uv = this._getUV(position);
            const forceStrength = this.forceStrengthUniform.mul(randomData.z);
            const friction = this.frictionUniform.mul(randomData.w).clamp(0.0, 0.9999);

            // 2. Forces
            const textureForce = this._getTextureForce(uv, forceStrength);
            const gravityForce = this._getGravityForce();
            const randomForce = randomData.xy;
            
            const mouseForce = this._getMouseForce_repulsion(position, this.mousePositionUniform, this.mouseRadiusUniform, this.mouseForceUniform.mul(0.5));
            const mouseTrailForce = this._getMouseForce_repulsion(position, this.mouseTrailUniform, this.mouseTrailRadiusUniform, this.mouseForceUniform.mul(0.35));

            // 3. Integration
            const totalForce = textureForce.add(gravityForce).add(randomForce);
            
            TSL.If(this.mouseActiveUniform.greaterThan(0.5), () => {
                totalForce.addAssign(mouseForce.add(mouseForce.mul(1.8)));
            });

            velocity.xy.addAssign(totalForce.mul(this.deltaUniform));
            velocity.xy.mulAssign(friction);
            position.xy.addAssign(velocity.xy.mul(this.deltaUniform));

            // 4. Bounds
            this._applyBounds(position);
        })().compute(this.NUM_PARTICLES);
    }

    _buildRender_points() {
        const geometry = new THREE.BufferGeometry();
        const ids = new Float32Array(this.NUM_PARTICLES);

        for (let i = 0; i < this.NUM_PARTICLES; i++) {
            ids[i] = i;
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.NUM_PARTICLES * 3), 3));
        geometry.setAttribute('particleId', new THREE.Float32BufferAttribute(ids, 1));

        const material = new THREE_GPU.PointsNodeMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        material.positionNode = this.positionStorage.element(TSL.vertexIndex).xyz;
        material.sizeNode = TSL.float(this.PARTICLE_SIZE);

        const velocity = this.velocityStorage.element(TSL.vertexIndex);
        material.colorNode = this._getColor(velocity);

        // material.colorNode = TSL.vec3(0.0, 0.0, 0.0);

        this.points = new THREE.Points(geometry, material);
        this.world3D.add(this.points);
    }

    _buildRender_cuads() {
            const geometry = new THREE.PlaneGeometry(1, 1);

            const material = new THREE_GPU.MeshBasicNodeMaterial({
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            material.positionNode = TSL.positionLocal
                .mul(this.PARTICLE_SIZE)
                .add(this.positionStorage.element(TSL.instanceIndex).xyz);

            const velocity = this.velocityStorage.element(TSL.instanceIndex);
            material.colorNode = this._getColor(velocity);

            this.points = new THREE.InstancedMesh(geometry, material, this.NUM_PARTICLES);
            this.points.frustumCulled = false;
            this.world3D.add(this.points);
        }

    update_RAF() {
        this.frame?.update_RAF();

        if (!this.simulationCompute) {
            return;
        }

        this.elapsedTime += this.app.DELTA_TIME;
        this.deltaUniform.value = this.app.DELTA_TIME;
        this.FORCE_STRENGTH = this._getOscillatingValue(
            this.FORCE_STRENGTH_MIN,
            this.FORCE_STRENGTH_MAX,
            this.FORCE_STRENGTH_PERIOD,
            this.elapsedTime
        );
        this.FRICTION = this._getOscillatingValue(
            this.FRICTION_MIN,
            this.FRICTION_MAX,
            this.FRICTION_PERIOD,
            this.elapsedTime
        );
        this.forceStrengthUniform.value = this.FORCE_STRENGTH;
        this.frictionUniform.value = this.FRICTION;
        this._updateMouseTrail();
        this.mousePositionUniform.value.copy(this.mouseCurrent);
        this.mouseTrailUniform.value.copy(this.mouseTrail);
        this.mouseActiveUniform.value = this.mouseIsActive ? 1.0 : 0.0;

        const renderer = this.app.get_render();


        if (renderer && typeof renderer.computeAsync === 'function') {
            renderer.computeAsync(this.simulationCompute);
        }

        this.suzanne_mesh.rotation.y += 0.01;
    }
    //----------------------------------------------
    // PUBLIC API:
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:
    _setupMouseInteraction() {
        const target = this.app.$mouseEvents || this.app.$container;

        if (!target) {
            return;
        }

        target.addEventListener('pointermove', this._onPointerMove = (event) => {
            const rect = target.getBoundingClientRect();
            const localX = event.clientX - rect.left;
            const localY = event.clientY - rect.top;

            this.mouseTarget.set(
                ((localX / rect.width) - 0.5) * this.app.size.REF.width,
                (0.5 - (localY / rect.height)) * this.app.size.REF.height
            );

            if (!this.mouseIsActive) {
                this.mouseCurrent.copy(this.mouseTarget);
                this.mouseTrail.copy(this.mouseTarget);
            }

            this.mouseIsActive = true;
        });

        const deactivateMouse = () => {
            this.mouseIsActive = false;
        };

        target.addEventListener('pointerleave', this._onPointerLeave = deactivateMouse);
        target.addEventListener('pointercancel', this._onPointerCancel = deactivateMouse);
    }

    _updateMouseTrail() {
        if (!this.mouseIsActive) {
            this.mouseCurrent.lerp(this.mouseTarget, 0.04);
            this.mouseTrail.lerp(this.mouseCurrent, 0.08);
            return;
        }

        this.mouseCurrent.lerp(this.mouseTarget, this.MOUSE_SMOOTHING);
        this.mouseTrail.lerp(this.mouseCurrent, this.MOUSE_SMOOTHING * 0.45);
    }

    //----------------------------------------------
    // AUX:
    _getOscillatingValue(min, max, period, time) {
        const phase = (time / period) * Math.PI * 2
        const normalized = (Math.sin(phase) + 1) * 0.5

        return min + ((max - min) * normalized)
    }

}
export default E26001_GPUTest
