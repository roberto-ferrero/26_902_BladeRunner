import './intro.css'

// Portfolio opening: initial0 -> initial -> p1, then the existing VK arrival opens the
// visor and brings the cards. Any other camera choice ends the sequence where it is.
export const INTRO = {
    from: 'initial0',
    steps: [{ state: 'initial', duration: 4, easing: 'smoothstep' }, { state: 'p1', duration: 10, easing: 'smoothstep' }],
    // Share of the viewport height for each black band; overridable with ?bands=0.12.
    band: .1,
    name: 'ROBERTO FERRERO', role: 'Creative Developer',
    email: 'hola@robertoferrero.es', phone: '+34 678 55 23 80', phoneHref: 'tel:+34678552380'
}

export function introEnabled(search = location.search) { return new URLSearchParams(search).get('intro') !== '0' }

export default class TyrellIntro {
    constructor(project, settings = INTRO) {
        this.project = project
        this.settings = settings
        this.step = -1
        this.done = false
        const band = Number(new URLSearchParams(location.search).get('bands') ?? NaN)
        document.documentElement.style.setProperty('--tyrell-cinema-band', `${(band >= 0 && band < .4 ? band : settings.band) * 100}vh`)
        document.body.classList.add('tyrell-cinema')
        this.title = document.createElement('div')
        this.title.className = 'tyrell-cinema-title'
        this.title.innerHTML = `<strong></strong><span></span>`
        this.title.querySelector('strong').textContent = settings.name
        this.title.querySelector('span').textContent = ` ${settings.role}`
        this.contact = document.createElement('div')
        this.contact.className = 'tyrell-cinema-contact'
        this.contact.innerHTML = `<a></a><a></a>`
        const [email, phone] = this.contact.querySelectorAll('a')
        email.href = `mailto:${settings.email}`; email.textContent = settings.email
        phone.href = settings.phoneHref; phone.textContent = settings.phone
        document.body.append(this.title, this.contact)
    }
    get initialState() { return this.settings.from }
    start() {
        if (this.step >= 0 || this.done) return
        this.next()
    }
    next() {
        const step = this.settings.steps[++this.step]
        if (!step) { this.done = true; return }
        this.expected = step.state
        this.project.selectCameraState(step.state, { duration: step.duration, easing: step.easing })
        if (step.state === 'p1') this.title.classList.add('is-visible')
    }
    update() {
        const p = this.project
        const vk = p.vk?.motion.state
        if (vk === 'deploying' || vk === 'open') this.contact.classList.add('is-visible')
        if (this.step < 0 || this.done) return
        if (p.activeCameraStateId !== this.expected || p.navigation?.enabled || p.developmentControls) {
            // The visitor took over: show the name anyway and stop driving the camera.
            this.title.classList.add('is-visible'); this.done = true; return
        }
        if (!p.stageCamera.transition) this.next()
    }
    diagnostics() { return { step: this.step, state: this.expected || null, done: this.done } }
    dispose() {
        this.title.remove(); this.contact.remove()
        document.body.classList.remove('tyrell-cinema')
        document.documentElement.style.removeProperty('--tyrell-cinema-band')
    }
}
