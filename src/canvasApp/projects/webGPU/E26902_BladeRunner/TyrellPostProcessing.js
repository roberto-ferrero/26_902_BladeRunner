import { Matrix4 } from 'three'
import { RenderPipeline, NodeUpdateType } from 'three/webgpu'
import { Fn, pass, uniform, float, vec2, vec3, vec4, ivec2, mix, luminance, rtt, screenUV, textureSize } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { bloomScale } from './TyrellQuality'
import { viewPosition } from './TyrellLightVolume'

// Final-camera processing only: probes and planar mirrors retain linear scene radiance.
// Resolution of the light-beam (volume) pass relative to the drawing buffer.
export const VOLUME_SCALE = Object.freeze({ 'Extra baja': .35, Baja: .4, Media: .5, Alta: .5, UltraAlta: .5 })
export default class TyrellPostProcessing {
    constructor(renderer, scene) {
        this.renderer = renderer
        this.scene = scene
        this.settings = { bloom: false, grade: false, strength: 0.16, radius: 0.25, threshold: 1.5, gradeStrength: 1 }
        this.gradeStrength = uniform(0)
        this.quality = 'Media'
        this.bloomAllowed = true
        this.volume = null
        this.camera = { projectionInverse: uniform(new Matrix4()), cameraWorld: uniform(new Matrix4()), near: uniform(.1), far: uniform(2000) }
    }
    volumeActive() { return !!(this.volume?.settings.enabled && this.volume.settings.strength > 0 && this.volume.node) }
    configure(values) {
        for (const key of ['bloom', 'grade']) if (typeof values[key] === 'boolean') this.settings[key] = values[key]
        for (const [key, min, max] of [['strength', 0, 0.6], ['radius', 0, 1], ['threshold', 0.5, 5], ['gradeStrength', 0, 1]]) {
            if (Number.isFinite(values[key])) this.settings[key] = Math.max(min, Math.min(max, values[key]))
        }
        this.gradeStrength.value = this.settings.grade ? this.settings.gradeStrength : 0
        if (this.bloomNode) {
            for (const key of ['strength', 'radius', 'threshold']) this.bloomNode[key].value = this.settings[key]
            const active = this.bloomActive()
            if (active !== this.bloomInGraph) this.setGraph(active)
        }
    }
    configureFlare(values) {
        const wasActive = this.flare?.settings.enabled && this.flare.settings.intensity > 0
        this.flare?.configure(values)
        const active = this.flare?.settings.enabled && this.flare.settings.intensity > 0
        if (this.pipeline && active !== wasActive) this.setGraph(this.bloomInGraph)
    }
    setQuality(quality, budgetMode = 'optimized') {
        this.quality = quality
        this.budgetMode = budgetMode
        this.bloomNode?.setResolutionScale(bloomScale(quality, budgetMode))
        this.volumeTexture?.setResolutionScale(VOLUME_SCALE[quality] ?? .5)
    }
    bloomActive() { return this.bloomAllowed && this.settings.bloom && this.settings.strength > 0 }
    setBloomAllowed(allowed) {
        this.bloomAllowed = Boolean(allowed)
        if (this.pipeline && this.bloomInGraph !== this.bloomActive()) this.setGraph(this.bloomActive())
    }
    initialize(camera) {
        this.scenePass = pass(this.scene, camera)
        this.scenePass.name = 'Tyrell | HDR scene'
        // Capture and live view can both render during the same animation frame.
        this.scenePass.updateBeforeType = NodeUpdateType.RENDER
        const updateScene = this.scenePass.updateBefore.bind(this.scenePass)
        this.scenePass.updateBefore = frame => {
            // Bloom's internal quad also references this texture. Do not render the
            // scene again inside that quad, whose renderer state has a black clear.
            if (this.sceneRevision === this.renderRevision) return
            this.sceneRevision = this.renderRevision
            try { updateScene(frame) }
            catch (error) { this.sceneRevision = undefined; throw error }
        }
        this.color = this.scenePass.getTextureNode('output')
        this.depth = this.scenePass.getTextureNode('depth')
        this.flareNode = this.flare?.createNode(this.depth)
        this.createBloom(this.color)
        this.pipeline = new RenderPipeline(this.renderer)
        this.setQuality(this.quality, this.budgetMode)
        this.setGraph(this.bloomActive())
    }
    createBloom(input) {
        this.bloomNode?.dispose()
        this.bloomInput = input
        this.bloomNode = bloom(input, this.settings.strength, this.settings.radius, this.settings.threshold)
        // Bound only the halo energy; a hot specular pixel must not become a new lamp.
        this.bloomNode.highPassFn = Fn(({ input, threshold, smoothWidth }) => {
            const y = luminance(input.rgb)
            const extracted = y.smoothstep(threshold, threshold.add(smoothWidth))
            return vec4(input.rgb.div(y.div(4).add(1)).mul(extracted), 1)
        })
        this.bloomNode.updateBeforeType = NodeUpdateType.RENDER
        this.bloomNode.setResolutionScale(bloomScale(this.quality, this.budgetMode))
    }
    // Light beams: one reduced-resolution pass, then a depth-aware (joint bilateral) upsampling so column
    // silhouettes keep their edge. Same blend as the former per-material fog: base * (1 - a/4) + radiance * a.
    createVolume() {
        if (this.volumeSource === this.volume.node) return
        this.volumeTexture?.dispose()
        this.volumeSource = this.volume.node
        this.volumeTexture = rtt(this.volume.createScreenNode(this.depth, this.camera))
        this.volumeTexture.setResolutionScale(VOLUME_SCALE[this.quality] ?? .5)
        const low = this.volumeTexture
        this.volumeLit = Fn(() => {
            const size = vec2(textureSize(low))
            const pixel = screenUV.mul(size).sub(.5)
            const base = pixel.floor(), f = pixel.fract()
            const distance = viewPosition(screenUV, this.depth, this.camera).length()
            const sum = float(0).toVar(), total = float(0).toVar()
            for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
                const texel = low.load(ivec2(base.add(vec2(x, y)).clamp(vec2(0), size.sub(1))))
                const bilinear = (x ? f.x : f.x.oneMinus()).mul(y ? f.y : f.y.oneMinus())
                const similar = texel.g.sub(distance).abs().div(distance.mul(.05).add(.05)).negate().exp()
                const weight = bilinear.mul(similar.add(.001))
                sum.addAssign(texel.r.mul(weight)); total.addAssign(weight)
            }
            // The direct reference keeps the low-resolution pass in this graph (its clones only read it).
            const amount = sum.div(total.max(1e-6)).add(low.r.mul(0))
            return vec4(this.color.rgb.mul(amount.mul(.25).oneMinus()).add(this.volume.radiance.mul(amount)), this.color.a)
        })()
    }
    setGraph(withBloom) {
        const volume = this.volumeActive()
        if (volume) this.createVolume()
        const lit = volume ? this.volumeLit : this.color
        if (withBloom && this.bloomInput !== lit) this.createBloom(lit)
        const base = withBloom ? lit.rgb.add(this.bloomNode.rgb) : lit.rgb
        const rgb = this.flareNode && this.flare.settings.enabled && this.flare.settings.intensity > 0 ? base.add(this.flareNode) : base
        // Mild saturation reduction and tonal balance, preserving zero and dark detail.
        const y = luminance(rgb)
        const balanced = rgb.mul(mix(vec3(0.99, 1.005, 1.015), vec3(1.015, 1.005, 0.985), y.smoothstep(0.03, 0.6)))
        const graded = mix(vec3(luminance(balanced)), balanced, 0.96)
        this.pipeline.outputNode = vec4(mix(rgb, graded, this.gradeStrength), this.color.a)
        this.pipeline.needsUpdate = true
        this.bloomInGraph = withBloom
        this.volumeInGraph = volume
    }
    render(camera) {
        this.flare?.update(camera)
        const volume = this.volumeActive()
        const active = volume || (this.flare?.settings.enabled && this.flare.settings.intensity > 0) || this.bloomActive() || (this.settings.grade && this.settings.gradeStrength > 0)
        if (!active) { this.renderer.render(this.scene, camera); return }
        if (!this.pipeline) this.initialize(camera)
        // The volume pass appears/disappears with the setting and is rebuilt with a new shadow source.
        if (volume !== this.volumeInGraph || volume && this.volumeSource !== this.volume.node) this.setGraph(this.bloomInGraph)
        this.scenePass.camera = camera
        camera.updateMatrixWorld()
        this.camera.projectionInverse.value.copy(camera.projectionMatrixInverse)
        this.camera.cameraWorld.value.copy(camera.matrixWorld)
        this.camera.near.value = camera.near; this.camera.far.value = camera.far
        this.renderRevision = (this.renderRevision || 0) + 1
        const { toneMapping, outputColorSpace } = this.renderer
        try { this.pipeline.render() }
        finally {
            // Also restore color state if shader compilation fails.
            this.renderer.toneMapping = toneMapping
            this.renderer.outputColorSpace = outputColorSpace
        }
    }
    diagnostics() {
        return { ...this.settings, bloom: this.bloomActive(), bloomRequested: this.settings.bloom, bloomAllowed: this.bloomAllowed, flare: this.flare?.diagnostics() || null, ready: !!this.pipeline, quality: this.quality, bloomResolutionScale: bloomScale(this.quality, this.budgetMode),
            method: 'HDR scene + threshold bloom + mild linear grade; single AgX/sRGB output',
            reference: '6.4 | bloom 0.16 / radius 0.25 / threshold 1.5 / grade 1', bloomLuminanceLimit: 4,
            extraFullscreenPasses: this.bloomActive() ? 13 : (this.settings.grade && this.settings.gradeStrength > 0) || (this.flare?.settings.enabled && this.flare.settings.intensity > 0) ? 1 : 0 }
    }
    dispose() { this.bloomNode?.dispose(); this.volumeTexture?.dispose(); this.scenePass?.dispose(); this.pipeline?.dispose() }
}
