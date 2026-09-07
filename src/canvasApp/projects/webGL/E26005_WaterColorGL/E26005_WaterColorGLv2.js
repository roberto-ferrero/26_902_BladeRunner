import * as THREE from 'three'

import AssetLoader from '../../../core/AssetLoder/AssetLoader'
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'


class E26005_WaterColorGL {
    constructor() {
        console.log("(E26005_WaterColorGL.CONSTRUCTOR)!")
        this.type = "WEBGL_APP"
    }

    init(app) {
        console.log("(E26005_WaterColorGL.init)!")
        this.app = app
        this.scene = this.app.render.scene
        this.clock = new THREE.Clock()

        this.stageCamera = new StageOrtoCamera({
            app: this.app,
            project: this,
            parent3D: this.scene,
            size: this.app.size.CURRENT
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())

        this.loader = new AssetLoader({
            app: this.app,
            pathPrefix: this.app.pathPrefix
        })

        this.loader.add_texture("photo", this.app.pathPrefix + "img/E26005_WaterColorGL/photo2.jpg", {
            generateMipmaps: true
        })

        this.loader.emitter.on("onCompleted", () => {
            console.log("ALL ASSETS LOADED!")
            this.app.emitter.emit("onProjectLoaded", {})
        })

        this.loader.start()
    }

    build() {
        console.log("(E26005_WaterColorGL.build)!")

        this.params = {
            revealDuration: 7.5,
            timeScale: 1.15,
            maxSources: 3
        }

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

        this._buildInkRevealPlane()
    }

    update_RAF() {
        this.frame.update_RAF()

        if (!this.photoMaterial) return

        this.photoMaterial.uniforms.uTime.value = this.clock.getElapsedTime()*2
    }

    _buildInkRevealPlane() {
        const photoTexture = this.loader.get_texture("photo")
        photoTexture.colorSpace = THREE.SRGBColorSpace

        const imageWidth = photoTexture.image?.width || 1
        const imageHeight = photoTexture.image?.height || 1
        const planeWidth = this.app.size.REF.width
        const planeHeight = this.app.size.REF.height
        const inkSources = this._createInkSources()

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1)
        this.photoMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTexture: { value: photoTexture },
                uTime: { value: 0 },
                uDuration: { value: this.params.revealDuration },
                uTimeScale: { value: this.params.timeScale },
                uPlaneAspect: { value: planeWidth / planeHeight },
                uImageAspect: { value: imageWidth / imageHeight },
                uSourceCount: { value: inkSources.count },
                uSourcePositions: { value: inkSources.positions },
                uRandomSeed: { value: Math.random() * 100.0 }
            },
            vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                #define MAX_SOURCES 3

                uniform sampler2D uTexture;
                uniform float uTime;
                uniform float uDuration;
                uniform float uTimeScale;
                uniform float uPlaneAspect;
                uniform float uImageAspect;
                uniform float uRandomSeed;
                uniform int uSourceCount;
                uniform vec2 uSourcePositions[MAX_SOURCES];

                varying vec2 vUv;

                float hash(float n) {
                    return fract(sin(n) * 43758.5453123);
                }

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f * f * (3.0 - 2.0 * f);

