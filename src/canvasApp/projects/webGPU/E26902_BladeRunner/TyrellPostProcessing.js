import { RenderPipeline, NodeUpdateType } from 'three/webgpu'
import { Fn, pass, uniform, vec3, vec4, mix, luminance } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'

// Final-camera processing only: probes and planar mirrors retain linear scene radiance.
export default class TyrellPostProcessing {
    constructor(renderer, scene) {
        this.renderer = renderer
        this.scene = scene
        this.settings = { bloom: false, grade: false, strength: 0.16, radius: 0.25, threshold: 1.5, gradeStrength: 1 }
        this.gradeStrength = uniform(0)
        this.quality = 'Media'
    }
    configure(values) {
        for (const key of ['bloom', 'grade']) if (typeof values[key] === 'boolean') this.settings[key] = values[key]
        for (const [key, min, max] of [['strength', 0, 0.6], ['radius', 0, 1], ['threshold', 0.5, 5], ['gradeStrength', 0, 1]]) {
            if (Number.isFinite(values[key])) this.settings[key] = Math.max(min, Math.min(max, values[key]))
        }
        this.gradeStrength.value = this.settings.grade ? this.settings.gradeStrength : 0
        if (this.bloomNode) {
            for (const key of ['strength', 'radius', 'threshold']) this.bloomNode[key].value = this.settings[key]
            const active = this.settings.bloom && this.settings.strength > 0
            if (active !== this.bloomInGraph) this.setGraph(active)
        }
    }
    setQuality(quality) {
        this.quality = quality
        this.bloomNode?.setResolutionScale(quality === 'Baja' ? 0.25 : 0.5)
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
        this.bloomNode = bloom(this.color, this.settings.strength, this.settings.radius, this.settings.threshold)
        // Bound only the halo energy; a hot specular pixel must not become a new lamp.
        this.bloomNode.highPassFn = Fn(({ input, threshold, smoothWidth }) => {
            const y = luminance(input.rgb)
            const extracted = y.smoothstep(threshold, threshold.add(smoothWidth))
            return vec4(input.rgb.div(y.div(4).add(1)).mul(extracted), 1)
        })
        this.bloomNode.updateBeforeType = NodeUpdateType.RENDER
        this.pipeline = new RenderPipeline(this.renderer)
        this.setQuality(this.quality)
        this.setGraph(this.settings.bloom && this.settings.strength > 0)
    }
    setGraph(withBloom) {
        const rgb = withBloom ? this.color.rgb.add(this.bloomNode.rgb) : this.color.rgb
        // Mild saturation reduction and tonal balance, preserving zero and dark detail.
        const y = luminance(rgb)
        const balanced = rgb.mul(mix(vec3(0.99, 1.005, 1.015), vec3(1.015, 1.005, 0.985), y.smoothstep(0.03, 0.6)))
        const graded = mix(vec3(luminance(balanced)), balanced, 0.96)
        this.pipeline.outputNode = vec4(mix(rgb, graded, this.gradeStrength), this.color.a)
        this.pipeline.needsUpdate = true
        this.bloomInGraph = withBloom
    }
    render(camera) {
        const active = (this.settings.bloom && this.settings.strength > 0) || (this.settings.grade && this.settings.gradeStrength > 0)
        if (!active) { this.renderer.render(this.scene, camera); return }
        if (!this.pipeline) this.initialize(camera)
        this.scenePass.camera = camera
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
        return { ...this.settings, ready: !!this.pipeline, quality: this.quality, bloomResolutionScale: this.quality === 'Baja' ? 0.25 : 0.5,
            method: 'HDR scene + threshold bloom + mild linear grade; single AgX/sRGB output',
            reference: '6.4 | bloom 0.16 / radius 0.25 / threshold 1.5 / grade 1', bloomLuminanceLimit: 4,
            extraFullscreenPasses: this.settings.bloom && this.settings.strength > 0 ? 13 : this.settings.grade && this.settings.gradeStrength > 0 ? 1 : 0 }
    }
    dispose() { this.bloomNode?.dispose(); this.scenePass?.dispose(); this.pipeline?.dispose() }
}
