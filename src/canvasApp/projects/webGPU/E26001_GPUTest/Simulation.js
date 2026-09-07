import * as THREE from 'three';
import * as THREE_GPU from 'three/webgpu';
import * as TSL from 'three/tsl';

export class Simulation {
    constructor(app, loader, numParticles = 50000) {
        this.app = app;
        this.loader = loader;
        this.NUM_PARTICLES = numParticles;
        
        // Stage dimensions
        this.width = this.app.size.REF.width;
        this.height = this.app.size.REF.height;

        this.init();
    }

    init() {
        // 1. Initialize data arrays on the CPU
        const initialPositions = new Float32Array(this.NUM_PARTICLES * 2);
        const initialVelocities = new Float32Array(this.NUM_PARTICLES * 2);

        for (let i = 0; i < this.NUM_PARTICLES; i++) {
            // Randomly distribute across the stage (in pixel coordinates)
            initialPositions[i * 2 + 0] = Math.random() * this.width;
            initialPositions[i * 2 + 1] = Math.random() * this.height;

            // Start with zero velocity
            initialVelocities[i * 2 + 0] = 0;
            initialVelocities[i * 2 + 1] = 0;
        }

        // 2. Create GPU Storage Buffers
        this.positionBuffer = TSL.storage(initialPositions, 'vec2', this.NUM_PARTICLES);
        this.velocityBuffer = TSL.storage(initialVelocities, 'vec2', this.NUM_PARTICLES);

        // 3. Setup Uniforms and Texture
        const stageSize = TSL.uniform(new THREE.Vector2(this.width, this.height));
        const forceFieldTex = this.loader.get_texture("forceField");
        
        // 4. Define the Compute Logic
        const computeLogic = TSL.fn(() => {
            const index = TSL.instanceIndex;
            
            // Read current state
            const pos = this.positionBuffer.element(index);
            const vel = this.velocityBuffer.element(index);

            // Calculate UV coordinates (mapping pixel position to 0.0 - 1.0)
            const uv = pos.div(stageSize);

            // Sample the force field texture at the particle's UV location
            const fieldSample = TSL.texture(forceFieldTex, uv);

            // Extract R and G channels. 
            // We subtract 0.5 and multiply by 2.0 to remap the [0, 1] color range to a [-1, 1] directional vector.
            const force = fieldSample.rg.sub(TSL.vec2(0.5)).mul(2.0);

            // Update velocity (adding a slight friction/damping factor of 0.98)
            const newVel = vel.add(force).mul(0.98);

            // Update position
            let newPos = pos.add(newVel);

            // Keep particles within the stage bounds (screen wrapping)
            newPos = TSL.mod(newPos.add(stageSize), stageSize);

            // Write back to the storage buffers
            vel.assign(newVel);
            pos.assign(newPos);
        });

        // Create the executable compute node
        this.computeNode = computeLogic().compute(this.NUM_PARTICLES);

        // 5. Rendering Setup
        // Create a simple geometry for the particles (e.g., a 2x2 pixel quad)
        const geometry = new THREE.PlaneGeometry(2, 2);
        
        const material = new THREE_GPU.MeshBasicNodeMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });

        // Map the compute buffer's 2D position to the material's 3D vertex position
        // We read from the buffer using instanceIndex, and cast the vec2 to a vec3 (z = 0)
        const particlePos2D = this.positionBuffer.element(TSL.instanceIndex);
        const particlePos3D = TSL.vec3(particlePos2D.x, particlePos2D.y, 0.0);
        
        // Override the default position node
        material.positionNode = TSL.positionLocal.add(particlePos3D);

        // Create the InstancedMesh
        this.mesh = new THREE.InstancedMesh(geometry, material, this.NUM_PARTICLES);
        
        // Note: You will need to add `this.mesh` to your scene outside of this class
        // e.g., scene.add(particles.mesh);
    }

    update_RAF(renderer) {
        // Execute the compute shader before rendering the frame
        renderer.compute(this.computeNode);
    }
}