                    return mix(
                        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                        u.y
                    );
                }

                float fbm(vec2 p) {
                    float value = 0.0;
                    float amplitude = 0.5;

                    for (int i = 0; i < 5; i++) {
                        value += amplitude * noise(p);
                        p = p * 2.02 + vec2(13.1, 7.9);
                        amplitude *= 0.5;
                    }

                    return value;
                }

                vec3 rgb2hsv(vec3 c) {
                    vec4 K = vec4(0.0, -0.3333333, 0.6666667, -1.0);
                    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
                    float d = q.x - min(q.w, q.y);
                    float e = 1.0e-10;
                    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
                }

                vec2 coverUv(vec2 uv, float planeAspect, float imageAspect) {
                    vec2 result = uv - 0.5;

                    if (planeAspect > imageAspect) {
                        result.y *= imageAspect / planeAspect;
                    } else {
                        result.x *= planeAspect / imageAspect;
                    }

                    return result + 0.5;
                }

                void main() {
                    vec2 photoUv = coverUv(vUv, uPlaneAspect, uImageAspect);

                    if (photoUv.x < 0.0 || photoUv.x > 1.0 || photoUv.y < 0.0 || photoUv.y > 1.0) {
                        discard;
                    }

                    vec2 sampleStep = vec2(1.0 / 1024.0, 1.0 / 1024.0);
                    vec3 centerColor = texture2D(uTexture, photoUv).rgb;
                    vec3 colorL = texture2D(uTexture, clamp(photoUv + vec2(-sampleStep.x, 0.0), vec2(0.0), vec2(1.0))).rgb;
                    vec3 colorR = texture2D(uTexture, clamp(photoUv + vec2(sampleStep.x, 0.0), vec2(0.0), vec2(1.0))).rgb;
                    vec3 colorB = texture2D(uTexture, clamp(photoUv + vec2(0.0, -sampleStep.y), vec2(0.0), vec2(1.0))).rgb;
                    vec3 colorT = texture2D(uTexture, clamp(photoUv + vec2(0.0, sampleStep.y), vec2(0.0), vec2(1.0))).rgb;

                    vec3 nearbyColor = (centerColor + colorL + colorR + colorB + colorT) / 5.0;
                    vec3 hsv = rgb2hsv(nearbyColor);

                    float luminance = dot(nearbyColor, vec3(0.2126, 0.7152, 0.0722));
                    float lumaL = dot(colorL, vec3(0.2126, 0.7152, 0.0722));
                    float lumaR = dot(colorR, vec3(0.2126, 0.7152, 0.0722));
                    float lumaB = dot(colorB, vec3(0.2126, 0.7152, 0.0722));
                    float lumaT = dot(colorT, vec3(0.2126, 0.7152, 0.0722));

                    vec2 imageGradient = vec2(lumaR - lumaL, lumaT - lumaB);
                    vec2 pigmentGradient = vec2(
                        dot(colorR - colorL, vec3(0.299, 0.587, 0.114)),
                        dot(colorT - colorB, vec3(0.299, 0.587, 0.114))
                    );

                    float hueWave = 0.5 + 0.5 * cos(hsv.x * 6.28318530718 + uRandomSeed);
                    float localContrast = length(vec2(lumaR - lumaL, lumaT - lumaB));
                    float spreadSpeed = 0.42 + luminance * 0.38 + hsv.y * 0.22 + hueWave * 0.16 + localContrast * 1.35;

                    float simTime = uTime * uTimeScale;
                    float revealProgress = clamp(simTime / uDuration, 0.0, 1.0);
                    float easedProgress = 1.0 - pow(1.0 - revealProgress, 2.1);
                    float settle = smoothstep(0.56, 1.0, revealProgress);
                    float waveFade = 1.0 - smoothstep(0.42, 1.0, revealProgress);
                    float paperSoak = smoothstep(0.58, 1.0, revealProgress);
                    float phase = min(easedProgress * 1.52, 1.52);

                    vec2 flowNoise = vec2(
                        fbm(photoUv * 5.2 + vec2(0.0, simTime * 0.12) + uRandomSeed),
                        fbm(photoUv.yx * 5.8 + vec2(8.7, -simTime * 0.09) + uRandomSeed * 1.17)
                    ) - 0.5;

                    vec2 curlFlow = normalize(vec2(
                        flowNoise.y - pigmentGradient.y * 0.65,
                        -flowNoise.x + pigmentGradient.x * 0.65
                    ) + vec2(0.0001));

                    vec2 warpUv = photoUv
                        + curlFlow * (0.022 + (1.0 - luminance) * 0.020) * waveFade
                        + imageGradient * 0.050;

                    float arrival = 10.0;
                    float sourceBlend = 0.0;
                    float secondArrival = 10.0;

                    for (int i = 0; i < MAX_SOURCES; i++) {
                        if (i >= uSourceCount) {
                            continue;
                        }

                        vec2 source = uSourcePositions[i];
                        float sourceJitter = hash(float(i) * 17.13 + uRandomSeed);
                        vec2 delta = warpUv - source;
                        delta.x *= uImageAspect;

                        float dist = length(delta);
                        float branchNoise = fbm(delta * 15.0 + vec2(sourceJitter * 9.0, sourceJitter * 13.0));
                        float channeling = dot(normalize(delta + vec2(0.0001)), curlFlow) * 0.08;
                        float sourceArrival = (dist / spreadSpeed)
                            + (branchNoise - 0.5) * 0.22 * waveFade
                            + channeling * waveFade
                            + sourceJitter * 0.035;

                        if (sourceArrival < arrival) {
                            secondArrival = arrival;
                            arrival = sourceArrival;
                        } else if (sourceArrival < secondArrival) {
                            secondArrival = sourceArrival;
                        }

                        float mergeInfluence = exp(-dist * (7.0 + sourceJitter * 2.5));
                        sourceBlend += mergeInfluence;
                    }

                    float mergedFront = min(arrival, mix(arrival, secondArrival, clamp(sourceBlend * 0.18, 0.0, 0.35)));
                    mergedFront -= paperSoak * 0.18;
                    float fluidRipple = fbm(warpUv * 24.0 + curlFlow * 3.0 + simTime * 0.03) - 0.5;
                    float porousNoise = fbm(photoUv * 52.0 + vec2(3.2, 9.1)) - 0.5;

                    float mask = smoothstep(mergedFront - 0.17, mergedFront + 0.06, phase + fluidRipple * 0.14 * waveFade + porousNoise * 0.05);
                    float pigmentMask = smoothstep(mergedFront - 0.06, mergedFront + 0.10, phase + fluidRipple * 0.08 * waveFade);
                    float wetEdge = 1.0 - smoothstep(0.0, 0.16, abs(phase - mergedFront + fluidRipple * 0.06 * waveFade));

                    float alpha = clamp(max(mask, pigmentMask) + wetEdge * 0.12 * waveFade, 0.0, 1.0);
                    if (alpha < 0.01) {
                        discard;
                    }

                    vec2 pigmentOffset = curlFlow * (0.010 + (1.0 - luminance) * 0.016) * waveFade + imageGradient * 0.035;
                    vec3 shiftedColor = texture2D(uTexture, clamp(photoUv + pigmentOffset, vec2(0.0), vec2(1.0))).rgb;
                    float granulation = fbm(photoUv * 120.0 + vec2(11.7, 3.1));
                    float paperBreak = fbm(photoUv * 210.0 + vec2(1.3, 6.9));

                    vec3 inkBody = mix(shiftedColor, centerColor, 0.45 + luminance * 0.35);
                    inkBody *= 0.88 + granulation * 0.10;
                    inkBody = mix(inkBody, centerColor, pigmentMask * 0.55);
                    inkBody += centerColor * wetEdge * 0.045 * waveFade;
                    inkBody -= paperBreak * 0.035 * (1.0 - pigmentMask) * waveFade;
                    inkBody = mix(inkBody, centerColor, settle);

                    gl_FragColor = vec4(inkBody, alpha);
                }
            `
        })

        this.photoMesh = new THREE.Mesh(geometry, this.photoMaterial)
        this.photoMesh.scale.set(0.5, 0.5, 0.5)
        this.world3D.add(this.photoMesh)
    }

    _createInkSources() {
        const count = 2 + Math.floor(Math.random() * 2)
        const positions = []

        for (let i = 0; i < this.params.maxSources; i++) {
            if (i < count) {
                positions.push(new THREE.Vector2(
                    0.18 + Math.random() * 0.64,
                    0.18 + Math.random() * 0.64
                ))
            } else {
                positions.push(new THREE.Vector2(-10, -10))
            }
        }

        return {
            count,
            positions
        }
    }
}

export default E26005_WaterColorGL
