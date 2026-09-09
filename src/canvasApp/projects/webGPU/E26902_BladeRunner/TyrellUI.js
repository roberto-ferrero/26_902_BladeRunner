import './tyrell.css'
import { TYRELL } from './config'

export default class TyrellUI {
    constructor(actions) {
        this.root = document.createElement('section')
        this.root.className = 'tyrell-ui'
        this.root.setAttribute('aria-label', 'Visor Tyrell')
        this.root.innerHTML = `
            <header><div><span class="tyrell-eyebrow">BLADE RUNNER / ESTUDIO 01</span><h1>Oficinas Tyrell</h1></div>
                <span class="tyrell-backend">Iniciando WebGPU…</span></header>
            <div class="tyrell-status" role="status" aria-live="polite"><p>Preparando el motor…</p><progress aria-label="Carga del escenario"></progress><button type="button" hidden>Reintentar</button></div>
            <footer hidden><div class="tyrell-controls">
                <label>Cámara <select aria-label="Cámara"></select></label>
                <label class="tyrell-check tyrell-siempre"><input type="checkbox" data-action="walk"> Recorrido libre</label>
                <label>Calidad <select aria-label="Calidad"><option>Baja</option><option selected>Media</option><option>Alta</option></select></label>
                <label class="tyrell-check"><input type="checkbox" data-action="frame" checked> Encuadre 2,4:1</label>
                <label class="tyrell-check"><input type="checkbox" data-action="compare"> Comparación 1920 × 800</label>
                <label class="tyrell-check"><input type="checkbox" data-action="look" checked> Look AgX de Blender</label>
                <label>Indirecta <select aria-label="Indirecta"><option value="ninguna">Ninguna</option><option value="ambiente">Ambiente</option><option value="mundo">Mundo</option><option value="escena" selected>Escena</option></select></label>
                <label class="tyrell-check"><input type="checkbox" data-effect="bruma" checked> Bruma exterior</label>
                <label class="tyrell-check"><input type="checkbox" data-effect="haces" checked> Haces de luz</label>
                <label class="tyrell-check"><input type="checkbox" data-effect="bloom" checked> Bloom</label>
                <label class="tyrell-check"><input type="checkbox" data-effect="destello" checked> Destello</label>
                <button type="button" data-action="capture">Captura</button>
                <button type="button" data-action="report">Diagnóstico</button>
                <label class="tyrell-check tyrell-siempre"><input type="checkbox" data-action="presentation"> Presentación</label>
            </div>
            <details class="tyrell-panel"><summary>Ajustes de destello y paneo</summary><div class="tyrell-panel-body"></div></details>
            <p class="tyrell-note">Cámaras originales de Blender · Recorrido libre con W A S D, ratón para mirar y Mayús para correr</p>
            <p class="tyrell-metrics">Preparando la primera imagen…</p></footer>`
        document.body.appendChild(this.root)
        this.statusBox = this.root.querySelector('.tyrell-status')
        this.statusText = this.statusBox.querySelector('p')
        this.progress = this.statusBox.querySelector('progress')
        this.retry = this.statusBox.querySelector('button')
        this.cameraSelect = this.root.querySelector('[aria-label="Cámara"]')
        this.cameraSelect.onchange = () => actions.camera(Number(this.cameraSelect.value))
        this.root.querySelector('[aria-label="Calidad"]').onchange = event => actions.quality(event.target.value)
        this.frameCheck = this.root.querySelector('[data-action="frame"]')
        this.frameCheck.onchange = event => actions.frame(event.target.checked)
        this.root.querySelector('[data-action="compare"]').onchange = event => actions.compare(event.target.checked)
        this.root.querySelector('[data-action="look"]').onchange = event => actions.look(event.target.checked)
        this.root.querySelector('[aria-label="Indirecta"]').onchange = event => actions.indirect(event.target.value)
        // Each atmosphere effect switches on its own, so its contribution and cost can be read.
        for (const box of this.root.querySelectorAll('[data-effect]')) {
            box.onchange = event => actions.effect(event.target.dataset.effect, event.target.checked)
        }
        this.walkCheck = this.root.querySelector('[data-action="walk"]')
        this.walkCheck.onchange = event => actions.walk(event.target.checked)
        this.root.querySelector('[data-action="presentation"]').onchange = event => actions.presentation(event.target.checked)
        this.retry.onclick = () => actions.retry()
        this.root.querySelector('[data-action="capture"]').onclick = () => actions.capture()
        this.root.querySelector('[data-action="report"]').onclick = () => actions.report()
        this.buildPanel(actions)
        this.dialog = document.createElement('dialog')
        this.dialog.className = 'tyrell-dialog'
        this.dialog.innerHTML = '<form method="dialog"><button>Cerrar</button></form><div class="tyrell-output"></div><a download>Descargar archivo</a>'
        this.dialog.setAttribute('aria-label', 'Resultado de revisión')
        this.root.appendChild(this.dialog)
    }
    // The tuning panel. Its values are not preferences: they are a look decision that has to end
    // up in config.js, which is why it carries a button that writes the block out rather than
    // leaving the numbers stranded in a session.
    buildPanel(actions) {
        const body = this.root.querySelector('.tyrell-panel-body')
        this.panelFields = new Map()
        for (const group of PANEL) {
            const section = document.createElement('div')
            section.className = 'tyrell-panel-group'
            const title = document.createElement('h2')
            title.textContent = group.title
            section.appendChild(title)
            for (const field of group.fields) {
                section.appendChild(this.buildField(group.action, field, actions))
            }
            body.appendChild(section)
        }
        const copy = document.createElement('button')
        copy.type = 'button'
        copy.dataset.action = 'copy-settings'
        copy.textContent = 'Copiar valores para config.js'
        copy.onclick = () => {
            const text = actions.copySettings()
            this.showOutput(new Blob([text], { type: 'text/plain' }), 'tyrell-ajustes.txt', text)
        }
        body.appendChild(copy)
    }
    buildField(action, field, actions) {
        const label = document.createElement('label')
        label.className = field.type === 'check' ? 'tyrell-check' : 'tyrell-slider'
        const input = document.createElement('input')
        input.dataset.field = `${action}.${field.name}`
        if (field.type === 'check') {
            input.type = 'checkbox'
            input.checked = field.value
            input.onchange = () => actions[action](field.name, input.checked)
            label.append(input, ' ' + field.label)
            this.panelFields.set(input.dataset.field, { input })
            return label
        }
        input.type = 'range'
        input.min = field.min; input.max = field.max; input.step = field.step; input.value = field.value
        const caption = document.createElement('span')
        const readout = document.createElement('b')
        const show = () => { readout.textContent = Number(input.value).toFixed(field.decimals ?? 2) }
        show()
        caption.append(field.label + ' ', readout)
        input.oninput = () => { show(); actions[action](field.name, Number(input.value)) }
        label.append(caption, input)
        this.panelFields.set(input.dataset.field, { input, show })
        return label
    }
    status(text, fraction) {
        this.statusBox.hidden = false
        this.statusText.textContent = text
        this.retry.hidden = true
        if (Number.isFinite(fraction)) { this.progress.max = 1; this.progress.value = fraction }
        else this.progress.removeAttribute('value')
    }
    error(error, renderer = false) {
        this.status(error.message)
        this.progress.hidden = true
        this.retry.hidden = false
        this.retry.textContent = renderer ? 'Recargar página' : 'Reintentar carga'
    }
    setBackend(text) { this.root.querySelector('.tyrell-backend').textContent = text }
    // 1920 x 800 is already 2.4:1, so the letterbox is implied and must not be switched off.
    lockFrame(locked) {
        this.frameCheck.disabled = locked
        if (locked) this.frameCheck.checked = true
        this.frameCheck.closest('label').classList.toggle('tyrell-disabled', locked)
    }
    ready(cameras, activeIndex) {
        this.statusBox.hidden = true
        this.root.querySelector('footer').hidden = false
        this.cameraSelect.replaceChildren(...cameras.map((camera, i) => new Option(camera.userData.name || camera.name, i)))
        this.cameraSelect.value = activeIndex
    }
    // Selecting a camera leaves the walk, so the checkbox has to follow the project, not the click.
    setWalking(enabled) {
        this.walkCheck.checked = enabled
        this.root.classList.toggle('tyrell-andando', enabled)
    }
    metrics(text) { this.root.querySelector('.tyrell-metrics').textContent = text }
    showOutput(blob, filename, text) {
        if (this.outputURL) URL.revokeObjectURL(this.outputURL)
        this.outputURL = URL.createObjectURL(blob)
        const content = this.dialog.querySelector('.tyrell-output')
        content.replaceChildren()
        if (text) {
            const pre = document.createElement('pre')
            pre.textContent = text
            content.appendChild(pre)
        } else {
            const img = document.createElement('img')
            img.src = this.outputURL
            img.alt = 'Captura del escenario Tyrell'
            content.appendChild(img)
        }
        const link = this.dialog.querySelector('a')
        link.href = this.outputURL; link.download = filename
        this.dialog.showModal()
    }
    dispose() { if (this.outputURL) URL.revokeObjectURL(this.outputURL); this.root.remove() }
}

