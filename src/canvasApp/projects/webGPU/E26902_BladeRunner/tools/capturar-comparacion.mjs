// Comparison-frame captures. Serves the production build, drives a real Chrome over the
// DevTools protocol and exercises the viewer's own controls, so the evidence comes from the
// shipped UI and a real WebGPU backend rather than from an offline renderer.
//
//   npm run build
//   node src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/capturar-comparacion.mjs
//
// Options: --window 1280x800, --port 8099, --keep (leave the browser open),
//          --out <carpeta>, --prefix <nombre>, --look on|off,
//          --indirect ninguna|ambiente|mundo|escena, --pantalla (captura del compositor),
//          --paseo (recorre la sala con teclado y ratón reales en vez de capturar las cámaras),
//          --extras (mide el destello del sol y el paneo con el ratón),
//          --eval "<js>" para un experimento puntual sobre la escena antes de capturar.
// The window is visible on purpose: WebGPU needs a real adapter.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { makeWalkthrough } from './lib/paseo.mjs'
import { makeExtras } from './lib/extras.mjs'

const ROOT = 'dist'
const CAMERAS = ['CAM 01', 'CAM 02', 'CAM 04']
const QUALITY = 'Media'
const args = process.argv.slice(2)
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const PORT = Number(option('--port', 8099))
const [WIN_W, WIN_H] = option('--window', '1280x800').split('x').map(Number)
const OUT = option('--out', 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase3')
const PREFIX = option('--prefix', 'fase3')
const LOOK = option('--look', 'on') !== 'off'
const EVAL = option('--eval', null)
const INDIRECT = option('--indirect', null)
const SHOT = args.includes('--pantalla')
const WALK = args.includes('--paseo')
const EXTRAS = args.includes('--extras')

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.map': 'application/json' }

// ---------------------------------------------------------------- static server

function serve() {
    const server = http.createServer((request, response) => {
        const url = decodeURIComponent(request.url.split('?')[0])
        let file = path.join(ROOT, url === '/' ? 'index.html' : url)
        if (!path.resolve(file).startsWith(path.resolve(ROOT))) { response.writeHead(403).end(); return }
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html')
        const stream = fs.createReadStream(file)
        response.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'content-length': fs.statSync(file).size })
        stream.pipe(response)
    })
    return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)))
}

// ---------------------------------------------------------------- chrome + CDP

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`
    ].filter(Boolean)
    for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate
    throw new Error('No se encontró Chrome ni Edge. Define CHROME_PATH.')
}

async function launch(port) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tyrell-cdp-'))
    const browser = spawn(findChrome(), [
        `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--enable-unsafe-webgpu', '--disable-features=CalculateNativeWinOcclusion',
        `--window-size=${WIN_W},${WIN_H}`, '--window-position=0,0',
        'about:blank'
    ], { stdio: 'ignore', detached: false })
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
            return { browser, profile, wsUrl: version.webSocketDebuggerUrl, product: version.Browser }
        } catch { await new Promise(r => setTimeout(r, 200)) }
    }
    throw new Error('Chrome no abrió el puerto de depuración.')
}

class CDP {
    constructor(socket) { this.socket = socket; this.id = 0; this.pending = new Map(); this.sessionId = null; this.pageErrors = []; this.errorCounts = new Map() }
    static async connect(url) {
        const socket = new WebSocket(url)
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
        const cdp = new CDP(socket)
        socket.onmessage = event => {
            const message = JSON.parse(event.data)
            // A page error is the usual reason a wait times out, so it is surfaced immediately
            // instead of being hidden behind a timeout much later.
            if (message.method === 'Runtime.exceptionThrown') {
                const details = message.params.exceptionDetails
                cdp.reportPageError(details.exception?.description || details.text, 'página')
            }
            if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
                cdp.reportPageError(message.params.args.map(a => a.description ?? a.value).join(' '), 'consola')
            }
            const entry = cdp.pending.get(message.id)
            if (!entry) return
            cdp.pending.delete(message.id)
            message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result)
        }
        return cdp
    }
    send(method, params = {}, sessionId = this.sessionId) {
        const id = ++this.id
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject })
            this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
        })
    }
    async evaluate(expression) {
        const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Error en la página')
        return result.result.value
    }
    reportPageError(text, source) {
        const message = String(text ?? '')
        const at = Date.now() - START
        this.pageErrors.push({ at, source, message })
        // Repeats are counted, not printed: a renderer warning can fire every frame.
        const key = `${source}:${firstLine(message)}`
        const seen = (this.errorCounts.get(key) || 0) + 1
        this.errorCounts.set(key, seen)
        if (seen === 1) console.error(`  [${source}] +${(at / 1000).toFixed(1)}s ${firstLine(message)}`)
    }
    summariseErrors() {
        if (!this.pageErrors.length) return
        console.error(`  ${this.pageErrors.length} mensajes de la página:`)
        for (const [key, count] of this.errorCounts) {
            const times = this.pageErrors.filter(e => `${e.source}:${firstLine(e.message)}` === key).map(e => e.at)
            console.error(`    ${count} × ${key.slice(0, 90)}`)
            console.error(`      de +${(Math.min(...times) / 1000).toFixed(1)}s a +${(Math.max(...times) / 1000).toFixed(1)}s`)
        }
    }
    close() { this.socket.close() }
}

