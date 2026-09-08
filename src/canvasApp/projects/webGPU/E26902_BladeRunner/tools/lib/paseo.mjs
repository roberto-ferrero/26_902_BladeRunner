// Exercises the free walk of phase 7 on a page that is already animating, with real keyboard and
// mouse input dispatched by the browser rather than events synthesised inside the page.
//
// Both of those matter, and both cost a wrong measurement first:
//
//   - Driving the walk from `--eval` measured zero animation frames in a whole second. That code
//     runs before the warm-up, while the page is still throttled, so nothing moved and the walk
//     looked broken when it was not.
//   - A synthesised `KeyboardEvent` proves the handler works, not that the browser delivers the
//     key. `Input.dispatchKeyEvent` goes through the same path a user's keyboard does, focus
//     rules included, which is precisely what the fourth item of the phase asks about.
//
// Everything measured here comes back as numbers next to the prediction the walker's own
// collision model makes, so the two can disagree in the record instead of in silence.

import fs from 'node:fs'
import path from 'node:path'
import { decodePNG, crop } from './png.mjs'

const KEYS = {
    KeyW: { key: 'w', code: 87 },
    KeyS: { key: 's', code: 83 },
    KeyA: { key: 'a', code: 65 },
    KeyD: { key: 'd', code: 68 },
    ShiftLeft: { key: 'Shift', code: 16, modifier: 8 },
    Escape: { key: 'Escape', code: 27 }
}

const PROJECT = `window.platform.canvasApp.project`

