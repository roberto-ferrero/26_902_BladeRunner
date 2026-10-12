import { Matrix4, Ray, Raycaster, Vector2 } from 'three'
import './vk-switch.css'

// The visor as a switch. Hover: hand cursor and a hint in the bottom band.
// Off: cards leave to the right, the visor powers down and closes, and 1 s later the camera pans to p2.
// On: the camera returns to p1 and, shortly before arriving, the visor opens and brings the cards back.
export const VK_SWITCH = Object.freeze({ onView: 'p1', offView: 'p2', cameraDelay: 1, openAt: .75, pickInterval: .15,
    off: 'Switch off Voight-Kampff device', on: 'Switch on Voight-Kampff device' })

export default class TyrellVKSwitch {
    constructor(project, settings = VK_SWITCH) {
        this.project = project
        this.settings = settings
        this.raycaster = new Raycaster()
        this.pointer = new Vector2()
        this.localRay = new Ray()
        this.inverse = new Matrix4()
        // Each part's own box, not its triangles: the open visor is mostly thin rods and plates.
        this.parts = []
        project.vk.root.traverse(object => {
            if (!object.isMesh) return
            if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
            this.parts.push(object)
        })
        this.inside = false
        this.pickAge = Infinity
        this.hover = false
        this.sequence = null
        this.hint = document.createElement('p')
        this.hint.className = 'tyrell-vk-hint'
        this.hint.setAttribute('aria-live', 'polite')
        document.body.append(this.hint)
        this.abort = new AbortController()
        const signal = this.abort.signal
        window.addEventListener('pointermove', event => this.move(event), { signal })
        document.documentElement.addEventListener('pointerleave', () => { this.inside = false; this.pickAge = Infinity }, { signal })
        window.addEventListener('click', event => this.click(event), { signal })
    }
    move(event) {
        const rect = this.project.renderer.domElement.getBoundingClientRect()
        this.inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
        this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
        this.pickAge = Infinity
    }
    // 'off' or 'on' when the visor can be switched now; null while anything is moving.
    get action() {
        const p = this.project, vk = p.vk
        if (!vk || !p.revealed || this.sequence || p.navigation?.enabled || p.developmentControls || p.colorBenchmark || p.stageCamera.transition) return null
        if (vk.motion.state === 'open' && p.activeCameraStateId === this.settings.onView && p.portfolio?.active) return 'off'
        return vk.motion.state === 'closed' ? 'on' : null
    }
    picked() {
        if (!this.inside) return false
        this.raycaster.setFromCamera(this.pointer, this.project.stageCamera.get_camera())
        return this.parts.some(part => {
            if (!part.visible) return false
            this.localRay.copy(this.raycaster.ray).applyMatrix4(this.inverse.copy(part.matrixWorld).invert())
            return this.localRay.intersectsBox(part.geometry.boundingBox)
        })
    }
    blocked(event) {
        return event.target?.closest?.('a, button, input, select, textarea, label, dialog, .project_card, .tyrell-gui-panel, .tyrell-gui-toggle, .tyrell-cinema-contact')
    }
    click(event) {
        if (event.button !== 0 || this.blocked(event)) return
        this.move(event)
        const action = this.action
        if (!action || !this.picked()) return
        if (action === 'off') this.switchOff()
        else this.switchOn()
        this.setHover(null)
    }
    switchOff() {
        const p = this.project, sequence = this.sequence = { action: 'off', phase: 'cards', elapsed: 0 }
        p.portfolio.leave(() => {
            if (this.sequence !== sequence) return
            p.vk.arrival.manual()
            p.vk.motion.setOpen(false)
            sequence.phase = 'closing'
        })
    }
    switchOn() {
        const p = this.project
        p.vk.arrival.manual()
        if (p.activeCameraStateId === this.settings.onView) { p.vk.motion.setOpen(true); return }
        this.sequence = { action: 'on', phase: 'travel' }
        p.selectCameraState(this.settings.onView)
    }
    setHover(action) {
        const hover = !!action
        if (hover === this.hover && (!hover || this.hint.dataset.action === action)) return
        this.hover = hover
        document.body.classList.toggle('tyrell-vk-hover', hover)
        if (hover) { this.hint.textContent = this.settings[action]; this.hint.dataset.action = action }
        this.hint.classList.toggle('is-visible', hover)
    }
    update(seconds) {
        const p = this.project, sequence = this.sequence
        if (sequence?.phase === 'closing') {
            sequence.elapsed += Math.max(0, seconds || 0)
            if (sequence.elapsed >= this.settings.cameraDelay) {
                this.sequence = null
                p.selectCameraState(this.settings.offView)
            }
        } else if (sequence?.phase === 'travel') {
            const transition = p.stageCamera.transition
            // Any other camera choice during the travel cancels the switch-on.
            if (p.activeCameraStateId !== this.settings.onView || p.navigation?.enabled || p.developmentControls) this.sequence = null
            else if (!transition || transition.elapsed / transition.duration >= this.settings.openAt) {
                this.sequence = null
                p.vk.motion.setOpen(true)
            }
        }
        const action = this.action
        if (!action) { this.setHover(null); return }
        // The view pans under a still mouse, so re-pick periodically as well as on movement.
        this.pickAge += Math.max(0, seconds || 0)
        if (this.pickAge < this.settings.pickInterval) return
        this.pickAge = 0
        this.setHover(this.picked() ? action : null)
    }
    diagnostics() { return { hover: this.hover, action: this.action, sequence: this.sequence ? { ...this.sequence } : null } }
    dispose() {
        this.abort.abort()
        this.hint.remove()
        document.body.classList.remove('tyrell-vk-hover')
    }
}
