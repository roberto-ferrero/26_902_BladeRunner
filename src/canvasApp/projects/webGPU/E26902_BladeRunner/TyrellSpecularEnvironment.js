import { CubeCamera, WebGLCubeRenderTarget, HalfFloatType } from 'three'

// One local room capture, only assigned to metals/glass. Never replaces scene.environment or the floor.
export default class TyrellSpecularEnvironment {
    constructor(scene, root, floor) {
        this.scene = scene; this.floor = floor
        this.enabled = false; this.dirty = true; this.captures = 0
        this.target = new WebGLCubeRenderTarget(128, { type: HalfFloatType })
        this.target.texture.name = 'Tyrell / reflejo local de sala'
        this.camera = new CubeCamera(.05, 1100, this.target)
        this.camera.position.set(0, 1.4, -10.2)
        this.camera.name = 'Tyrell / captura local para metal y vidrio'
        scene.add(this.camera)
        this.materials = new Map(); this.receivers = []
        root.traverse(object => {
            if (!object.isMesh) return
            for (const material of [].concat(object.material)) {
                if (!/Bronze|Bronce|Brass|Laton|^Crystal$/.test(material.name)) continue
                if (!this.materials.has(material)) this.materials.set(material, { map: material.envMap, intensity: material.envMapIntensity })
                this.receivers.push(object)
            }
        })
    }
    invalidate() { this.dirty = true }
    setEnabled(enabled) {
        this.enabled = Boolean(enabled)
        for (const [material, original] of this.materials) {
            material.envMap = this.enabled ? this.target.texture : original.map
            material.envMapIntensity = this.enabled ? (material.name === 'Crystal' ? .35 : .6) : original.intensity
            material.needsUpdate = true
        }
        if (this.enabled) this.invalidate()
    }
    update(renderer) {
        if (!this.enabled || !this.dirty) return
        const visibility = this.receivers.map(object => [object, object.visible])
        const nodes = [...this.floor.materials.values()].map(material => [material, material.emissiveNode])
        try {
            // Exclude self-reflecting receivers and planar recursion from the six-face room capture.
            for (const [object] of visibility) object.visible = false
            for (const [material] of nodes) { material.emissiveNode = null; material.needsUpdate = true }
            this.camera.update(renderer, this.scene)
            this.captures++; this.dirty = false
        } finally {
            for (const [object, visible] of visibility) object.visible = visible
            for (const [material, node] of nodes) { material.emissiveNode = node; material.needsUpdate = true }
            this.floor.updates.invalidate()
        }
    }
    diagnostics() {
        return { enabled: this.enabled, dirty: this.dirty, captures: this.captures, size: 128,
            position: this.camera.position.toArray(), materials: [...this.materials.keys()].map(m => m.name),
            source: 'six-face scene capture; reflective receivers excluded; one probe, no parallax correction',
            metalIntensity: .6, glassIntensity: .35 }
    }
    dispose() {
        this.setEnabled(false)
        this.camera.removeFromParent(); this.target.dispose(); this.materials.clear(); this.receivers.length = 0
    }
}
