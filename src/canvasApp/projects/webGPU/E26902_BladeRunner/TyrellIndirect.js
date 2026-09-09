import { DataTexture, EquirectangularReflectionMapping, LightProbe, LinearSRGBColorSpace, RGBAFormat,
    SphericalHarmonics3, UnsignedByteType, Vector3 } from 'three'

// Controlled artistic bounce field, not a capture or baked GI solution.
export default class TyrellIndirect {
    constructor(scene) {
        this.scene = scene
        this.originalEnvironment = scene.environment
        this.originalIntensity = scene.environmentIntensity
        this.mode = 'reference'
        const width = 64, height = 32, pixels = new Uint8Array(width * height * 4)
        const sh = new SphericalHarmonics3(), basis = [], direction = new Vector3()
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const theta = Math.PI * (y + .5) / height, phi = 2 * Math.PI * ((x + .5) / width - .5)
            direction.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta))
            const window = Math.pow(Math.max(0, -direction.z), 4)
            const upper = Math.max(0, direction.y)
            const radiance = [.065 + .11 * window + .025 * upper, .055 + .065 * window + .018 * upper, .04 + .025 * window + .012 * upper]
            const offset = (y * width + x) * 4
            for (let c = 0; c < 3; c++) pixels[offset + c] = Math.round(radiance[c] * 255)
            pixels[offset + 3] = 255
            SphericalHarmonics3.getBasisAt(direction, basis)
            const weight = Math.sin(theta) * Math.PI / height * 2 * Math.PI / width
            const value = new Vector3(pixels[offset], pixels[offset + 1], pixels[offset + 2]).multiplyScalar(1 / 255)
            for (let i = 0; i < 9; i++) sh.coefficients[i].addScaledVector(value, basis[i] * weight)
        }
        this.texture = new DataTexture(pixels, width, height, RGBAFormat, UnsignedByteType)
        this.texture.mapping = EquirectangularReflectionMapping
        this.texture.colorSpace = LinearSRGBColorSpace
        this.texture.name = 'Tyrell / campo de rebote experimental'
        this.texture.needsUpdate = true
        this.probe = new LightProbe(sh, 0)
        this.probe.name = 'Tyrell / sonda difusa experimental'
        scene.add(this.probe)
    }
    setMode(mode) {
        if (['reference', 'probe', 'environment'].includes(mode)) this.mode = mode
    }
    apply(lighting, studio) {
        const enabled = !studio && (!lighting.contribution || ['all', 'hemisphere'].includes(lighting.contribution))
        this.probe.intensity = enabled && this.mode === 'probe' ? .35 : 0
        this.scene.environment = enabled && this.mode === 'environment' ? this.texture : this.originalEnvironment
        this.scene.environmentIntensity = enabled && this.mode === 'environment' ? .35 : this.originalIntensity
        // Replace part of the broad ambient instead of simply stacking more light.
        if (enabled && this.mode !== 'reference') lighting.fill.intensity *= .92
    }
    diagnostics() { return { mode: this.mode, probeIntensity: this.probe.intensity,
        environmentActive: this.scene.environment === this.texture, environmentIntensity: this.scene.environmentIntensity,
        source: 'artistic 64x32 linear radiance field; no scene capture, occlusion or baked GI', ambientRetention: .92 } }
    dispose() {
        this.scene.environment = this.originalEnvironment
        this.scene.environmentIntensity = this.originalIntensity
        this.probe.removeFromParent(); this.probe.dispose(); this.texture.dispose()
    }
}
