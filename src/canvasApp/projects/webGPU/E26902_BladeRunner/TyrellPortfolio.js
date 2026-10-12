import { Vector3 } from 'three'
import { buildPortfolioCards } from './TyrellPortfolioCards'
import { PORTFOLIO_DEFAULTS, easeOut, portfolioEligible, activeCardIndices, cardBeamOpacity, rectCorners, projectToViewport, dustSamples } from './TyrellPortfolioMath'
import './portfolio-bio.css'
import './portfolio.css'

export default class TyrellPortfolio {
    constructor(project) {
        this.project = project
        this.settings = { ...PORTFOLIO_DEFAULTS }
        this.origin = new Vector3(); this.cards = []; this.bounds = []; this.time = 0
        this.abort = new AbortController(); this.dirty = true; this.viewportDirty = true
        this.root = document.createElement('section'); this.root.className = 'tyrell-portfolio'; this.root.hidden = true
        this.root.setAttribute('aria-label', 'Portfolio de Roberto Ferrero')
        this.canvas = document.createElement('canvas'); this.canvas.className = 'portfolio-beams'; this.canvas.setAttribute('aria-hidden', 'true')
        this.context = this.canvas.getContext('2d')
        this.scroller = document.createElement('div'); this.scroller.className = 'portfolio-scroll'; this.scroller.tabIndex = 0
        this.scroller.setAttribute('aria-label', 'Proyectos y experimentos')
        this.strip = document.createElement('div'); this.strip.className = 'cards bg_dev_'
        this.scroller.append(this.strip); this.root.append(this.canvas, this.scroller); document.body.append(this.root)
        this.observer = new ResizeObserver(() => { this.dirty = true })
        this.viewportObserver = new ResizeObserver(() => { this.viewportDirty = true })
        this.viewportObserver.observe(project.renderer.domElement)
        const signal = this.abort.signal
        window.addEventListener('resize', () => { this.viewportDirty = true }, { signal })
        window.addEventListener('wheel', event => this.wheel(event), { passive: false, signal })
        window.addEventListener('keydown', event => this.key(event), { signal })
        this.createControls()
        this.ready = this.load()
    }
    async load() {
        this.error = null; this.retryButton.hidden = true
        const base = new URL('portfolio/', new URL(this.project.app.pathPrefix, document.baseURI))
        if (!this.fontLink) {
            this.fontLink = document.createElement('link'); this.fontLink.rel = 'stylesheet'
            this.fontLink.href = new URL('fonts.css', base).href; document.head.append(this.fontLink)
        }
        try {
            const files = await Promise.all(['assets/data.json', 'assets/experiments.json', 'bio.html', 'media-sizes.json'].map(async path => {
                const response = await fetch(new URL(path, base), { signal: this.abort.signal })
                if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
                return path.endsWith('.html') ? response.text() : response.json()
            }))
            if (this.abort.signal.aborted) return
            this.cards = buildPortfolioCards(files.slice(0, 2), files[2], base, files[3], () => { this.dirty = true })
            this.cards.forEach((card, i) => {
                card.samples = Array.from({ length: card.main ? 8 : 4 }, (_, j) => dustSamples(73 + i * 977 + j * 131))
                this.strip.append(card.card); this.observer.observe(card.black)
            })
            this.loaded = true; this.dirty = true
            // Decode up front: first paint at VK open must not decode the card images.
            this.strip.querySelectorAll('img').forEach(image => image.decode?.().catch(() => {}))
            this.status.textContent = `${this.cards.length} cards · copia local del portfolio`
        } catch (error) {
            if (error.name === 'AbortError') return
            this.error = error.message; this.status.textContent = `No se pudo cargar el portfolio: ${error.message}`
            this.retryButton.hidden = false
            console.error('[Portfolio]', error)
        }
    }
    createControls() {
        const panel = this.panel = document.createElement('details'); panel.className = 'tyrell-pan'
        panel.innerHTML = '<summary>Portfolio · cards y láser</summary><div class="tyrell-pan-controls"></div>'
        const controls = panel.querySelector('div')
        const enabled = document.createElement('label')
        enabled.innerHTML = '<input type="checkbox" checked aria-label="Activar portfolio"> Activar portfolio'
        enabled.querySelector('input').onchange = event => { this.settings.enabled = event.target.checked }
        controls.append(enabled)
        for (const [key, label, min, max, step] of [
            ['opacity', 'Opacidad del láser', 0, 1, .05], ['density', 'Densidad de polvo del láser', .05, 1, .01],
            ['segmentLength', 'Longitud de segmentos (px)', 1, 16, .5], ['dustSpeed', 'Variación del polvo', 0, 3, .05],
            ['fadeAbove', 'Desvanecimiento superior (px)', 0, 1200, 20], ['fadeBelow', 'Desvanecimiento inferior (px)', 0, 1200, 20],
            ['entryDuration', 'Entrada de cards (s)', .3, 4, .1]
        ]) {
            const labelNode = document.createElement('label'); labelNode.textContent = label
            const input = document.createElement('input'); input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = this.settings[key]
            input.setAttribute('aria-label', label)
            const output = document.createElement('output'); output.value = input.value
            input.oninput = () => { this.settings[key] = Number(input.value); output.value = input.value }
            labelNode.append(input, output); controls.append(labelNode)
        }
        const blendLabel = document.createElement('label'); blendLabel.textContent = 'Mezcla del láser'
        const select = document.createElement('select'); select.setAttribute('aria-label', 'Mezcla del láser')
        select.innerHTML = '<option value="normal">Normal</option><option value="multiply">Multiply</option>'
        select.onchange = () => { this.settings.blend = select.value; this.canvas.style.mixBlendMode = select.value }
        blendLabel.append(select); controls.append(blendLabel)
        this.status = document.createElement('p'); this.status.textContent = 'Cargando contenido del portfolio…'; this.status.setAttribute('role', 'status')
        this.retryButton = document.createElement('button'); this.retryButton.textContent = 'Reintentar portfolio'; this.retryButton.hidden = true
        this.retryButton.onclick = () => { this.ready = this.load() }
        panel.append(this.status, this.retryButton); this.project.ui.technicalPanel.append(panel)
    }
    inputBlocked(event) {
        return event.ctrlKey || event.metaKey || this.project.ui.dialog.open || event.target?.closest?.('.tyrell-gui-panel, .tyrell-gui-toggle, dialog, input, select, textarea, [contenteditable="true"]')
    }
    wheel(event) {
        if (!this.active || this.inputBlocked(event)) return
        // Native scroll over the entire scene, forwarded when the pointer is over a black bar.
        if (this.scroller.contains(event.target)) return
        event.preventDefault()
        this.scroller.scrollTop += event.deltaY * (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? this.rect.height : 1)
    }
    key(event) {
        if (!this.active || this.inputBlocked(event) || event.target?.closest?.('button, a') || event.altKey) return
        const steps = { ArrowDown: 50, ArrowUp: -50, PageDown: this.rect.height * .85, PageUp: -this.rect.height * .85,
            ' ': this.rect.height * (event.shiftKey ? -.85 : .85), Home: -Infinity, End: Infinity }
        if (!(event.key in steps)) return
        event.preventDefault()
        const step = steps[event.key]
        this.scroller.scrollTop = Number.isFinite(step) ? this.scroller.scrollTop + step : step < 0 ? 0 : this.scroller.scrollHeight
    }
    // Cards slide out to the right (and the beams fade) before the visor switches off.
    leave(done) {
        if (!this.active || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return }
        this.leaving = { elapsed: 0, done }
    }
    finishLeave() {
        const leaving = this.leaving
        this.leaving = null
        leaving?.done()
    }
    setActive(active) {
        if (this.active === active) return
        if (!active) this.finishLeave()
        this.active = active
        if (active) {
            this.root.hidden = false; this.root.inert = false; this.elapsed = 0
            this.entryComplete = false
            this.viewportDirty = true; this.dirty = true
            this.scroller.scrollTop = this.savedScroll || 0
            this.cards.forEach(({ card }) => {
                if (card.querySelector('button[aria-expanded="true"]')) card.querySelectorAll('iframe[data-src]').forEach(frame => { frame.src = frame.dataset.src })
            })
        } else {
            this.savedScroll = this.scroller.scrollTop
            this.cards.forEach(({ card }) => card.querySelectorAll('iframe[src]').forEach(frame => frame.removeAttribute('src')))
            if (this.root.contains(document.activeElement)) document.activeElement.blur()
            this.root.inert = true; this.root.hidden = true; this.beamCount = 0
        }
    }
    resize() {
        this.rect = this.project.renderer.domElement.getBoundingClientRect()
        const { left, top, width, height } = this.rect
        Object.assign(this.root.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` })
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.canvas.width = Math.round(width * this.dpr); this.canvas.height = Math.round(height * this.dpr)
        this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        this.viewportDirty = false; this.dirty = true
    }
    measure() {
        this.bounds = this.cards.map(({ black }) => {
            const rect = black.getBoundingClientRect()
            return { top: rect.top - this.rect.top + this.scroller.scrollTop, bottom: rect.bottom - this.rect.top + this.scroller.scrollTop }
        })
        this.dirty = false
    }
    update(seconds) {
        const p = this.project
        const eligible = this.settings.enabled && this.loaded && portfolioEligible({ revealed: p.revealed, cameraState: p.activeCameraStateId,
            transitioning: !!p.stageCamera.transition, exploring: !!p.navigation?.enabled || !!p.developmentControls || !!p.colorBenchmark,
            visorState: p.vk?.motion.state })
        this.setActive(eligible)
        if (!this.active || document.hidden) return
        const start = performance.now()
        if (this.viewportDirty || this.dpr !== Math.min(window.devicePixelRatio || 1, 2)) this.resize()
        const dt = Math.max(0, Math.min(seconds || 0, .1))
        this.elapsed += dt; this.time += dt * this.settings.dustSpeed
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
        // Hold offscreen briefly: beams become visible before the cards enter.
        let progress = reduced ? 1 : easeOut((this.elapsed - .18) / this.settings.entryDuration)
        this.entryComplete = progress === 1 && !this.leaving
        if (this.leaving) {
            this.leaving.elapsed += dt
            const t = Math.min(1, this.leaving.elapsed / this.settings.leaveDuration)
            progress = Math.min(progress, 1 - t * t)
            if (t === 1) queueMicrotask(() => this.finishLeave())
        }
        const shift = (1 - progress) * (this.rect.width + 40)
        this.strip.style.transform = `translate3d(${shift}px,0,0)`
        if (this.dirty) this.measure()
        const indices = activeCardIndices(this.bounds, this.scroller.scrollTop + this.rect.height / 2)
        p.vk.optics.getWorldPosition(this.origin)
        this.origin.project(p.stageCamera.get_camera())
        const projected = projectToViewport(this.origin, this.rect)
        const source = [projected.x - this.rect.left, projected.y - this.rect.top]
        const ctx = this.context
        ctx.clearRect(0, 0, this.rect.width, this.rect.height); this.beamCount = 0
        ctx.globalCompositeOperation = this.settings.blend === 'multiply' ? 'multiply' : 'source-over'
        this.activeIndices = indices; this.originScreen = [projected.x, projected.y]
        if (projected.visible) for (const index of indices) {
            const card = this.cards[index], rect = card.black.getBoundingClientRect()
            const opacity = cardBeamOpacity({ top: rect.top - this.rect.top, bottom: rect.bottom - this.rect.top },
                this.rect.height, this.settings.fadeAbove, this.settings.fadeBelow) * Math.min(1, this.elapsed / .18) * (this.leaving ? progress : 1)
            if (opacity <= 0) continue
            const corners = rectCorners(rect, this.rect.left, this.rect.top)
            if (card.main) corners.push(...rectCorners(card.main.getBoundingClientRect(), this.rect.left, this.rect.top))
            this.drawBeams(source, corners, card, opacity, reduced ? 0 : this.time)
            this.beamCount += corners.length
        }
        ctx.globalAlpha = 1
        this.cpuMs = (this.cpuMs || 0) * .95 + (performance.now() - start) * .05
    }
    drawBeams(source, corners, card, opacity, time) {
        const ctx = this.context, settings = this.settings
        ctx.lineWidth = 1; ctx.strokeStyle = card.project.color
        // Fine alpha steps keep the dust soft, batching strokes instead of drawing each particle separately.
        const levels = 16, buckets = Array.from({ length: levels }, () => [])
        corners.forEach(([x, y], ray) => {
            const dx = x - source[0], dy = y - source[1], distance = Math.hypot(dx, dy)
            if (distance < 1) return
            for (const sample of card.samples[ray]) {
                const wave = .5 + .5 * Math.sin(time * sample.frequency + sample.phase)
                const intensity = Math.max(0, (wave - (1 - settings.density)) / settings.density) ** 2 * sample.strength
                if (intensity < .04) continue
                const u = sample.u, v = Math.min(1, u + settings.segmentLength * sample.length / distance)
                buckets[Math.min(levels - 1, Math.floor(intensity * levels))].push([source[0] + dx * u, source[1] + dy * u, source[0] + dx * v, source[1] + dy * v])
            }
        })
        buckets.forEach((segments, index) => {
            ctx.globalAlpha = settings.opacity * opacity * (index + 1) / levels
            ctx.beginPath()
            for (const [x, y, endX, endY] of segments) { ctx.moveTo(x, y); ctx.lineTo(endX, endY) }
            ctx.stroke()
        })
    }
    diagnostics() {
        return { loaded: !!this.loaded, error: this.error, active: !!this.active, entryComplete: !!this.entryComplete, cards: this.cards.length,
            scrollTop: this.active ? this.scroller.scrollTop : this.savedScroll || 0,
            activeCards: (this.activeIndices || []).map(i => this.cards[i].card.id), beams: this.beamCount || 0,
            originScreen: this.originScreen, cpuMs: +(this.cpuMs || 0).toFixed(3), settings: { ...this.settings } }
    }
    dispose() {
        this.abort.abort(); this.observer.disconnect(); this.viewportObserver.disconnect()
        this.cards.forEach(card => card.dispose()); this.root.remove(); this.panel.remove(); this.fontLink?.remove()
    }
}