const START = Date.now()
const wait = ms => new Promise(r => setTimeout(r, ms))
// Escape-free on purpose: only the first line of a page error is worth printing.
const firstLine = text => String(text).split(String.fromCharCode(10))[0]
// The document may still be loading, so a failed evaluation counts as "not yet".
async function until(cdp, expression, timeout, label) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
        try { if (await cdp.evaluate(expression)) return true } catch { /* not ready */ }
        await wait(250)
    }
    const blame = cdp.pageErrors.length ? ` La página había fallado antes: ${firstLine(cdp.pageErrors[0].message)}` : ''
    throw new Error(`Tiempo agotado esperando ${label}.${blame}`)
}

// ---------------------------------------------------------------- page helpers

// The camera select carries indices as values and the quality select carries its labels, so
// both are driven by visible text and the element's own value is left alone.
const SELECT_BY_TEXT = (selector, prefix) => `(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return null
    const option = [...el.options].find(o => o.textContent.trim().startsWith(${JSON.stringify(prefix)}))
    if (!option) return null
    el.value = option.value
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return option.textContent.trim()
})()`

const SET_CHECK = (selector, checked) => `(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return null
    el.checked = ${JSON.stringify(checked)}
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return el.checked
})()`

// Waiting for an image that is already there returns the previous capture, not the next one.
const CLEAR_DIALOG = `document.querySelector('.tyrell-dialog .tyrell-output').replaceChildren()`

const READ_DIALOG_TEXT = `(() => {
    const pre = document.querySelector('.tyrell-dialog pre')
    return pre ? pre.textContent : null
})()`

const READ_DIALOG_IMAGE = `(async () => {
    const img = document.querySelector('.tyrell-dialog img')
    if (!img) return null
    const blob = await (await fetch(img.src)).blob()
    const bitmap = await createImageBitmap(blob)
    const base64 = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
    })
    return { base64, width: bitmap.width, height: bitmap.height, bytes: blob.size }
})()`

// ---------------------------------------------------------------- run

const server = await serve()
const { browser, profile, wsUrl, product } = await launch(9333)
let cdp
const evidence = { generated: new Date().toISOString(), product, window: [WIN_W, WIN_H], quality: QUALITY, look: LOOK, shots: [] }

