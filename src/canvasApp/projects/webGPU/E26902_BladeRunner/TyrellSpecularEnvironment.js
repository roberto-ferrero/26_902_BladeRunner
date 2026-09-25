import { CubeCamera, WebGLCubeRenderTarget, HalfFloatType, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'

// One local room capture, only assigned to metals/glass. Never replaces scene.environment or the floor.
export default class TyrellSpecularEnvironment {
    constructor(scene, root, floor) {
        this.scene = scene; this.floor = floor
        this.enabled = false; this.dirty = true; this.captures = 0
        this.minimumInterval = 0; this.lastCapture = -Infinity
        this.budgetInterval = 0; this.detailMode = false
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
                if (!/Bronze|Bronce|Brass|Laton|^Crystal$/.test(material.name) && !material.userData.tyrellGlass && !material.userData.tyrellLiquid) continue
                if (!this.materials.has(material)) this.materials.set(material, { map: material.envMap, intensity: material.envMapIntensity })
                this.receivers.push(object)
            }
        })
        if ([...this.materials.keys()].some(material => material.userData.tyrellGlass)) {
            this.glassTarget = new WebGLCubeRenderTarget(512, { type: HalfFloatType })
            this.glassTarget.texture.name = 'Tyrell / local crystal reflections'
            this.glassCamera = new CubeCamera(.01, 1100, this.glassTarget)
            const bottle = root.getObjectByName('Licorera')
            if (bottle) bottle.getWorldPosition(this.glassCamera.position)
            else this.glassCamera.position.copy(this.camera.position)
            this.glassCamera.position.y += .21
            scene.add(this.glassCamera)
            // Warm reflection cards, visible exclusively to this glass probe.
            // They shape narrow edge highlights without changing the room lighting.
            this.glassCards = new Group()
            this.glassCards.name = 'Tyrell / glass reflection cards (probe only)'
            this.glassCards.visible = false
            const shapes = [
                { offset: [-.38, .10, -.42], size: [.035, .72], strength: 7 },
                { offset: [.46, .06, .20], size: [.025, .62], strength: 4 },
                { offset: [.05, .40, -.18], size: [.70, .045], strength: 8 }
            ]
            for (const { offset, size, strength } of shapes) {
                const material = new MeshBasicMaterial({ color: '#ffdcaa', toneMapped: false, fog: false })
                material.color.multiplyScalar(strength)
                const card = new Mesh(new PlaneGeometry(...size), material)
                card.position.copy(this.glassCamera.position).add(new Vector3(...offset))
                card.lookAt(this.glassCamera.position)
                this.glassCards.add(card)
            }
            scene.add(this.glassCards)
        }
    }
    invalidate() { this.dirty = true }
    setCaptureInterval(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return
        this.budgetInterval = seconds
        this.setDetailMode(this.detailMode)
    }
    setDetailMode(enabled) {
        this.detailMode = enabled
        const interval = Math.max(this.budgetInterval, enabled ? .5 : 0)
        if (interval === this.minimumInterval) return
        this.minimumInterval = interval
        this.lastCapture = -Infinity
        this.invalidate()
    }
    register(root, materials) {
        for (const material of materials) if (!this.materials.has(material)) {
            this.materials.set(material, { map: material.envMap, intensity: material.envMapIntensity })
        }
        // Hide the whole device during the probe capture: it cannot reflect
        // itself and its moving bellows should not invalidate the room probe.
        this.receivers.push(root)
        this.setEnabled(this.enabled)
    }
    setEnabled(enabled) {
        this.enabled = Boolean(enabled)
        this.lastCapture = -Infinity
        for (const [material, original] of this.materials) {
            material.envMap = this.enabled ? (material.userData.tyrellGlass && this.glassTarget ? this.glassTarget.texture : this.target.texture) : original.map
            material.envMapIntensity = this.enabled ? (material.userData.glassEnvironmentIntensity ?? (material.name === 'Crystal' ? .35 : .6)) : original.intensity
            material.needsUpdate = true
        }
        if (this.enabled) this.invalidate()
    }
    update(renderer, seconds = performance.now() / 1000) {
        if (!this.enabled || !this.dirty) return
        if (seconds - this.lastCapture < this.minimumInterval) return
        const visibility = this.receivers.map(object => [object, object.visible])
        const nodes = [...this.floor.materials.values()].map(material => [material, material.emissiveNode])
        try {
            // Exclude self-reflecting receivers and planar recursion from the six-face room capture.
            for (const [object] of visibility) object.visible = false
            for (const [material] of nodes) { material.emissiveNode = null; material.needsUpdate = true }
            this.camera.update(renderer, this.scene)
            if (this.glassCamera) {
                this.glassCards.visible = true
                this.glassCamera.update(renderer, this.scene)
            }
            this.captures++; this.dirty = false
            this.lastCapture = seconds
        } finally {
            if (this.glassCards) this.glassCards.visible = false
            for (const [object, visible] of visibility) object.visible = visible
            for (const [material, node] of nodes) { material.emissiveNode = node; material.needsUpdate = true }
            this.floor.updates.invalidate()
        }
    }
    diagnostics() {
        return { enabled: this.enabled, dirty: this.dirty, captures: this.captures, size: 128,
            minimumCaptureInterval: this.minimumInterval,
            position: this.camera.position.toArray(), materials: [...this.materials.keys()].map(m => m.name),
            source: 'six-face scene capture; reflective receivers excluded; one probe, no parallax correction',
            metalIntensity: .6, glassIntensity: .35, glasswareProbe: this.glassTarget ? { size: 512, reflectionCards: 3, intensity: 1.15 } : null }
    }
    dispose() {
        this.setEnabled(false)
        this.camera.removeFromParent(); this.target.dispose(); this.materials.clear(); this.receivers.length = 0
        this.glassCamera?.removeFromParent(); this.glassTarget?.dispose()
        this.glassCards?.traverse(object => { object.geometry?.dispose(); object.material?.dispose() })
        this.glassCards?.removeFromParent()
    }
}
