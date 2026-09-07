import * as THREE from 'three'
import * as THREE_GPU from 'three/webgpu'
import * as TSL from 'three/tsl'

import AssetLoader from '../../../core/AssetLoder/AssetLoader'
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'

class E26006_InkRevealGPU {
    constructor() {
        console.log("(E26006_InkRevealGPU.CONSTRUCTOR)!")
        this.type = "WEBGPU_APP"

        this.MAX_SOURCES = 3
        this.params = {
            revealDuration: 5,
            timeScale: 0.2,
            sourceCount: 1,
            sourceInset: 0.16,
            initialSeedSize: 0.008,
            revealBias: 0.12,
            baseSpread: 1.18,
            similarityInfluence: 0.62,
            hueInfluence: 0.36,
            brightnessInfluence: 0.58,
            edgeResistance: 1.2,
            flowStrength: 0.028,
            branchNoise: 0.18,
            noiseScale: 6.4,
            edgeSoftness: 0.11,
            wetEdge: 0.06,
            pigmentBleed: 0.0, //0.012
            granulation: 0.08,
            easePower: 2.15,
            fullRevealStart: 0.84
        }

        this.sourcePositions = Array.from({ length: this.MAX_SOURCES }, () => new THREE.Vector2(0.5, 0.5))
        this.animationStartTime = 0
        this.randomSeed = Math.random() * 100.0
        this.guiFolder = null
    }