export function makeWalkthrough({ cdp, wait, out, prefix, selectByText }) {
    const shot = async name => {
        const image = await cdp.send('Page.captureScreenshot', { format: 'png' })
        const file = path.join(out, `${prefix}-${name}.png`)
        fs.mkdirSync(out, { recursive: true })
        fs.writeFileSync(file, Buffer.from(image.data, 'base64'))
        return { file, bytes: Buffer.from(image.data, 'base64').length, sha: hash(image.data) }
    }

    /**
     * Clicks a control the way a user does. A dispatched `change` event drives the same handler,
     * but it is not a user gesture, so the browser then refuses pointer lock: the walk would
     * start with the mouse free and the tool would be measuring something the product does not do.
     */
    const click = async selector => {
        const at = await cdp.evaluate(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)})
            if (!el) return null
            const r = el.getBoundingClientRect()
            return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
        })()`)
        if (!at) throw new Error(`No existe el control ${selector}.`)
        for (const type of ['mousePressed', 'mouseReleased']) {
            await cdp.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 })
        }
        await wait(200)
        return cdp.evaluate(`document.querySelector(${JSON.stringify(selector)}).checked`)
    }

    const key = async (code, down) => {
        const spec = KEYS[code]
        await cdp.send('Input.dispatchKeyEvent', {
            type: down ? 'keyDown' : 'keyUp', code, key: spec.key,
            windowsVirtualKeyCode: spec.code, nativeVirtualKeyCode: spec.code,
            modifiers: down && spec.modifier ? spec.modifier : 0
        })
    }

    /** Holds the given keys for a measured wall-clock stretch and reports what moved. */
    const hold = async (codes, seconds) => {
        const from = await cdp.evaluate(`${PROJECT}.navigation.position.toArray()`)
        const started = Date.now()
        for (const code of codes) await key(code, true)
        await wait(seconds * 1000)
        for (const code of codes) await key(code, false)
        const elapsed = (Date.now() - started) / 1000
        await wait(120)
        const to = await cdp.evaluate(`${PROJECT}.navigation.position.toArray()`)
        const travelled = Math.hypot(to[0] - from[0], to[2] - from[2])
        return { from: round(from), to: round(to), seconds: +elapsed.toFixed(2), metres: +travelled.toFixed(3), speed: +(travelled / elapsed).toFixed(3) }
    }

    return async function walkthrough() {
        const report = { generated: new Date().toISOString() }

        // The authored framing, before anything is touched, is the thing the walk has to give back.
        await selectByText('[aria-label="Cámara"]', 'CAM 01')
        await wait(2500)
        report.encuadreAntes = await shot('camara-antes')
        report.poseAntes = await cdp.evaluate(POSE)

        const enabled = await click('[data-action="walk"]')
        if (enabled !== true) throw new Error('La casilla de recorrido libre no se pudo activar.')
        await wait(600)
        report.estado = await cdp.evaluate(`${PROJECT}.navigation.state`)
        report.ajustes = await cdp.evaluate(`${PROJECT}.navigation.settings`)
        report.alturasDeCamara = await cdp.evaluate(CAMERA_HEIGHTS)

        // Speed, against the metres per second the configuration declares.
        report.paso = await hold(['KeyW'], 2.5)
        await wait(300)
        report.carrera = await hold(['KeyW', 'ShiftLeft'], 2.0)
        report.paseoMedio = await shot('paseo-01')

        // Mouse look, through the browser's own pointer lock. Requires a real click first.
        report.raton = await mouseLook()

        // A wall, found by the walker's own collision model and then walked into for real.
        report.colision = await collide()
        report.paseoFinal = await shot('paseo-02')

        // Esc first: while the pointer is locked every click belongs to the canvas, so the
        // checkbox is unreachable until the mouse is released. That is also how a user leaves.
        await key('Escape', true)
        await key('Escape', false)
        await wait(400)
        report.escapeSueltaElRaton = !(await cdp.evaluate(`${PROJECT}.navigation.pointerLocked === true`))
        report.escapeNoSaleDelPaseo = await cdp.evaluate(`${PROJECT}.navigation.walking === true`)

        // Leaving the walk must land back on the authored pose, eased rather than cut.
        const left = await click('[data-action="walk"]')
        if (left !== false) throw new Error('La casilla de recorrido libre no se pudo desactivar.')
        await wait(150)
        // The tween's own clock is read rather than the wall clock: polling starts a few hundred
        // milliseconds after the click, so timing it from here would under-report it.
        report.transicion = { declarada: null, empezada: false, recorrida: null }
        const settle = Date.now()
        while (Date.now() - settle < 8000) {
            const move = await cdp.evaluate(`(() => {
                const t = ${PROJECT}.navigation.transition
                return t ? { elapsed: t.elapsed, seconds: t.seconds } : null
            })()`)
            if (!move) break
            report.transicion.empezada = true
            report.transicion.declarada = move.seconds
            report.transicion.recorrida = +move.elapsed.toFixed(3)
            await wait(60)
        }
        await wait(1500)
        report.poseDespues = await cdp.evaluate(POSE)
        report.encuadreDespues = await shot('camara-despues')
        report.errorDePose = await cdp.evaluate(POSE_ERROR)
        // The whole screenshot always differs: it carries the frames-per-second readout, which
        // is never the same twice. What has to come back identical is the rendered image, so the
        // comparison is made on the canvas alone.
        report.encuadreRestaurado = compareCanvas(report.encuadreAntes.file, report.encuadreDespues.file, await cdp.evaluate(CANVAS_RECT))

        // Presentation hides the review controls without taking the film cameras away.
        report.presentacionActivada = await click('[data-action="presentation"]')
        await wait(600)
        report.presentacion = await cdp.evaluate(VISIBLE_CONTROLS)
        report.presentacionCaptura = await shot('presentacion')
        await click('[data-action="presentation"]')
        await wait(400)
        report.revision = await cdp.evaluate(VISIBLE_CONTROLS)

        report.redimensionado = await resize()
        report.pausa = await hidePage()

        fs.writeFileSync(path.join(out, `${prefix}-paseo.json`), JSON.stringify(report, null, 2))
        return report
    }

    async function mouseLook() {
        const canvas = await cdp.evaluate(CANVAS_CENTRE)
        // Starting the walk already asked for pointer lock; clicking the canvas is how the
        // product takes it back after Esc, so it is worth going through the same door.
        if (!(await cdp.evaluate(`${PROJECT}.navigation.pointerLocked === true`))) {
            for (const type of ['mousePressed', 'mouseReleased']) {
                await cdp.send('Input.dispatchMouseEvent', { type, x: canvas.x, y: canvas.y, button: 'left', clickCount: 1 })
            }
            await wait(500)
        }
        const locked = await cdp.evaluate(`${PROJECT}.navigation.pointerLocked === true`)
        const before = await cdp.evaluate(`[${PROJECT}.navigation.yaw, ${PROJECT}.navigation.pitch]`)
        for (let i = 1; i <= 20; i++) {
            await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: canvas.x + i * 6, y: canvas.y, button: 'none' })
            await wait(16)
        }
        await wait(200)
        const after = await cdp.evaluate(`[${PROJECT}.navigation.yaw, ${PROJECT}.navigation.pitch]`)
        return {
            bloqueoDePuntero: locked,
            giroAntes: +before[0].toFixed(4), giroDespues: +after[0].toFixed(4),
            giroEnGrados: +((after[0] - before[0]) * 180 / Math.PI).toFixed(2),
            cabeceoEnGrados: +((after[1] - before[1]) * 180 / Math.PI).toFixed(2)
        }
    }

    /**
     * The window changes size and the drawing buffer has to follow it. Comparison mode pins the
     * buffer to 1920 × 800 on purpose, so it is switched off first: otherwise this would measure
     * the pin and not the resize.
     */
    async function resize() {
        const pinned = await cdp.evaluate(BUFFER)
        await click('[data-action="compare"]')
        await wait(1500)
        const before = await cdp.evaluate(BUFFER)
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false })
        await wait(1500)
        const after = await cdp.evaluate(BUFFER)
        await cdp.send('Emulation.clearDeviceMetricsOverride', {})
        await wait(1500)
        const restored = await cdp.evaluate(BUFFER)
        await click('[data-action="compare"]')
        await wait(1200)
        return {
            fijadoEnComparacion: pinned, antes: before, a900x600: after, restaurado: restored,
            siguioALaVentana: after.width !== before.width || after.height !== before.height,
            volvio: restored.width === before.width && restored.height === before.height
        }
    }

    /**
     * Hiding the tab has to stop the loop, and showing it again has to restart it. A second tab
     * is opened and focused, which is a real hidden state rather than a dispatched event.
     */
    async function hidePage() {
        const framesIn = async seconds => cdp.evaluate(`(async () => {
            let frames = 0
            const stop = performance.now() + ${seconds * 1000}
            const tick = () => { frames++; if (performance.now() < stop) requestAnimationFrame(tick) }
            requestAnimationFrame(tick)
            await new Promise(r => setTimeout(r, ${seconds * 1000 + 200}))
            return frames
        })()`)
        const visible = { oculta: await cdp.evaluate(`document.hidden`), activa: await cdp.evaluate(`window.platform.canvasApp.state.ACTIVE`) }
        const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, null)
        await cdp.send('Target.activateTarget', { targetId }, null)
        await wait(1200)
        const hidden = {
            oculta: await cdp.evaluate(`document.hidden`),
            activa: await cdp.evaluate(`window.platform.canvasApp.state.ACTIVE`),
            fotogramasEnUnSegundo: await framesIn(1)
        }
        await cdp.send('Target.closeTarget', { targetId }, null)
        await wait(1500)
        const back = {
            oculta: await cdp.evaluate(`document.hidden`),
            activa: await cdp.evaluate(`window.platform.canvasApp.state.ACTIVE`),
            fotogramasEnUnSegundo: await framesIn(1)
        }
        return { visible, oculta: hidden, devuelta: back }
    }

    async function collide() {
        // Ask the walker's own model which way the nearest wall is, then walk into it.
        const aim = await cdp.evaluate(NEAREST_WALL)
        if (!aim) return { medido: false, motivo: 'no se encontró ninguna dirección bloqueada a menos de 12 m' }
        await cdp.evaluate(`${PROJECT}.navigation.yaw = ${aim.yaw}`)
        await wait(120)
        // Twice the predicted distance at running speed, so it cannot simply run out of time.
        const seconds = Math.min(12, (aim.distancia * 2) / 3.2 + 1)
        const walk = await hold(['KeyW', 'ShiftLeft'], seconds)
        const state = await cdp.evaluate(COLLISION_STATE)
        return {
            medido: true, prediccion: +aim.distancia.toFixed(2), recorrido: walk.metres,
            segundos: walk.seconds, ...state
        }
    }
}

/** Are the two screenshots the same picture inside the canvas? */
function compareCanvas(before, after, view) {
    const a = decodePNG(fs.readFileSync(before))
    const b = decodePNG(fs.readFileSync(after))
    if (a.width !== b.width || a.height !== b.height) return { iguales: false, motivo: 'tamaños distintos' }
    // The screenshot is in device pixels and the rectangle in CSS pixels.
    const scale = a.width / view.innerWidth
    const rect = {
        x: Math.round(view.x * scale), y: Math.round(view.y * scale),
        width: Math.round(view.width * scale), height: Math.round(view.height * scale)
    }
    // The overlay sits on top of the canvas and never repeats: the frames-per-second readout
    // changes every second and the walk checkbox draws its own tick. Those rows are not render,
    // so they are excluded and the excluded band is reported rather than hidden.
    const hud = Math.round(view.footerTop * scale) - rect.y
    const left = crop(a, rect), right = crop(b, rect)
    let differing = 0, worst = 0, total = 0
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1
    for (let row = 0; row < left.height; row++) {
        if (row >= hud) break
        for (let column = 0; column < left.width; column++) {
            const i = (row * left.width + column) * 4
            let pixelWorst = 0
            for (let c = 0; c < 3; c++) pixelWorst = Math.max(pixelWorst, Math.abs(left.pixels[i + c] - right.pixels[i + c]))
            total++
            if (pixelWorst > worst) worst = pixelWorst
            if (pixelWorst > 0) {
                differing++
                if (column < minX) minX = column
                if (column > maxX) maxX = column
                if (row < minY) minY = row
                if (row > maxY) maxY = row
            }
        }
    }
    return {
        iguales: differing === 0, pixeles: total, distintos: differing,
        proporcion: +(differing / total).toFixed(6), diferenciaMaxima: +worst.toFixed(4),
        recorte: rect, filasComparadas: Math.min(hud, left.height),
        bandaExcluida: 'la barra de controles, desde y ' + hud + ' del recorte',
        cajaDeDiferencias: differing ? { minX, minY, maxX, maxY } : null
    }
}

// ---------------------------------------------------------------- page expressions

const BUFFER = `(() => {
    const c = document.querySelector('#canvas_app canvas')
    return { width: c.width, height: c.height }
})()`

const CANVAS_RECT = `(() => {
    const r = document.querySelector('#canvas_app canvas').getBoundingClientRect()
    const footer = document.querySelector('.tyrell-ui footer').getBoundingClientRect()
    return {
        x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height),
        footerTop: Math.round(footer.top), innerWidth: window.innerWidth
    }
})()`

const POSE = `(() => {
    const c = window.platform.canvasApp.project.stageCamera.get_camera()
    return { posicion: c.position.toArray().map(v => +v.toFixed(4)), rotacion: c.quaternion.toArray().map(v => +v.toFixed(4)), fov: +c.fov.toFixed(4) }
})()`

const POSE_ERROR = `(() => {
    const p = window.platform.canvasApp.project
    const c = p.stageCamera.get_camera()
    const target = p.cameras[p.activeCameraIndex]
    target.updateWorldMatrix(true, false)
    const t = new c.position.constructor()
    target.getWorldPosition(t)
    return { metros: +c.position.distanceTo(t).toFixed(5), fov: +(c.fov - target.fov).toFixed(5) }
})()`

const CAMERA_HEIGHTS = `(() => {
    const p = window.platform.canvasApp.project
    const v = new (p.stageCamera.get_camera().position.constructor)()
    return p.cameras.map(c => ({ nombre: c.name, altura: +(c.getWorldPosition(v).y - p.navigation.floorY).toFixed(3) }))
})()`

const CANVAS_CENTRE = `(() => {
    const r = document.querySelector('#canvas_app canvas').getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
})()`

// Marches the walker's own blocking test outward in every direction and returns the nearest wall.
const NEAREST_WALL = `(() => {
    const n = window.platform.canvasApp.project.navigation
    let best = null
    for (let i = 0; i < 72; i++) {
        const yaw = i * Math.PI / 36
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
        let d = 0
        while (d < 12) {
            const next = d + 0.05
            if (n.blocked(n.position.x + fx * next, n.position.z + fz * next, n.feet)) break
            d = next
        }
        if (d >= 12) continue
        if (d > 1 && (!best || d < best.distancia)) best = { yaw, distancia: d }
    }
    return best
})()`

const COLLISION_STATE = `(() => {
    const n = window.platform.canvasApp.project.navigation
    const p = n.position
    const dentroDeUnObstaculo = n.blocked(p.x, p.z, n.feet)
    const dentroDeLosLimites = p.x >= n.bounds.min.x && p.x <= n.bounds.max.x && p.z >= n.bounds.min.z && p.z <= n.bounds.max.z
    return {
        dentroDeUnObstaculo, dentroDeLosLimites,
        posicion: p.toArray().map(v => +v.toFixed(3)),
        alturaSobreElSuelo: +(p.y - n.feet).toFixed(3),
        pies: +n.feet.toFixed(3)
    }
})()`

const VISIBLE_CONTROLS = `(() => [...document.querySelectorAll('.tyrell-controls > *')]
    .filter(el => el.getBoundingClientRect().width > 0)
    .map(el => el.textContent.trim().split(String.fromCharCode(10))[0].trim())
    .filter(Boolean))()`

// ---------------------------------------------------------------- small helpers

const round = array => array.map(v => +v.toFixed(3))

// Enough to tell two PNGs apart; this is a comparison, not a checksum for storage.
function hash(base64) {
    let h = 2166136261
    for (let i = 0; i < base64.length; i++) { h ^= base64.charCodeAt(i); h = Math.imul(h, 16777619) }
    return (h >>> 0).toString(16)
}