// What the panel offers, and the range of each control. Defaults come from config.js, so the
// panel opens on the shipped values and never invents its own.
//
// The tint is three linear sliders and not a colour picker on purpose: a colour input hands back
// an sRGB hex, and every colour in this project is linear. Converting one into the other quietly
// is exactly the mistake config.js warns about, so the panel does not offer the chance.
const flare = TYRELL.post.flare
const panning = TYRELL.panning
const PANEL = [
    {
        title: 'Destello del sol', action: 'flare',
        fields: [
            { name: 'strength', label: 'Fuerza', min: 0, max: 2, step: 0.01, value: flare.strength },
            { name: 'threshold', label: 'Umbral', min: 0, max: 2, step: 0.01, value: flare.threshold },
            { name: 'ghosts', label: 'Fantasmas', min: 1, max: 12, step: 1, value: flare.ghosts, decimals: 0 },
            { name: 'spacing', label: 'Separación', min: 0, max: 1, step: 0.01, value: flare.spacing },
            { name: 'attenuation', label: 'Atenuación al borde', min: 1, max: 60, step: 1, value: flare.attenuation, decimals: 0 },
            { name: 'tintR', label: 'Tinte R (lineal)', min: 0, max: 1, step: 0.01, value: flare.tint[0] },
            { name: 'tintG', label: 'Tinte G (lineal)', min: 0, max: 1, step: 0.01, value: flare.tint[1] },
            { name: 'tintB', label: 'Tinte B (lineal)', min: 0, max: 1, step: 0.01, value: flare.tint[2] }
        ]
    },
    {
        title: 'Paneo con el ratón', action: 'panning',
        fields: [
            { name: 'enabled', label: 'Activo', type: 'check', value: panning.enabled },
            { name: 'x', label: 'Recorrido horizontal (m)', min: 0, max: 0.6, step: 0.005, value: panning.maxOffset.x, decimals: 3 },
            { name: 'y', label: 'Recorrido vertical (m)', min: 0, max: 0.6, step: 0.005, value: panning.maxOffset.y, decimals: 3 },
            { name: 'smoothingSeconds', label: 'Suavizado (s)', min: 0, max: 1.2, step: 0.01, value: panning.smoothingSeconds },
            { name: 'invert', label: 'Invertido', type: 'check', value: panning.invert }
        ]
    }
]
