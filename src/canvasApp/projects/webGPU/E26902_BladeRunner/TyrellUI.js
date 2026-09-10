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
            </div><p class="tyrell-note">Iluminación en calibración · Cámaras originales de Blender · Recorrido libre en una próxima fase</p>
            <p class="tyrell-metrics">Preparando la primera imagen…</p></footer>`
        document.body.appendChild(this.root)
        this.lookPanel = document.createElement('details')
        this.lookPanel.className = 'tyrell-look tyrell-pan'
        this.lookPanel.innerHTML = `<summary>Color y materiales</summary><div class="tyrell-pan-controls">
            <label>Acabado<select aria-label="Acabado"><option value="imported">Importado del GLB</option><option value="tyrell-v1">Tyrell v1 · base revisada</option></select></label>
            <label>Iluminación<select aria-label="Iluminación"><option value="provisional">Provisional · fase 3</option><option value="tyrell-light-v1">Tyrell · luz 4.1</option><option value="tyrell-light-v2">Tyrell · luz 4.2</option><option value="tyrell-light-v3">Tyrell · luz 4.3</option></select></label>
            <label>Aporte de luz<select aria-label="Aporte de luz"><option value="all">Composición completa</option><option value="sun">Sólo sol</option><option value="hemisphere">Sólo ambiente</option><option value="areas">Sólo áreas</option><option value="area-0">Área ventanal</option><option value="area-1">Área frontal</option><option value="area-2">Área izquierda</option><option value="area-3">Área derecha</option></select></label>
            <label>Luz indirecta<select aria-label="Luz indirecta"><option value="reference">Base R01</option><option value="probe">Sonda difusa · ensayo</option><option value="environment">Entorno · ensayo</option></select></label>
            <label>Exposición<input aria-label="Compensación de exposición" type="range" min="-2" max="2" step="0.1"><output></output></label>
            <label><input type="checkbox" aria-label="Luz de estudio"> Luz de estudio</label>
            <label><input type="checkbox" aria-label="Normal de piedra negra" checked> Normal de piedra negra</label>
            <label><input type="checkbox" aria-label="Reflejo del suelo"> Reflejo del suelo</label>
            <label>Acabado del reflejo<select aria-label="Acabado del reflejo"><option value="stone">Piedra pulida · 5.2</option><option value="prototype">Ensayo uniforme · 5.1</option></select></label>
            <label>Resolución del reflejo<select aria-label="Resolución del reflejo"><option value="auto">Según calidad</option><option value="0.25">25 %</option><option value="0.5">50 %</option><option value="1">100 %</option></select></label>
            <label>Actualización del reflejo<select aria-label="Actualización del reflejo"><option value="adaptive">Al cambiar la vista o la escena</option><option value="always">Cada render</option></select></label>
            <label><input type="checkbox" aria-label="Reflejos en metal y vidrio"> Reflejos en metal y vidrio</label>
            <button type="button">Restablecer exposición</button>
            </div><p>La luz de estudio es blanca y sirve para comparar materiales. La exposición de referencia corresponde a 0 EV; las capturas conservan el acabado y la luz seleccionados.</p>`
        this.lightingSelect = this.lookPanel.querySelector('select[aria-label="Iluminación"]')
        this.lightingSelect.onchange = () => actions.lighting(this.lightingSelect.value)
        this.lookPanel.querySelector('[aria-label="Luz indirecta"]').onchange = event => actions.indirect(event.target.value)
        this.lookPanel.querySelector('[aria-label="Reflejo del suelo"]').onchange = event => actions.reflection(event.target.checked)
        this.lookPanel.querySelector('[aria-label="Acabado del reflejo"]').onchange = event => actions.reflectionMode(event.target.value)
        this.lookPanel.querySelector('[aria-label="Resolución del reflejo"]').onchange = event => actions.reflectionResolution(event.target.value)
        this.lookPanel.querySelector('[aria-label="Actualización del reflejo"]').onchange = event => actions.reflectionUpdates(event.target.value)
        this.lookPanel.querySelector('[aria-label="Reflejos en metal y vidrio"]').onchange = event => actions.specularEnvironment(event.target.checked)
        this.lookPanel.querySelector('[aria-label="Aporte de luz"]').onchange = event => actions.contribution(event.target.value)
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
        this.atmospherePanel = document.createElement('details')
        this.atmospherePanel.className = 'tyrell-pan'
        this.atmospherePanel.innerHTML = '<summary>Atmósfera</summary><div class="tyrell-pan-controls"></div><p>Exterior y sala se ajustan por separado. Base sin bruma al recargar; los haces de luz se incorporarán en el siguiente punto.</p>'
        for (const [key, title] of [['exterior', 'Profundidad exterior'], ['interior', 'Bruma interior']]) {
            const label = document.createElement('label'), enabled = document.createElement('input')
            enabled.type = 'checkbox'; enabled.setAttribute('aria-label', title)
            enabled.onchange = () => actions.atmosphere({ [key]: enabled.checked })
            label.append(enabled, document.createTextNode(title))
            const strengthLabel = document.createElement('label'), strength = document.createElement('input'), value = document.createElement('output')
            strength.type = 'range'; strength.min = 0; strength.max = 2; strength.step = 0.05; strength.value = 1
            strength.setAttribute('aria-label', `Intensidad de ${title.toLowerCase()}`)
            value.value = '1.00'
            strength.oninput = () => { value.value = Number(strength.value).toFixed(2); actions.atmosphere({ [`${key}Strength`]: Number(strength.value) }) }
            strengthLabel.append(document.createTextNode(`Intensidad de ${title.toLowerCase()}`), strength, value)
            this.atmospherePanel.querySelector('div').append(label, strengthLabel)
        }
        this.root.querySelector('footer').prepend(this.atmospherePanel)
        const volumeControls = document.createElement('div')
        volumeControls.className = 'tyrell-pan-controls'
        volumeControls.innerHTML = `<label><input type="checkbox" aria-label="Haces de luz"> Haces de luz</label>
            <label><input type="checkbox" checked aria-label="Polvo en suspensión"> Polvo en suspensión</label>
            <label>Intensidad de haces<input type="range" aria-label="Intensidad de haces" min="0" max="2" step="0.05" value="1"><output>1.00</output></label>
            <label>Movimiento del polvo<input type="range" aria-label="Movimiento del polvo" min="0" max="2" step="0.05" value="1"><output>1.00</output></label>`
        volumeControls.querySelector('[aria-label="Haces de luz"]').onchange = e => actions.volume({ enabled: e.target.checked })
        volumeControls.querySelector('[aria-label="Polvo en suspensión"]').onchange = e => actions.volume({ dust: e.target.checked })
        for (const [title, key] of [['Intensidad de haces', 'strength'], ['Movimiento del polvo', 'speed']]) {
            const input = volumeControls.querySelector(`[aria-label="${title}"]`)
            input.oninput = () => { input.nextElementSibling.value = Number(input.value).toFixed(2); actions.volume({ [key]: Number(input.value) }) }
        }
        this.atmospherePanel.append(volumeControls)
        this.atmospherePanel.querySelector('p').textContent = 'Haces solares y polvo volumétrico dentro de la sala. Movimiento 0 congela el polvo para comparar; desactivar Haces vuelve a la profundidad de 6.1.'
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
        const finishPanel = document.createElement('details')
        finishPanel.className = 'tyrell-pan'
        finishPanel.innerHTML = '<summary>Acabado cinematográfico</summary><div class="tyrell-pan-controls"></div><p>Bloom sobre luces intensas y color suave. Desactiva ambos para comparar con la base. La captura conserva estos ajustes.</p>'
        const finishControls = finishPanel.querySelector('div')
        for (const [key, title] of [['bloom', 'Bloom'], ['grade', 'Color cinematográfico']]) {
            const label = document.createElement('label'), input = document.createElement('input')
            input.type = 'checkbox'; input.setAttribute('aria-label', title)
            input.onchange = () => actions.post({ [key]: input.checked })
            label.append(input, document.createTextNode(title)); finishControls.append(label)
        }
        for (const [key, title, value, min, max, step] of [
            ['strength', 'Intensidad del bloom', 0.16, 0, 0.6, 0.01], ['radius', 'Radio del bloom', 0.25, 0, 1, 0.05],
            ['threshold', 'Umbral del bloom', 1.5, 0.5, 5, 0.1], ['gradeStrength', 'Intensidad del color', 1, 0, 1, 0.05]
        ]) {
            const label = document.createElement('label'), input = document.createElement('input'), output = document.createElement('output')
            Object.assign(input, { type: 'range', min, max, step, value }); input.setAttribute('aria-label', title)
            output.value = Number(value).toFixed(2)
            input.oninput = () => { output.value = Number(input.value).toFixed(2); actions.post({ [key]: Number(input.value) }) }
            label.append(document.createTextNode(title), input, output); finishControls.append(label)
        }
        this.root.querySelector('footer').insertBefore(finishPanel, this.lookPanel)
        this.comparisonPanel = document.createElement('details')
        this.comparisonPanel.className = 'tyrell-pan'
        this.comparisonPanel.innerHTML = `<summary>Comparar efectos y coste</summary><div class="tyrell-pan-controls">
            <button type="button" data-measure>Medir configuración</button><button type="button" data-export>Exportar comparación</button><button type="button" data-clear>Borrar mediciones</button></div>
            <p>Activa o desactiva efectos en sus paneles. Medir centra la cámara, descarta 60 fotogramas y recoge 120. Compara con la misma cámara, calidad, resolución y luz. Los FPS pueden estar limitados por la pantalla; no son tiempo GPU.</p>
            <p role="status" data-status>Sin mediciones. Se conservan las últimas 12 durante la sesión.</p><div class="tyrell-comparison-table"></div>`
        this.comparisonPanel.querySelector('[data-measure]').onclick = () => actions.measure()
        this.comparisonPanel.querySelector('[data-export]').onclick = () => actions.exportMeasurements()
        this.comparisonPanel.querySelector('[data-clear]').onclick = () => actions.clearMeasurements()
        this.root.querySelector('footer').append(this.comparisonPanel)
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
        this.guiContainer = document.createElement('div')
        this.guiContainer.id = 'tyrell-gui-panel'
        this.guiContainer.className = 'tyrell-gui-panel'
        const footer = this.root.querySelector('footer')
        this.guiContainer.append(this.root.querySelector('header'), footer)
        this.root.append(this.guiContainer)
        this.root.append(this.root.querySelector('.tyrell-metrics'))
        const toolbar = document.createElement('div')
        toolbar.className = 'tyrell-controls tyrell-gui-toolbar'
        this.closeGUI = document.createElement('button')
        this.closeGUI.type = 'button'
        this.closeGUI.textContent = 'Ocultar GUI'
        this.closeGUI.setAttribute('aria-controls', this.guiContainer.id)
        this.closeGUI.onclick = () => this.setGUIVisible(false)
        toolbar.append(this.closeGUI)
        footer.prepend(toolbar)
        this.openGUI = document.createElement('button')
        this.openGUI.type = 'button'
        this.openGUI.className = 'tyrell-gui-toggle'
        this.openGUI.textContent = 'Abrir GUI'
        this.openGUI.setAttribute('aria-controls', this.guiContainer.id)
        this.openGUI.hidden = true
        this.openGUI.onclick = () => this.setGUIVisible(true)
        this.root.append(this.openGUI)
        this.closeGUI.setAttribute('aria-expanded', 'true')
        this.openGUI.setAttribute('aria-expanded', 'true')
    }
    setGUIVisible(visible) {
        this.guiContainer.hidden = !visible
        this.openGUI.hidden = visible
        this.closeGUI.setAttribute('aria-expanded', String(visible))
        this.openGUI.setAttribute('aria-expanded', String(visible))
        // Keep all controls mounted: values and expanded sections survive hiding.
        ;(visible ? this.closeGUI : this.openGUI).focus({ preventScroll: true })
    }
    comparisonStatus(text) { this.comparisonPanel.querySelector('[data-status]').textContent = text }
    showMeasurements(rows) {
        const container = this.comparisonPanel.querySelector('.tyrell-comparison-table')
        container.replaceChildren()
        if (!rows.length) return
        const table = document.createElement('table'), head = table.createTHead().insertRow()
        for (const label of ['Nº', 'Vista / calidad / píxeles', 'Efectos activos', 'FPS', 'Media ms', 'P95 ms']) {
            const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.append(th)
        }
        const body = table.createTBody()
        for (const row of rows) {
            const tr = body.insertRow()
            for (const value of [row.id, `${row.camera?.name || 'Cámara'} / ${row.quality} / ${row.metrics.resolution.join(' × ')}`, row.effects, row.metrics.fps, row.metrics.frameMeanMs, row.metrics.frameP95Ms]) tr.insertCell().textContent = value
        }
        container.append(table)
    }
    setPanSettings(settings) {
        this.panEnabled.checked = settings.enabled
        for (const [key, { input, refresh }] of this.panInputs) { input.value = settings[key]; refresh() }
    }
    setEffectSettings(settings) {
        for (const [key, label] of Object.entries({ bloom: 'Bloom', grade: 'Color cinematográfico', exterior: 'Profundidad exterior', interior: 'Bruma interior', volume: 'Haces de luz', floorReflection: 'Reflejo del suelo', specularEnvironment: 'Reflejos en metal y vidrio' })) {
            this.root.querySelector(`[aria-label="${label}"]`).checked = settings[key]
        }
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
