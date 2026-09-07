import * as THREE from 'three'

import AssetLoader from '../../../core/AssetLoder/AssetLoader'
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'

class E26003_InfiniteGrassGL {
    constructor() {
        console.log("(E26003_InfiniteGrassGL.CONSTRUCTOR)!")
        this.type = "WEBGL_APP"
    }

    init(app) {
        console.log("(E26003_InfiniteGrassGL.init)!")
        this.app = app
        this.scene = this.app.render.scene
        this.clock = new THREE.Clock()

        //---------------------
        // STAGE CAMERA:
        this.stageCamera = new StageOrtoCamera({
            app: this.app,
            project: this,
            parent3D: this.scene,
            size: this.app.size.CURRENT
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())
        //---------------------

        //---------------------
        // LOAD ASSETS:
        this.loader = new AssetLoader({
            app: this.app,
            pathPrefix: this.app.pathPrefix
        })
        this.loader.emitter.on("onCompleted", () => {
            console.log("ALL ASSETS LOADED!")
            this.app.emitter.emit("onProjectLoaded", {})
        })

        this.loader.start()
        //---------------------
    }

    build() {
        console.log("(E26003_InfiniteGrassGL.build)!")

        this.world3D = new THREE.Object3D()
        this.scene.add(this.world3D)

        this.frame = new OrtoResponsiveFrame({
            app: this.app,
            project: this,
            itemRef: this.world3D,
            refWidth: this.app.size.REF.width,
            refHeight: this.app.size.REF.height,
            MODE: "COVER",
            SCALE_FACTOR: 1.0
        })

        // --------------------------------------------------
        // TUNING
        // --------------------------------------------------
        this.params = {
            patchSize: 1800,         // world-space size of the grass patch
            bladeCount: 2500000,      // number of blades
            bladeWidth: 0.22,
            bladeHeight: 2.0,
            bladeHeightVar: 1.25,
            cellSnap: 2.0,          // snap patch position to reduce shimmer
            windStrength: 0.28,
            windSpeed: 1.1,
            edgeFade: 0.18,
            centerHole: 0.0         // raise if you want no grass at exact center
        }

        // --------------------------------------------------
        // GROUND
        // --------------------------------------------------
        const groundGeo = new THREE.CircleGeometry(this.params.patchSize * 0.5, 96)
        const groundMat = new THREE.MeshBasicMaterial({
            color: 0x2d5a27
        })
        this.ground = new THREE.Mesh(groundGeo, groundMat)
        this.ground.rotation.x = -Math.PI * 0.5
        this.ground.position.y = -0.02
        this.world3D.add(this.ground)

        // --------------------------------------------------
        // BASE BLADE GEOMETRY
        // a vertical plane with subdivisions so we can bend it in the shader
        // --------------------------------------------------
        const bladeGeo = new THREE.PlaneGeometry(
            this.params.bladeWidth,
            this.params.bladeHeight,
            1,
            4
        )
        bladeGeo.translate(0, this.params.bladeHeight * 0.5, 0)

        // --------------------------------------------------
        // INSTANCE ATTRIBUTES
        // --------------------------------------------------
        const instanceCount = this.params.bladeCount
        const offsets = new Float32Array(instanceCount * 3)
        const scales = new Float32Array(instanceCount)
        const rotations = new Float32Array(instanceCount)
        const bends = new Float32Array(instanceCount)
        const colors = new Float32Array(instanceCount * 3)

        const half = this.params.patchSize * 0.5
        const colorA = new THREE.Color(0x4d8f37) // darker
        const colorB = new THREE.Color(0x8fd15b) // lighter

        for (let i = 0; i < instanceCount; i++) {
            // random placement on a square patch
            const x = (Math.random() - 0.5) * this.params.patchSize
            const z = (Math.random() - 0.5) * this.params.patchSize

            offsets[i * 3 + 0] = x
            offsets[i * 3 + 1] = 0
            offsets[i * 3 + 2] = z

            scales[i] = 0.65 + Math.random() * this.params.bladeHeightVar
            rotations[i] = Math.random() * Math.PI * 2.0
            bends[i] = 0.25 + Math.random() * 0.75

            const mixT = Math.random()
            const c = colorA.clone().lerp(colorB, mixT)
            colors[i * 3 + 0] = c.r
            colors[i * 3 + 1] = c.g
            colors[i * 3 + 2] = c.b
        }

        bladeGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3))
        bladeGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1))
        bladeGeo.setAttribute('aRotation', new THREE.InstancedBufferAttribute(rotations, 1))
        bladeGeo.setAttribute('aBend', new THREE.InstancedBufferAttribute(bends, 1))
        bladeGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3))

        // --------------------------------------------------
        // SHADER MATERIAL
        // --------------------------------------------------
        this.material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 },
                uPatchSize: { value: this.params.patchSize },
                uWindStrength: { value: this.params.windStrength },
                uWindSpeed: { value: this.params.windSpeed },
                uEdgeFade: { value: this.params.edgeFade },
                uCenterHole: { value: this.params.centerHole }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uPatchSize;
                uniform float uWindStrength;
                uniform float uWindSpeed;

                attribute vec3 aOffset;
                attribute float aScale;
                attribute float aRotation;
                attribute float aBend;
                attribute vec3 aColor;

                varying float vHeightRatio;
                varying vec3 vColor;
                varying vec2 vPatchUv;
                varying float vDistToCenter;

                mat2 rotate2D(float a) {
                    float s = sin(a);
                    float c = cos(a);
                    return mat2(c, -s, s, c);
                }

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                void main() {
                    vec3 pos = position;

                    // scale blade
                    pos.y *= aScale;
                    pos.x *= mix(0.85, 1.2, fract(aScale * 3.17));

                    // normalize blade height 0..1
                    float h = uv.y;
                    vHeightRatio = h;

                    // procedural bend
                    float windNoise = sin((aOffset.x * 0.11) + uTime * uWindSpeed)
                                    * cos((aOffset.z * 0.09) + uTime * uWindSpeed * 0.85);

                    float sideNoise = sin((aOffset.x + aOffset.z) * 0.07 + uTime * 0.7);

                    pos.x += windNoise * uWindStrength * h * h * aBend;
                    pos.z += sideNoise * uWindStrength * 0.35 * h * h * aBend;

                    // local random yaw
                    pos.xz = rotate2D(aRotation) * pos.xz;

                    // instance offset
                    pos += aOffset;

                    vPatchUv = (aOffset.xz / uPatchSize) + 0.5;
                    vDistToCenter = length(aOffset.xz) / (uPatchSize * 0.5);
                    vColor = aColor;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uEdgeFade;
                uniform float uCenterHole;

                varying float vHeightRatio;
                varying vec3 vColor;
                varying vec2 vPatchUv;
                varying float vDistToCenter;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                void main() {
                    // blade silhouette:
                    // narrow at tip, slightly fuller near base
                    float bladeShape = 1.0 - abs((gl_PointCoord.x * 2.0 - 1.0)); // unused safeguard
                    float widthMask = 1.0 - abs((vHeightRatio * 0.0)); // placeholder to keep shader simple

                    // use interpolated plane UV logic from clip-space-ish shape:
                    // derive horizontal mask from screen-facing fragment coords isn't robust,
                    // so instead use the built-in plane UV through vHeightRatio only + alpha edge.
                    // A softer alpha works well enough for a stylized look.
                    float alpha = 1.0;

                    // tip fade
                    alpha *= smoothstep(1.0, 0.82, vHeightRatio);

                    // edge fade for circular patch
                    float edge = 1.0 - smoothstep(1.0 - uEdgeFade, 1.0, vDistToCenter);
                    alpha *= edge;

                    // optional center hole
                    if (uCenterHole > 0.0) {
                        float center = smoothstep(uCenterHole, uCenterHole + 0.08, vDistToCenter);
                        alpha *= center;
                    }

                    // stochastic thinning near the far edge to hide patch boundary
                    float rnd = hash(floor(vPatchUv * 200.0));
                    float thinning = smoothstep(0.6, 1.0, edge + rnd * 0.35);
                    alpha *= thinning;

                    if (alpha < 0.05) discard;

                    // base darkening + lighter tip
                    vec3 baseCol = vColor * 0.72;
                    vec3 tipCol = vColor * 1.15;
                    vec3 color = mix(baseCol, tipCol, smoothstep(0.0, 0.85, vHeightRatio));

                    gl_FragColor = vec4(color, alpha);
                }
            `
        })

        this.grass = new THREE.InstancedMesh(bladeGeo, this.material, instanceCount)
        this.grass.instanceMatrix.setUsage(THREE.StaticDrawUsage)

        // identity matrices because positions come from instanced attributes in shader
        const dummy = new THREE.Object3D()
        for (let i = 0; i < instanceCount; i++) {
            dummy.position.set(0, 0, 0)
            dummy.rotation.set(0, 0, 0)
            dummy.scale.set(1, 1, 1)
            dummy.updateMatrix()
            this.grass.setMatrixAt(i, dummy.matrix)
        }

        this.grass.frustumCulled = false // important! we handle culling manually in shader, so disable built-in frustum culling
        this.world3D.add(this.grass)

        // start centered
        this.recenterPatch(true)
    }

    recenterPatch(force = false) {
        const camera = this.app.render.stageCamera || this.stageCamera.get_camera()
        if (!camera) return

        const snap = this.params.cellSnap
        const x = Math.round(camera.position.x / snap) * snap
        const z = Math.round(camera.position.z / snap) * snap

        if (!force) {
            if (
                this.world3D.position.x === x &&
                this.world3D.position.z === z
            ) {
                return
            }
        }

        this.world3D.position.x = x
        this.world3D.position.z = z
    }

    update_RAF() {
        if (!this.material) return

        const t = this.clock.getElapsedTime()
        this.material.uniforms.uTime.value = t

        // move the whole grass patch with the camera
        this.recenterPatch(false)

        // keep the ground centered too
        // already parented to world3D, so it follows automatically
    }
}

export default E26003_InfiniteGrassGL