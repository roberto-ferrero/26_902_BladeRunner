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
                <label class="tyrell-check"><input type="checkbox" data-action="frame" checked> Encuadre 2,4:1</label>
                <label class="tyrell-check"><input type="checkbox" data-action="compare"> Comparación 1920 × 800</label>
                <label class="tyrell-check"><input type="checkbox" data-action="look" checked> Look AgX de Blender</label>
                <label>Indirecta <select aria-label="Indirecta"><option value="ninguna">Ninguna</option><option value="ambiente">Ambiente</option><option value="mundo">Mundo</option><option value="escena" selected>Escena</option></select></label>
                <button type="button" data-action="capture">Captura</button>
                <button type="button" data-action="report">Diagnóstico</button>
            </div><p class="tyrell-note">Luz provisional · Cámaras originales de Blender · Recorrido libre en una próxima fase</p>
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
        this.retry.onclick = () => actions.retry()
        this.root.querySelector('[data-action="capture"]').onclick = () => actions.capture()
        this.root.querySelector('[data-action="report"]').onclick = () => actions.report()
        this.dialog = document.createElement('dialog')
        this.dialog.className = 'tyrell-dialog'
        this.dialog.innerHTML = '<form method="dialog"><button>Cerrar</button></form><div class="tyrell-output"></div><a download>Descargar archivo</a>'
        this.dialog.setAttribute('aria-label', 'Resultado de revisión')
        this.root.appendChild(this.dialog)
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
