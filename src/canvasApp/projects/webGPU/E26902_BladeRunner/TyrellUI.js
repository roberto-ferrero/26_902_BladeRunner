import './tyrell.css'

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
                <label>Calidad <select aria-label="Calidad"><option>Baja</option><option selected>Media</option><option>Alta</option></select></label>
                <label class="tyrell-check"><input type="checkbox" checked> Encuadre 2,4:1</label>
                <button type="button" data-action="capture">Captura 1920 × 800</button>
                <button type="button" data-action="report">Diagnóstico</button>
            </div><p class="tyrell-note">Luz provisional · Cámaras originales de Blender · Recorrido libre en una próxima fase</p>
            <p class="tyrell-metrics">Preparando la primera imagen…</p></footer>`
        document.body.appendChild(this.root)
        this.lookPanel = document.createElement('details')
        this.lookPanel.className = 'tyrell-look tyrell-pan'
        this.lookPanel.innerHTML = `<summary>Color y materiales</summary><div class="tyrell-pan-controls">
            <label>Acabado<select aria-label="Acabado"><option value="imported">Importado del GLB</option><option value="tyrell-v1">Tyrell v1 · en revisión</option></select></label>
            <label>Exposición<input aria-label="Compensación de exposición" type="range" min="-2" max="2" step="0.1"><output></output></label>
            <label><input type="checkbox" aria-label="Luz de estudio"> Luz de estudio</label>
            <label><input type="checkbox" aria-label="Normal de piedra negra" checked> Normal de piedra negra</label>
            <button type="button">Restablecer exposición</button>
            </div><p>La luz de estudio es blanca y sirve para comparar materiales. La exposición de referencia corresponde a 0 EV; las capturas conservan el acabado y la luz seleccionados.</p>`
        this.lookSelect = this.lookPanel.querySelector('select')
        this.lookExposure = this.lookPanel.querySelector('input[type=range]')
        this.lookStudio = this.lookPanel.querySelector('input[type=checkbox]')
        this.lookSelect.onchange = () => actions.look({ profile: this.lookSelect.value })
        this.lookExposure.oninput = () => {
            this.lookPanel.querySelector('output').value = `${Number(this.lookExposure.value).toFixed(1)} EV`
            actions.look({ ev: Number(this.lookExposure.value) })
        }
        this.lookStudio.onchange = () => actions.look({ studio: this.lookStudio.checked })
        this.lookPanel.querySelector('[aria-label="Normal de piedra negra"]').onchange = event => actions.look({ floorNormal: event.target.checked })
        this.lookPanel.querySelector('button').onclick = () => { this.lookExposure.value = 0; this.lookExposure.oninput() }
        this.root.querySelector('footer').prepend(this.lookPanel)
        this.panPanel = document.createElement('details')
        this.panPanel.className = 'tyrell-pan'
        this.panPanel.innerHTML = `<summary>Paneo con el ratón</summary>
            <div class="tyrell-pan-controls">
                <label><input type="checkbox" data-pan="enabled"> Activar paneo</label>
                <button type="button" data-pan-center>Volver al centro</button>
            </div>`
        this.panInputs = new Map()
        const panControls = this.panPanel.querySelector('div')
        for (const [key, title, max, step, unit, min] of [
            ['horizontal', 'Recorrido horizontal', 2, 0.01, 'm', 0],
            ['vertical', 'Recorrido vertical', 2, 0.01, 'm', 0],
            ['smoothness', 'Suavidad', 2, 0.05, 's', 0],
            ['targetDistance', 'Distancia al punto de mirada', 100, 1, 'm', 1]
        ]) {
            const label = document.createElement('label')
            const input = document.createElement('input'), output = document.createElement('output')
            input.type = 'range'; input.min = min; input.max = max; input.step = step
            input.setAttribute('aria-label', title)
            label.append(document.createTextNode(title), input, output)
            const refresh = () => { output.value = `${Number(input.value).toFixed(key === 'targetDistance' ? 0 : 2)} ${unit}` }
            input.oninput = () => { refresh(); actions.pan({ [key]: Number(input.value) }) }
            this.panInputs.set(key, { input, refresh }); panControls.append(label)
        }
        this.panEnabled = this.panPanel.querySelector('[data-pan="enabled"]')
        this.panEnabled.onchange = () => actions.pan({ enabled: this.panEnabled.checked })
        this.panPanel.querySelector('[data-pan-center]').onclick = () => actions.center()
        const hint = document.createElement('p')
        hint.textContent = 'Mayor suavidad: respuesta más lenta. Recorrido máximo desde el centro en cada sentido. La mirada permanece fija; las capturas usan la cámara de referencia.'
        this.panPanel.append(hint)
        this.root.querySelector('footer').prepend(this.panPanel)
        this.statusBox = this.root.querySelector('.tyrell-status')
        this.statusText = this.statusBox.querySelector('p')
        this.progress = this.statusBox.querySelector('progress')
        this.retry = this.statusBox.querySelector('button')
        this.cameraSelect = this.root.querySelector('[aria-label="Cámara"]')
        this.cameraSelect.onchange = () => actions.camera(Number(this.cameraSelect.value))
        this.root.querySelector('[aria-label="Calidad"]').onchange = event => actions.quality(event.target.value)
        this.root.querySelector('.tyrell-controls input').onchange = event => actions.frame(event.target.checked)
        this.retry.onclick = () => actions.retry()
        this.root.querySelector('[data-action="capture"]').onclick = () => actions.capture()
        this.root.querySelector('[data-action="report"]').onclick = () => actions.report()
        this.dialog = document.createElement('dialog')
        this.dialog.className = 'tyrell-dialog'
        this.dialog.innerHTML = '<form method="dialog"><button>Cerrar</button></form><div class="tyrell-output"></div><a download>Descargar archivo</a>'
        this.dialog.setAttribute('aria-label', 'Resultado de revisión')
        this.root.appendChild(this.dialog)
    }
    setPanSettings(settings) {
        this.panEnabled.checked = settings.enabled
        for (const [key, { input, refresh }] of this.panInputs) { input.value = settings[key]; refresh() }
    }
    setLookSettings({ profile, ev, studio }) {
        this.lookSelect.value = profile; this.lookExposure.value = ev; this.lookStudio.checked = studio
        this.lookPanel.querySelector('output').value = `${ev.toFixed(1)} EV`
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
    ready(cameras, activeIndex) {
        this.statusBox.hidden = true
        this.root.querySelector('footer').hidden = false
        this.cameraSelect.replaceChildren(...cameras.map((camera, i) => new Option(camera.userData.name || camera.name, i)))
        this.cameraSelect.value = activeIndex
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
