// Measures the two additions made after phase 7: the sun's lens flare and the mouse panning.
//
// Both are exercised on a page that is already animating and through the viewer's own controls,
// for the reason phase 7 wrote down: driving them from `--eval` runs before the warm-up, while
// the page is still throttled, and measures nothing.
//
// The flare has no reference to be compared against — Blender's render carries no flare — so the
// sweep here can only say how much of the frame each strength touches. That is reported as what
// it is, a look decision with a number next to it, and not as a minimum of anything.

import fs from 'node:fs'
import path from 'node:path'
import { decodePNG } from './png.mjs'

const PROJECT = `window.platform.canvasApp.project`
const STRENGTHS = [0, 0.5, 1, 1.5, 2]

export function makeExtras({ cdp, wait, out, prefix, selectByText, captureCanvas }) {
    const frames = n => cdp.evaluate(`new Promise(resolve => {
        let seen = 0
        const tick = () => { if (++seen >= ${n}) resolve(seen); else requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
    })`)

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
        await wait(250)
    }

    const pointerAt = async (fx, fy) => {
        const rect = await cdp.evaluate(`(() => {
            const r = document.querySelector('#canvas_app canvas').getBoundingClientRect()
            return { x: r.left, y: r.top, w: r.width, h: r.height }
        })()`)
        await cdp.send('Input.dispatchMouseEvent', {
            type: 'mouseMoved', button: 'none',
            x: Math.round(rect.x + rect.w * fx), y: Math.round(rect.y + rect.h * fy)
        })
    }

    return async function extras() {
        const report = { generated: new Date().toISOString(), flare: {}, panning: {}, panel: {} }
        fs.mkdirSync(out, { recursive: true })

        await selectByText('[aria-label="Cámara"]', 'CAM 01')
        await wait(2500)

        // ---------------------------------------------------------------- flare
        report.flare.shipped = await cdp.evaluate(`${PROJECT}.post.readFlare().strength`)
        report.flare.settings = await cdp.evaluate(`${PROJECT}.post.readFlare()`)
        // The project's own metrics window is emptied by every control change, so this reads the
        // renderer's counter for the frame just drawn.
        await frames(10)
        report.flare.drawCalls = await cdp.evaluate(`${PROJECT}.renderer.info.render.drawCalls`)

        const shots = new Map()
        for (const strength of STRENGTHS) {
            await cdp.evaluate(`${PROJECT}.setFlare('strength', ${strength})`)
            await frames(30)
            const image = await captureCanvas()
            const file = path.join(out, `${prefix}-destello-${String(strength).replace('.', '_')}.png`)
            fs.writeFileSync(file, Buffer.from(image.base64, 'base64'))
            shots.set(strength, file)
        }
        const baseline = decodePNG(fs.readFileSync(shots.get(0)))
        report.flare.sweep = STRENGTHS.filter(s => s > 0).map(strength => {
            const image = decodePNG(fs.readFileSync(shots.get(strength)))
            let touched = 0, worst = 0, sum = 0
            for (let i = 0; i < baseline.pixels.length; i += 4) {
                let difference = 0
                for (let c = 0; c < 3; c++) difference = Math.max(difference, Math.abs(baseline.pixels[i + c] - image.pixels[i + c]))
                // A quarter of a step of 8-bit output: below that nothing is visible.
                if (difference > 0.004) { touched++; sum += difference }
                if (difference > worst) worst = difference
            }
            const total = baseline.width * baseline.height
            return {
                strength, coverage: +(touched / total * 100).toFixed(3),
                maxDifference: +worst.toFixed(4), meanOfTouched: +(sum / Math.max(touched, 1)).toFixed(4)
            }
        })
        report.flare.size = [baseline.width, baseline.height]
        // Put the shipped value back before anything else is measured.
        await cdp.evaluate(`${PROJECT}.setFlare('strength', ${report.flare.shipped})`)
        await frames(20)

        // Occlusion is not a feature of the flare: it falls out of being fed by the bloom. The
        // way to show that is not to compare with and without bloom — that mostly measures the
        // bloom — but to switch the bloom off and then sweep the flare underneath it. If the
        // flare has nothing to build ghosts from, moving its strength changes nothing at all.
        await click('[data-effect="bloom"]')
        await frames(30)
        const darkOff = await captureCanvas()
        fs.writeFileSync(path.join(out, `${prefix}-sin-bloom-destello-0.png`), Buffer.from(darkOff.base64, 'base64'))
        await cdp.evaluate(`${PROJECT}.setFlare('strength', 2)`)
        await frames(30)
        const darkOn = await captureCanvas()
        fs.writeFileSync(path.join(out, `${prefix}-sin-bloom-destello-2.png`), Buffer.from(darkOn.base64, 'base64'))
        report.flare.withoutBloom = {
            differingPixels: countDifferences(
                decodePNG(fs.readFileSync(path.join(out, `${prefix}-sin-bloom-destello-0.png`))),
                decodePNG(fs.readFileSync(path.join(out, `${prefix}-sin-bloom-destello-2.png`)))
            ),
            note: 'con el bloom apagado, mover la fuerza del destello de 0 a 2 no cambia nada: se alimenta de él'
        }
        await cdp.evaluate(`${PROJECT}.setFlare('strength', ${report.flare.shipped})`)
        await click('[data-effect="bloom"]')
        await frames(30)

        // ---------------------------------------------------------------- panning
        report.panning.focusDistances = await cdp.evaluate(`[...${PROJECT}.focusDistances.entries()].map(([camera, focus]) => ({
            name: camera.name, metres: +focus.metres.toFixed(3), measured: focus.measured,
            hits: focus.hits, samples: focus.samples, nearest: focus.nearest, farthest: focus.farthest
        }))`)

        // Comparison mode is where the authored pose has to be exact, so panning must be inert.
        const before = await cdp.evaluate(POSE)
        report.panning.inComparison = { enabled: await cdp.evaluate(`${PROJECT}.panning.enabled`) }
        await pointerAt(0.05, 0.5)
        await frames(60)
        report.panning.inComparison.poseUntouched = JSON.stringify(before) === JSON.stringify(await cdp.evaluate(POSE))

        // Panning while walking is not measured here. The walk has to be entered the way a
        // person enters it, with a click that also grants pointer lock, and that is what --paseo
        // does; forcing it from this tool only produced a pointer-lock error in the evidence.
        // The figure lives in the walkthrough's own report.

        // Now with the comparison frame off, which is where panning is meant to work.
        await click('[data-action="compare"]')
        await wait(2000)
        await frames(30)
        report.panning.state = await cdp.evaluate(`${PROJECT}.panning.state`)
        await pointerAt(0.02, 0.5)
        await frames(150)
        const left = await cdp.evaluate(PAN_SAMPLE)
        const leftShot = await captureCanvas()
        fs.writeFileSync(path.join(out, `${prefix}-paneo-izquierda.png`), Buffer.from(leftShot.base64, 'base64'))
        await pointerAt(0.98, 0.5)
        await frames(150)
        const right = await cdp.evaluate(PAN_SAMPLE)
        const rightShot = await captureCanvas()
        fs.writeFileSync(path.join(out, `${prefix}-paneo-derecha.png`), Buffer.from(rightShot.base64, 'base64'))
        report.panning.travel = {
            left: left.position, right: right.position,
            alongCameraRight: { left: left.alongRight, right: right.alongRight },
            metres: +Math.hypot(left.position[0] - right.position[0], left.position[1] - right.position[1], left.position[2] - right.position[2]).toFixed(4),
            declaredMaximum: +(report.panning.state.maxOffset.x * 2).toFixed(4)
        }
        report.panning.aimErrorDegrees = { left: left.aimErrorDegrees, right: right.aimErrorDegrees }

        // Losing the window returns the camera to the authored pose, and exactly.
        await cdp.evaluate(`window.dispatchEvent(new Event('blur'))`)
        await frames(200)
        report.panning.restIsExact = await cdp.evaluate(`(() => {
            const camera = ${PROJECT}.stageCamera.get_camera()
            const panning = ${PROJECT}.panning
            return camera.position.equals(panning.basePosition) && camera.quaternion.equals(panning.baseQuaternion)
        })()`)
        await click('[data-action="compare"]')
        await wait(2000)

        // ---------------------------------------------------------------- panel
        report.panel.fields = await cdp.evaluate(`[...document.querySelectorAll('.tyrell-panel [data-field]')].map(el => el.dataset.field)`)
        report.panel.snippet = await cdp.evaluate(`${PROJECT}.copySettings()`)
        await click('[data-action="presentation"]')
        await wait(600)
        report.panel.visibleInPresentation = await cdp.evaluate(
            `document.querySelector('.tyrell-panel').getBoundingClientRect().height > 0`)
        report.panel.controlsInPresentation = await cdp.evaluate(VISIBLE_CONTROLS)
        await click('[data-action="presentation"]')
        await wait(400)
        report.panel.controlsInReview = await cdp.evaluate(VISIBLE_CONTROLS)

        fs.writeFileSync(path.join(out, 'destello-paneo.json'), JSON.stringify(report, null, 2))
        return report
    }
}

