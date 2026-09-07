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
            revealDuration: 6.4
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

        this._buildWatercolorPlane()
    }

    update_RAF() {
        this.frame.update_RAF()

        if (!this.photoMaterial) return

        const elapsed = this.clock.getElapsedTime()
        this.photoMaterial.uniforms.uTime.value = elapsed*1
    }

    _buildWatercolorPlane() {
        const photoTexture = this.loader.get_texture("photo")
        photoTexture.colorSpace = THREE.SRGBColorSpace

        const imageWidth = photoTexture.image?.width || 1
        const imageHeight = photoTexture.image?.height || 1
        const planeWidth = this.app.size.REF.width
        const planeHeight = this.app.size.REF.height

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1)
        this.photoMaterial = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                uTexture: { value: photoTexture },
                uTime: { value: 0 },
                uDuration: { value: this.params.revealDuration },
                uPlaneAspect: { value: planeWidth / planeHeight },
                uImageAspect: { value: imageWidth / imageHeight }
            },
            vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uTexture;
                uniform float uTime;
                uniform float uDuration;
                uniform float uPlaneAspect;
                uniform float uImageAspect;

                varying vec2 vUv;

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
                        p *= 2.03;
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

                    float paperFiber = fbm(vUv * 190.0 + vec2(3.4, 8.7));
                    float paperSpeck = noise(vUv * 520.0 + paperFiber * 11.0);
                    vec3 paperColor = vec3(0.978, 0.957, 0.918);
                    paperColor *= 0.975 + paperFiber * 0.055;
                    paperColor -= paperSpeck * 0.028;

                    if (photoUv.x < 0.0 || photoUv.x > 1.0 || photoUv.y < 0.0 || photoUv.y > 1.0) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                        return;
                    }

                    vec3 photoColor = texture2D(uTexture, photoUv).rgb;
                    vec3 hsv = rgb2hsv(photoColor);
                    float luminance = dot(photoColor, vec3(0.2126, 0.7152, 0.0722));

                    vec2 centered = vUv - 0.5;
                    centered.x *= uPlaneAspect;
                    float maxRadius = length(vec2(0.5 * uPlaneAspect, 0.5));
                    float radiusNorm = length(centered) / maxRadius;
                    float phase = min((uTime / uDuration) * 1.5, 1.5);

                    float hueBias = 0.5 + 0.5 * cos((hsv.x * 6.28318530718) + radiusNorm * 4.0);
                    float spreadSpeed = 0.76 + luminance * 0.40 + hsv.y * 0.24 + hueBias * 0.18;

                    float frontNoise = fbm(photoUv * 7.5 + vec2(8.3, 2.1));
                    float porousNoise = fbm(photoUv * 28.0 + vec2(1.7, 9.2));
                    float arrival = (radiusNorm / spreadSpeed)
                        + (frontNoise - 0.5) * 0.16
                        + (1.0 - luminance) * 0.05;

                    float wash = smoothstep(arrival - 0.18, arrival + 0.08, phase + porousNoise * 0.035);
                    float pigment = smoothstep(arrival - 0.05, arrival + 0.10, phase + porousNoise * 0.02);
                    float wetEdge = 1.0 - smoothstep(0.0, 0.18, abs(phase - arrival + (porousNoise - 0.5) * 0.04));
                    float granulation = fbm(photoUv * 88.0 + vec2(porousNoise * 1.5, frontNoise * 1.8));

                    vec3 dilutedColor = mix(paperColor, photoColor, wash * (0.34 + hsv.y * 0.18));
                    vec3 pigmentColor = mix(dilutedColor, photoColor * (0.92 + granulation * 0.16), pigment * (0.78 + granulation * 0.22));

                    float centerBloom = (1.0 - smoothstep(0.0, 0.26, radiusNorm)) * smoothstep(0.0, 0.16, phase);
                    vec3 edgeTint = mix(photoColor, vec3(1.0), 0.24 - hsv.y * 0.08);

                    vec3 finalColor = pigmentColor;
                    finalColor += edgeTint * wetEdge * 0.06;
                    finalColor = mix(finalColor, finalColor * 1.05 + vec3(0.012, 0.010, 0.008), centerBloom * 0.38);

                    float revealAlpha = clamp(max(wash, pigment) + wetEdge * 0.08, 0.0, 1.0);

                    if (revealAlpha < 0.01) discard;

                    gl_FragColor = vec4(finalColor, revealAlpha);
                }
            `
        })

        this.photoMesh = new THREE.Mesh(geometry, this.photoMaterial)
        this.photoMesh.scale.set(0.5, 0.5, 0.5)
        this.world3D.add(this.photoMesh)
    }
}

export default E26005_WaterColorGL