try {
    const root = await CDP.connect(wsUrl)
    const { targetId } = await root.send('Target.createTarget', { url: `http://127.0.0.1:${PORT}/` })
    const { sessionId } = await root.send('Target.attachToTarget', { targetId, flatten: true })
    cdp = root
    cdp.sessionId = sessionId
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')

    console.log(`${product} · sirviendo ${ROOT} en http://127.0.0.1:${PORT}/ · ventana ${WIN_W} × ${WIN_H}`)
    await until(cdp, `!!document.querySelector('.tyrell-controls select')`, 60000, 'la interfaz del visor')
    await until(cdp, `!document.querySelector('.tyrell-ui footer').hidden`, 180000, 'la carga del escenario')

    const backend = await cdp.evaluate(`document.querySelector('.tyrell-backend').textContent`)
    evidence.backend = backend
    console.log(`Backend declarado por el visor: ${backend}`)
    if (!/WebGPU · /.test(backend)) throw new Error(`El visor no arrancó en WebGPU: "${backend}"`)

    const quality = await cdp.evaluate(SELECT_BY_TEXT('[aria-label="Calidad"]', QUALITY))
    const compare = await cdp.evaluate(SET_CHECK('[data-action="compare"]', true))
    const look = await cdp.evaluate(SET_CHECK('[data-action="look"]', LOOK))
    if (INDIRECT) {
        const chosen = await cdp.evaluate(SELECT_BY_TEXT('[aria-label="Indirecta"]', INDIRECT[0].toUpperCase() + INDIRECT.slice(1)))
        if (!chosen) throw new Error(`El visor no ofrece la indirecta "${INDIRECT}".`)
        evidence.indirect = INDIRECT
        console.log(`Iluminación indirecta: ${chosen}`)
        await wait(1500)
    }
    if (quality !== QUALITY || compare !== true || look !== LOOK) throw new Error(`No se pudieron fijar los controles: calidad="${quality}", comparación=${compare}, look=${look}`)
    console.log(`Look de Blender: ${LOOK ? 'aplicado' : 'desactivado'}`)
    if (EVAL) {
        // Escape hatch for one-off experiments on the live scene; it is recorded in the evidence.
        const result = await cdp.evaluate(`(() => { ${EVAL} })()`)
        evidence.eval = EVAL
        evidence.evalResult = result ?? null
        console.log(`Experimento aplicado: ${EVAL}`)
        if (result !== undefined && result !== null) console.log(`  devuelve: ${JSON.stringify(result)}`)
        await wait(1000)
    }
    await wait(800)

    const buffer = await cdp.evaluate(`(() => {
        const c = document.querySelector('#canvas_app canvas')
        return { width: c.width, height: c.height, cssWidth: Math.round(c.getBoundingClientRect().width), cssHeight: Math.round(c.getBoundingClientRect().height) }
    })()`)
    evidence.drawingBuffer = buffer
    console.log(`Búfer de dibujo en modo comparación: ${buffer.width} × ${buffer.height} (mostrado a ${buffer.cssWidth} × ${buffer.cssHeight})`)
    const frameLocked = await cdp.evaluate(`document.querySelector('[data-action="frame"]').disabled`)
    evidence.frameCheckboxLocked = frameLocked

    // Visit every camera once before measuring: the first camera after load pays for pipeline
    // creation, and without this its figure lands 20 to 35 FPS below a settled reading.
    for (const camera of CAMERAS) {
        await cdp.evaluate(SELECT_BY_TEXT('[aria-label="Cámara"]', camera))
        await wait(1500)
    }
    console.log('Calentamiento completado en las tres cámaras')

    fs.mkdirSync(OUT, { recursive: true })
    if (WALK) {
        // The walk is exercised here and not in --eval on purpose: --eval runs before this
        // warm-up, while the page is still throttled, and measured zero animation frames.
        const walkthrough = makeWalkthrough({
            cdp, wait, out: OUT, prefix: PREFIX,
            selectByText: (selector, text) => cdp.evaluate(SELECT_BY_TEXT(selector, text))
        })
        evidence.paseo = await walkthrough()
        const p = evidence.paseo
        console.log(`Paseo: ${p.paso.speed} m/s andando y ${p.carrera.speed} m/s corriendo, sobre ${p.ajustes.walkSpeed} y ${p.ajustes.runSpeed} declarados`)
        console.log(`  altura de ojo ${p.estado.eyeHeight} m, ${p.estado.obstacles} obstáculos`)
        console.log(`  ratón: bloqueo de puntero ${p.raton.bloqueoDePuntero}, giro ${p.raton.giroEnGrados}°`)
        console.log(`  choque: predicho ${p.colision.prediccion} m, recorrido ${p.colision.recorrido} m, dentro de un obstáculo: ${p.colision.dentroDeUnObstaculo}`)
        console.log(`  redimensionado: ${p.redimensionado.antes.width} × ${p.redimensionado.antes.height} → ${p.redimensionado.a900x600.width} × ${p.redimensionado.a900x600.height}, vuelve: ${p.redimensionado.volvio}`)
        console.log(`  pestaña oculta: activa ${p.pausa.oculta.activa}, ${p.pausa.oculta.fotogramasEnUnSegundo} fotogramas; al volver ${p.pausa.devuelta.fotogramasEnUnSegundo}`)
        console.log(`  regreso: ${p.transicion.recorrida} s de ${p.transicion.declarada} declarados, error de pose ${p.errorDePose.metros} m, lienzo idéntico: ${p.encuadreRestaurado.iguales} (${p.encuadreRestaurado.distintos} píxeles distintos de ${p.encuadreRestaurado.pixeles})`)
    }
    if (EXTRAS) {
        const extras = makeExtras({
            cdp, wait, out: OUT, prefix: PREFIX,
            selectByText: (selector, text) => cdp.evaluate(SELECT_BY_TEXT(selector, text)),
            captureCanvas: async () => {
                // The viewer's own capture, so the sweep is measured on the 1920 x 800 canvas and
                // not on the scaled compositor image.
                //
                // The previous image is cleared first, and that is not tidiness. The capture is
                // asynchronous — the viewer requests it, the next frame encodes it — so with the
                // old image still in the dialog the wait below returns at once and reads it. That
                // is exactly what happened: the whole flare sweep came out shifted by one step,
                // each strength showing the frame of the one before it.
                await cdp.evaluate(CLEAR_DIALOG)
                await cdp.evaluate(`document.querySelector('[data-action="capture"]').click()`)
                await until(cdp, `!!document.querySelector('.tyrell-dialog img')`, 15000, 'la captura')
                const image = await cdp.evaluate(READ_DIALOG_IMAGE)
                await cdp.evaluate(`document.querySelector('.tyrell-dialog').close()`)
                return image
            }
        })
        evidence.extras = await extras()
        const e = evidence.extras
        console.log(`Destello: fuerza ${e.flare.shipped}, ${e.flare.sweep.map(r => `${r.strength}→${r.maxDifference}`).join(' ')}`)
        console.log(`  sin bloom quedan ${e.flare.withoutBloom.differingPixels} píxeles distintos, que es el destello desapareciendo con él`)
        const fallbacks = e.panning.focusDistances.filter(c => !c.measured)
        console.log(`Paneo: foco medido en ${e.panning.focusDistances.length - fallbacks.length} de ${e.panning.focusDistances.length} cámaras`)
        console.log(`  recorrido ${e.panning.travel.metres} m sobre ${e.panning.travel.declaredMaximum} declarados, error de mira ${e.panning.aimErrorDegrees.left}° y ${e.panning.aimErrorDegrees.right}°`)
        console.log(`  en comparación activo: ${e.panning.inComparison.enabled}, pose intacta: ${e.panning.inComparison.poseUntouched}; reposo exacto: ${e.panning.restIsExact}`)
        console.log(`  panel: ${e.panel.fields.length} mandos, visible en presentación: ${e.panel.visibleInPresentation}`)
    }
    for (const camera of (WALK || EXTRAS) ? [] : CAMERAS) {
        const chosen = await cdp.evaluate(SELECT_BY_TEXT('[aria-label="Cámara"]', camera))
        if (!chosen) throw new Error(`El visor no ofrece la cámara ${camera}.`)
        // 60 warm-up frames, then a 30 sample window, then the once-a-second report.
        await until(cdp, `/FPS/.test(document.querySelector('.tyrell-metrics').textContent)`, 30000, `las métricas de ${camera}`)
        await wait(2000)                                   // let the moving window fill further
        const metrics = await cdp.evaluate(`document.querySelector('.tyrell-metrics').textContent`)

        await cdp.evaluate(`document.querySelector('[data-action="report"]').click()`)
        await until(cdp, `!!document.querySelector('.tyrell-dialog pre')`, 10000, 'el diagnóstico')
        const diagnostics = JSON.parse(await cdp.evaluate(READ_DIALOG_TEXT))
        await cdp.evaluate(`document.querySelector('.tyrell-dialog').close()`)

        await cdp.evaluate(CLEAR_DIALOG)
        await cdp.evaluate(`document.querySelector('[data-action="capture"]').click()`)
        await until(cdp, `!!document.querySelector('.tyrell-dialog img')`, 15000, 'la captura')
        const image = await cdp.evaluate(READ_DIALOG_IMAGE)
        await cdp.evaluate(`document.querySelector('.tyrell-dialog').close()`)

        // An independent view of what is actually on screen, taken from the compositor rather
        // than from the page. It is the tie-breaker when the canvas and the encoded capture
        // disagree about which frame they hold.
        const slug = camera.toLowerCase().replace(/[^a-z0-9]+/g, '')
        if (SHOT) {
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
            fs.mkdirSync(OUT, { recursive: true })
            fs.writeFileSync(path.join(OUT, `${PREFIX}-${slug}-pantalla.png`), Buffer.from(shot.data, 'base64'))
        }
        const png = path.join(OUT, `${PREFIX}-${slug}-comparacion.png`)
        const json = path.join(OUT, `${PREFIX}-${slug}-comparacion.json`)
        fs.writeFileSync(png, Buffer.from(image.base64, 'base64'))
        fs.writeFileSync(json, JSON.stringify(diagnostics, null, 2))
        evidence.shots.push({
            camera, label: chosen, png, json, metrics: metrics.trim(),
            imageSize: [image.width, image.height], imageBytes: image.bytes,
            renderMetrics: diagnostics.metrics, compare: diagnostics.compare,
            cameraPose: diagnostics.camera
        })
        console.log(`${camera}: PNG ${image.width} × ${image.height}, ${(image.bytes / 1024).toFixed(0)} kB · ${metrics.trim()}`)
    }

    fs.writeFileSync(path.join(OUT, `${PREFIX}-capturas.json`), JSON.stringify(evidence, null, 2))
    console.log(`\nEvidencia en ${OUT}`)
} finally {
    cdp?.summariseErrors()
    cdp?.close()
    if (!args.includes('--keep')) {
        browser.kill()
        await wait(500)
        try { fs.rmSync(profile, { recursive: true, force: true }) } catch { /* profile still locked */ }
    }
    server.close()
}