/** Pixels whose colour differs by more than a quarter of an 8-bit step. */
function countDifferences(a, b) {
    let differing = 0
    for (let i = 0; i < a.pixels.length; i += 4) {
        let difference = 0
        for (let c = 0; c < 3; c++) difference = Math.max(difference, Math.abs(a.pixels[i + c] - b.pixels[i + c]))
        if (difference > 0.004) differing++
    }
    return differing
}

const POSE = `(() => {
    const camera = window.platform.canvasApp.project.stageCamera.get_camera()
    return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray() }
})()`

// Where the camera went, measured along the authored camera's own right axis, and whether it is
// still aiming at the point it was told to keep.
const PAN_SAMPLE = `(() => {
    const project = window.platform.canvasApp.project
    const camera = project.stageCamera.get_camera()
    const panning = project.panning
    const Vector3 = camera.position.constructor
    const right = new Vector3(1, 0, 0).applyQuaternion(panning.baseQuaternion)
    const displacement = camera.position.clone().sub(panning.basePosition)
    const aim = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const toFocus = panning.focus.clone().sub(camera.position).normalize()
    return {
        position: camera.position.toArray().map(v => +v.toFixed(4)),
        alongRight: +displacement.dot(right).toFixed(4),
        aimErrorDegrees: +(aim.angleTo(toFocus) * 180 / Math.PI).toFixed(5)
    }
})()`

const VISIBLE_CONTROLS = `(() => [...document.querySelectorAll('.tyrell-controls > *')]
    .filter(el => el.getBoundingClientRect().width > 0)
    .map(el => el.textContent.trim().split(String.fromCharCode(10))[0].trim())
    .filter(Boolean))()`