    init(app) {
        console.log("(E26006_InkRevealGPU.init)!")
        this.app = app
        this.scene = this.app.render.scene

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
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
            magFilter: THREE.LinearFilter
        })

        this.loader.emitter.on("onCompleted", () => {
            console.log("ALL ASSETS LOADED!")
            this.app.emitter.emit("onProjectLoaded", {})
        })

        this.loader.start()

        this.app.emitter.on("onAppSizeUpdate", () => {
            this._syncSizeUniforms()
        })
    }

    build() {
        console.log("(E26006_InkRevealGPU.build)!")

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
        this._setupGUI()
        this.restart({
            randomizeSources: true,
            randomizeSeed: true
        })
    }

    update_RAF() {
        this.frame?.update_RAF()

        if (!this.elapsedUniform) {
            return
        }

        this.elapsedUniform.value = Math.max(0, this.app.ELAPSED_TIME - this.animationStartTime)
        this._syncParamUniforms()
    }

    restart(options = {}) {
        const randomizeSources = options.randomizeSources ?? false
        const randomizeSeed = options.randomizeSeed ?? false

        if (randomizeSeed) {
            this.randomSeed = Math.random() * 100.0
        }

        if (randomizeSources) {
            this._randomizeSources()
        }

        this.animationStartTime = this.app?.ELAPSED_TIME || 0
        this._syncSourceUniforms()
        this._syncParamUniforms()
    }

    _buildInkRevealPlane() {
        const photoTexture = this.loader.get_texture("photo")
        photoTexture.colorSpace = THREE.SRGBColorSpace

        this.photoTexture = photoTexture
        this.photoTextureNode = TSL.texture(photoTexture)

        this.elapsedUniform = TSL.uniform(0.0)
        this.durationUniform = TSL.uniform(this.params.revealDuration)
        this.timeScaleUniform = TSL.uniform(this.params.timeScale)
        this.sourceCountUniform = TSL.uniform(this.params.sourceCount)
        this.planeAspectUniform = TSL.uniform(this.app.size.CURRENT.aspect)
        this.imageAspectUniform = TSL.uniform((photoTexture.image?.width || 1) / (photoTexture.image?.height || 1))
        this.texelStepUniform = TSL.uniform(new THREE.Vector2(
            1 / Math.max(1, photoTexture.image?.width || 1),
            1 / Math.max(1, photoTexture.image?.height || 1)
        ))
        this.randomSeedUniform = TSL.uniform(this.randomSeed)
        this.initialSeedSizeUniform = TSL.uniform(this.params.initialSeedSize)
        this.revealBiasUniform = TSL.uniform(this.params.revealBias)
        this.baseSpreadUniform = TSL.uniform(this.params.baseSpread)
        this.similarityInfluenceUniform = TSL.uniform(this.params.similarityInfluence)
        this.hueInfluenceUniform = TSL.uniform(this.params.hueInfluence)
        this.brightnessInfluenceUniform = TSL.uniform(this.params.brightnessInfluence)
        this.edgeResistanceUniform = TSL.uniform(this.params.edgeResistance)
        this.flowStrengthUniform = TSL.uniform(this.params.flowStrength)
        this.branchNoiseUniform = TSL.uniform(this.params.branchNoise)
        this.noiseScaleUniform = TSL.uniform(this.params.noiseScale)
        this.edgeSoftnessUniform = TSL.uniform(this.params.edgeSoftness)
        this.wetEdgeUniform = TSL.uniform(this.params.wetEdge)
        this.pigmentBleedUniform = TSL.uniform(this.params.pigmentBleed)
        this.granulationUniform = TSL.uniform(this.params.granulation)
        this.easePowerUniform = TSL.uniform(this.params.easePower)
        this.fullRevealStartUniform = TSL.uniform(this.params.fullRevealStart)
        this.sourceUniforms = Array.from({ length: this.MAX_SOURCES }, () => TSL.uniform(new THREE.Vector2(0.5, 0.5)))

        const inkRevealFn = this._createInkRevealNode()
        const inkResult = inkRevealFn()

        const geometry = new THREE.PlaneGeometry(this.app.size.REF.width, this.app.size.REF.height, 1, 1)
        const material = new THREE_GPU.MeshBasicNodeMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        })

        material.colorNode = inkResult.rgb
        material.opacityNode = inkResult.a
        material.alphaTest = 0.001

        this.photoMesh = new THREE.Mesh(geometry, material)
        this.photoMesh.scale.set(0.5, 0.5, 0.5)
        this.world3D.add(this.photoMesh)
        this.inkMaterial = material

        this._syncSizeUniforms()
        this._syncParamUniforms()
        this._syncSourceUniforms()
    }

    _createInkRevealNode() {
        const coverUv = TSL.Fn(([sourceUv, planeAspect, imageAspect]) => {
            const centeredUv = sourceUv.sub(0.5)
            const isWider = planeAspect.greaterThan(imageAspect)

            return TSL.vec2(
                TSL.select(
                    isWider,
                    centeredUv.x,
                    centeredUv.x.mul(planeAspect.div(imageAspect))
                ),
                TSL.select(
                    isWider,
                    centeredUv.y.mul(imageAspect.div(planeAspect)),
                    centeredUv.y
                )
            ).add(0.5)
        })

        const noiseFbm2 = TSL.Fn(([p, seed]) => {
            const octave0 = TSL.mx_noise_float(TSL.vec3(p.x, p.y, seed)).mul(0.5).add(0.5)
            const octave1 = TSL.mx_noise_float(TSL.vec3(p.x.mul(2.03), p.y.mul(2.03), seed.add(11.3))).mul(0.5).add(0.5)
            const octave2 = TSL.mx_noise_float(TSL.vec3(p.x.mul(4.09), p.y.mul(4.09), seed.add(23.7))).mul(0.5).add(0.5)
            const octave3 = TSL.mx_noise_float(TSL.vec3(p.x.mul(8.21), p.y.mul(8.21), seed.add(37.1))).mul(0.5).add(0.5)

            return octave0.mul(0.5)
                .add(octave1.mul(0.25))
                .add(octave2.mul(0.15))
                .add(octave3.mul(0.1))
        })

        const hueSimilarity = TSL.Fn(([hueA, hueB]) => {
            const hueDelta = TSL.abs(hueA.sub(hueB))
            const wrappedDelta = TSL.min(hueDelta, TSL.float(1.0).sub(hueDelta))

            return TSL.float(1.0).sub(wrappedDelta.mul(2.0)).clamp(0.0, 1.0)
        })

        const sourceArrival = (sourceNode, activeThreshold, sourceJitter, flowUv, photoUv, flowDir, spreadSpeed, localSimilarity, waveFade) => {
            const delta = flowUv.sub(sourceNode).toVar()
            delta.x.assign(delta.x.mul(this.imageAspectUniform))

            const distance = delta.length().add(0.0001)
            const direction = delta.div(distance)
            const branch = noiseFbm2(
                delta.mul(this.noiseScaleUniform.mul(4.0)).add(flowUv.mul(2.0)),
                this.randomSeedUniform.add(sourceJitter)
            ).sub(0.5)
            const flowChannel = direction.dot(flowDir).mul(this.flowStrengthUniform.mul(5.0))

            const arrival = distance.div(spreadSpeed)
                .sub(this.initialSeedSizeUniform)
                .add(branch.mul(this.branchNoiseUniform).mul(waveFade))
                .sub(flowChannel.mul(waveFade))
                .sub(localSimilarity.mul(this.similarityInfluenceUniform).mul(0.18))
                .add(sourceJitter)

            return TSL.select(
                this.sourceCountUniform.greaterThan(activeThreshold),
                arrival,
                TSL.float(999.0)
            )
        }

        return TSL.Fn(() => {
            const baseUv = TSL.uv()
            const photoUv = coverUv(baseUv, this.planeAspectUniform, this.imageAspectUniform).toVar()
            const clampedPhotoUv = photoUv.clamp(0.0, 1.0).toVar()

            const insidePhoto = photoUv.x.greaterThanEqual(0.0)
                .and(photoUv.x.lessThanEqual(1.0))
                .and(photoUv.y.greaterThanEqual(0.0))
                .and(photoUv.y.lessThanEqual(1.0))

            const leftUv = clampedPhotoUv.add(TSL.vec2(this.texelStepUniform.x.negate(), 0.0)).clamp(0.0, 1.0)
            const rightUv = clampedPhotoUv.add(TSL.vec2(this.texelStepUniform.x, 0.0)).clamp(0.0, 1.0)
            const bottomUv = clampedPhotoUv.add(TSL.vec2(0.0, this.texelStepUniform.y.negate())).clamp(0.0, 1.0)
            const topUv = clampedPhotoUv.add(TSL.vec2(0.0, this.texelStepUniform.y)).clamp(0.0, 1.0)

            const centerColor = this.photoTextureNode.sample(clampedPhotoUv).rgb.toVar()
            const colorL = this.photoTextureNode.sample(leftUv).rgb
            const colorR = this.photoTextureNode.sample(rightUv).rgb
            const colorB = this.photoTextureNode.sample(bottomUv).rgb
            const colorT = this.photoTextureNode.sample(topUv).rgb

            const centerHsv = TSL.mx_rgbtohsv(centerColor)
            const hsvL = TSL.mx_rgbtohsv(colorL)
            const hsvR = TSL.mx_rgbtohsv(colorR)
            const hsvB = TSL.mx_rgbtohsv(colorB)
            const hsvT = TSL.mx_rgbtohsv(colorT)

            const luminanceCenter = TSL.luminance(centerColor)
            const luminanceL = TSL.luminance(colorL)
            const luminanceR = TSL.luminance(colorR)
            const luminanceB = TSL.luminance(colorB)
            const luminanceT = TSL.luminance(colorT)

            const brightnessSimilarity = TSL.float(1.0).sub(
                TSL.abs(luminanceL.sub(luminanceCenter))
                    .add(TSL.abs(luminanceR.sub(luminanceCenter)))
                    .add(TSL.abs(luminanceB.sub(luminanceCenter)))
                    .add(TSL.abs(luminanceT.sub(luminanceCenter)))
                    .mul(0.25)
                    .mul(2.3)
            ).clamp(0.0, 1.0)

            const hueAlignment = hueSimilarity(centerHsv.x, hsvL.x)
                .add(hueSimilarity(centerHsv.x, hsvR.x))
                .add(hueSimilarity(centerHsv.x, hsvB.x))
                .add(hueSimilarity(centerHsv.x, hsvT.x))
                .mul(0.25)

            const colorSimilarity = TSL.float(1.0).sub(
                colorL.sub(centerColor).length()
                    .add(colorR.sub(centerColor).length())
                    .add(colorB.sub(centerColor).length())
                    .add(colorT.sub(centerColor).length())
                    .mul(0.25)
                    .mul(1.55)
            ).clamp(0.0, 1.0)

            const localSimilarity = TSL.mix(colorSimilarity, brightnessSimilarity, 0.5)
            const gradient = TSL.vec2(
                luminanceR.sub(luminanceL),
                luminanceT.sub(luminanceB)
            ).toVar()
            const localContrast = gradient.length()

            const progress = this.elapsedUniform.mul(this.timeScaleUniform)
                .div(this.durationUniform)
                .clamp(0.0, 1.0)
                .toVar()
            const easedProgress = TSL.float(1.0).sub(
                TSL.pow(TSL.float(1.0).sub(progress), this.easePowerUniform)
            )
            const settle = TSL.smoothstep(0.55, 1.0, progress)
            const waveFade = TSL.float(1.0).sub(TSL.smoothstep(0.3, 1.0, progress))

            const flowNoise = TSL.vec2(
                noiseFbm2(
                    photoUv.mul(this.noiseScaleUniform).add(TSL.vec2(0.0, this.elapsedUniform.mul(0.14))),
                    this.randomSeedUniform
                ),
                noiseFbm2(
                    photoUv.yx.mul(this.noiseScaleUniform.mul(1.14)).add(TSL.vec2(7.3, this.elapsedUniform.mul(-0.09))),
                    this.randomSeedUniform.add(17.0)
                )
            ).sub(0.5)

            const flowVector = TSL.vec2(
                flowNoise.y.sub(gradient.y.mul(0.75)),
                gradient.x.mul(0.75).sub(flowNoise.x)
            ).toVar()
            const flowMagnitude = TSL.max(flowVector.length(), 0.0001)
            const flowDir = flowVector.div(flowMagnitude)

            const flowUv = photoUv.add(
                flowDir.mul(this.flowStrengthUniform)
                    .mul(waveFade)
                    .mul(TSL.float(0.65).add(TSL.float(1.0).sub(luminanceCenter).mul(0.85)))
            ).toVar()

            const spreadSpeed = this.baseSpreadUniform.mul(
                TSL.float(0.62)
                    .add(localSimilarity.mul(this.similarityInfluenceUniform))
                    .add(hueAlignment.mul(this.hueInfluenceUniform))
                    .add(brightnessSimilarity.mul(this.brightnessInfluenceUniform))
            ).div(
                TSL.float(1.0).add(localContrast.mul(this.edgeResistanceUniform))
            ).clamp(0.12, 6.0)

            const arrival0 = sourceArrival(this.sourceUniforms[0], 0.5, 0.031, flowUv, photoUv, flowDir, spreadSpeed, localSimilarity, waveFade)
            const arrival1 = sourceArrival(this.sourceUniforms[1], 1.5, 0.067, flowUv, photoUv, flowDir, spreadSpeed, localSimilarity, waveFade)
            const arrival2 = sourceArrival(this.sourceUniforms[2], 2.5, 0.113, flowUv, photoUv, flowDir, spreadSpeed, localSimilarity, waveFade)

            const firstArrival = TSL.min(TSL.min(arrival0, arrival1), arrival2).toVar()
            const arrivalBlend = TSL.min(
                TSL.max(TSL.min(arrival0, arrival1), TSL.min(TSL.max(arrival0, arrival1), arrival2)),
                TSL.float(999.0)
            )
            const mergedArrival = TSL.mix(
                firstArrival,
                arrivalBlend,
                TSL.float(0.16).mul(this.sourceCountUniform.sub(1.0).clamp(0.0, 2.0))
            ).toVar()

            const frontNoise = noiseFbm2(
                flowUv.mul(this.noiseScaleUniform.mul(3.5)).add(flowDir.mul(2.0)),
                this.randomSeedUniform.add(29.0)
            ).sub(0.5)
            const porousNoise = noiseFbm2(
                photoUv.mul(this.noiseScaleUniform.mul(18.0)).add(TSL.vec2(3.7, 8.1)),
                this.randomSeedUniform.add(47.0)
            ).sub(0.5)

            const revealField = easedProgress.mul(1.9)
                .sub(this.revealBiasUniform)
                .add(frontNoise.mul(this.branchNoiseUniform).mul(waveFade))
                .add(porousNoise.mul(0.05).mul(waveFade))
                .add(localSimilarity.mul(0.06))

            const alphaCore = TSL.smoothstep(
                mergedArrival.sub(this.edgeSoftnessUniform),
                mergedArrival.add(this.edgeSoftnessUniform.mul(0.55)),
                revealField
            )

            const edgeBand = TSL.float(1.0).sub(
                TSL.smoothstep(
                    0.0,
                    this.edgeSoftnessUniform.mul(1.8),
                    TSL.abs(revealField.sub(mergedArrival))
                )
            ).mul(this.wetEdgeUniform).mul(waveFade)

            const finalFill = TSL.smoothstep(this.fullRevealStartUniform, 1.0, progress)
            const alpha = TSL.max(
                alphaCore.add(edgeBand).clamp(0.0, 1.0),
                finalFill
            ).toVar()

            const pigmentUv = clampedPhotoUv.add(
                flowDir.mul(this.pigmentBleedUniform)
                    .mul(waveFade)
                    .mul(TSL.float(1.0).add(TSL.float(1.0).sub(luminanceCenter)))
            ).clamp(0.0, 1.0)

            const shiftedColor = this.photoTextureNode.sample(pigmentUv).rgb
            const granulation = noiseFbm2(
                photoUv.mul(this.noiseScaleUniform.mul(26.0)).add(TSL.vec2(11.9, 3.4)),
                this.randomSeedUniform.add(61.0)
            )

            const inkBody = TSL.mix(
                TSL.mix(shiftedColor, centerColor, 0.48),
                centerColor,
                settle
            ).mul(
                TSL.float(1.0).sub(this.granulationUniform.mul(0.5))
                    .add(granulation.mul(this.granulationUniform))
            ).add(
                centerColor.mul(edgeBand.mul(0.08))
            ).clamp(0.0, 1.0)

            return TSL.vec4(
                inkBody,
                TSL.select(insidePhoto, alpha, TSL.float(0.0))
            )
        })
    }

    _setupGUI() {
        if (!this.app.GUI_MODE || !this.app.dev?.gui) {
            return
        }

        this.guiFolder = this.app.dev.gui.addFolder('Ink Reveal GPU')
        this.guiFolder.add(this.params, 'revealDuration', 2.0, 20.0, 0.1).name('duration')
        this.guiFolder.add(this.params, 'timeScale', 0.25, 2.5, 0.01).name('time scale')
        this.guiFolder.add(this.params, 'sourceCount', 2, 3, 1).name('sources')
        this.guiFolder.add(this.params, 'sourceInset', 0.05, 0.4, 0.01).name('source inset')
        this.guiFolder.add(this.params, 'initialSeedSize', 0.0, 0.05, 0.0005).name('seed size')
        this.guiFolder.add(this.params, 'revealBias', 0.0, 0.25, 0.001).name('start bias')
        this.guiFolder.add(this.params, 'baseSpread', 0.4, 2.5, 0.01).name('base spread')
        this.guiFolder.add(this.params, 'similarityInfluence', 0.0, 1.4, 0.01).name('similarity')
        this.guiFolder.add(this.params, 'hueInfluence', 0.0, 1.2, 0.01).name('hue speed')
        this.guiFolder.add(this.params, 'brightnessInfluence', 0.0, 1.2, 0.01).name('light speed')
        this.guiFolder.add(this.params, 'edgeResistance', 0.0, 2.5, 0.01).name('edge drag')
        this.guiFolder.add(this.params, 'flowStrength', 0.0, 0.08, 0.001).name('flow warp')
        this.guiFolder.add(this.params, 'branchNoise', 0.0, 0.5, 0.001).name('branch noise')
        this.guiFolder.add(this.params, 'noiseScale', 1.0, 12.0, 0.1).name('noise scale')
        this.guiFolder.add(this.params, 'edgeSoftness', 0.02, 0.3, 0.001).name('edge soft')
        this.guiFolder.add(this.params, 'wetEdge', 0.0, 0.4, 0.001).name('wet edge')
        this.guiFolder.add(this.params, 'pigmentBleed', 0.0, 0.035, 0.0005).name('pigment bleed')
        this.guiFolder.add(this.params, 'granulation', 0.0, 0.2, 0.001).name('granulation')
        this.guiFolder.add(this.params, 'easePower', 1.0, 4.0, 0.01).name('ease out')
        this.guiFolder.add(this.params, 'fullRevealStart', 0.55, 0.98, 0.01).name('full reveal')
        this.guiFolder.add({ restart: () => this.restart() }, 'restart')
        this.guiFolder.add({ reseed: () => this.restart({ randomizeSeed: true }) }, 'reseed')
        this.guiFolder.add({ randomize: () => this.restart({ randomizeSources: true, randomizeSeed: true }) }, 'randomize')
        this.guiFolder.open()
    }

    _randomizeSources() {
        const inset = THREE.MathUtils.clamp(this.params.sourceInset, 0.0, 0.45)

        for (let i = 0; i < this.MAX_SOURCES; i++) {
            this.sourcePositions[i].set(
                THREE.MathUtils.lerp(inset, 1.0 - inset, Math.random()),
                THREE.MathUtils.lerp(inset, 1.0 - inset, Math.random())
            )
        }
    }

    _syncParamUniforms() {
        if (!this.durationUniform) {
            return
        }

        this.durationUniform.value = this.params.revealDuration
        this.timeScaleUniform.value = this.params.timeScale
        this.sourceCountUniform.value = this.params.sourceCount
        this.randomSeedUniform.value = this.randomSeed
        this.initialSeedSizeUniform.value = this.params.initialSeedSize
        this.revealBiasUniform.value = this.params.revealBias
        this.baseSpreadUniform.value = this.params.baseSpread
        this.similarityInfluenceUniform.value = this.params.similarityInfluence
        this.hueInfluenceUniform.value = this.params.hueInfluence
        this.brightnessInfluenceUniform.value = this.params.brightnessInfluence
        this.edgeResistanceUniform.value = this.params.edgeResistance
        this.flowStrengthUniform.value = this.params.flowStrength
        this.branchNoiseUniform.value = this.params.branchNoise
        this.noiseScaleUniform.value = this.params.noiseScale
        this.edgeSoftnessUniform.value = this.params.edgeSoftness
        this.wetEdgeUniform.value = this.params.wetEdge
        this.pigmentBleedUniform.value = this.params.pigmentBleed
        this.granulationUniform.value = this.params.granulation
        this.easePowerUniform.value = this.params.easePower
        this.fullRevealStartUniform.value = this.params.fullRevealStart
    }

    _syncSizeUniforms() {
        if (!this.planeAspectUniform) {
            return
        }

        this.planeAspectUniform.value = this.app.size.CURRENT.aspect
    }

    _syncSourceUniforms() {
        if (!this.sourceUniforms) {
            return
        }

        for (let i = 0; i < this.MAX_SOURCES; i++) {
            this.sourceUniforms[i].value.copy(this.sourcePositions[i])
        }
    }
}

export default E26006_InkRevealGPU
