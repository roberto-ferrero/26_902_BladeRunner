import './loader.css'

// Share of the bar per real init step; byte-streamed GLBs fill their own span.
export const LOADER_STAGES = {
    renderer: [0, .04], gpu: [.04, .1], settings: [.1, .12], scene: [.12, .56], pyramid: [.56, .64],
    glassware: [.64, .68], vk: [.68, .76], sky: [.76, .79], build: [.79, .84], warmup: [.84, 1]
}
// Must match the leave animations in loader.css: the full bar shows briefly, texts are
// gone at 1.45 s, black held until 1.95 s (the scene starts moving), clear at 3.45 s.
export const LOADER_REVEAL_MS = 1950
export const LOADER_LEAVE_MS = 3450

const clamp = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export function stageProgress(stage, fraction = 0) {
    const [from, to] = LOADER_STAGES[stage] || [0, 0]
    return from + (to - from) * clamp(fraction)
}

export default class TyrellLoader {
    constructor(fontsHref) {
        this.root = document.createElement('div')
        this.root.className = 'tyrell-loader'
        this.root.innerHTML = `<div class="tyrell-loader-center">
                <h1 class="tyrell-loader-title">ROBERTO FERRERO</h1>
                <p class="tyrell-loader-subtitle">Creative Developer</p>
                <div class="tyrell-loader-track" role="progressbar" aria-label="Carga de la experiencia" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="tyrell-loader-fill"></div></div>
                <p class="tyrell-loader-status" aria-live="polite"></p>
            </div>`
        this.track = this.root.querySelector('.tyrell-loader-track')
        this.fill = this.root.querySelector('.tyrell-loader-fill')
        this.statusText = this.root.querySelector('.tyrell-loader-status')
        if (fontsHref && !document.querySelector(`link[href="${fontsHref}"]`)) {
            const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = fontsHref
            document.head.append(link)
        }
        document.body.appendChild(this.root)
        this.reset()
    }
    reset() {
        this.value = 0
        this.finished = false
        this.root.hidden = false
        this.root.classList.remove('is-leaving', 'is-error')
        this.render('')
    }
    // Never moves backwards: later steps may report coarser fractions.
    stage(stage, text, fraction) {
        if (this.finished) return
        this.value = Math.max(this.value, Math.min(.995, stageProgress(stage, fraction)))
        this.render(text)
    }
    render(text) {
        const percent = Math.round(this.value * 100)
        this.fill.style.width = `${this.value * 100}%`
        this.track.setAttribute('aria-valuenow', String(percent))
        if (text !== undefined) this.statusText.textContent = text ? `${text} · ${percent} %` : ''
    }
    finish() {
        if (this.finished) return
        this.value = 1
        this.render('Listo')
        this.finished = true
        this.root.classList.add('is-leaving')
    }
    fail() { this.root.classList.add('is-error') }
    hide() { this.root.hidden = true }
    dispose() { this.root.remove() }
}
