// The sun's lens flare and the mouse panning, added after phase 7.
//
// The panning is exercised here and not only in the browser for the same reason the walk is: its
// two promises — that it keeps aiming at the same point, and that at rest it gives the authored
// pose back exactly — are cheap to check across every camera offline and expensive to trust from
// one run.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const babel = require('@babel/core')
const root = path.resolve('src/canvasApp/projects/webGPU/E26902_BladeRunner')
function load(file, imports = {}) {
    const result = babel.transformSync(fs.readFileSync(file, 'utf8'), {
        filename: file, configFile: false, babelrc: false,
        plugins: ['@babel/plugin-transform-modules-commonjs']
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', result.code)(key => {
        if (!(key in imports)) throw new Error('Unexpected import: ' + key)
        return imports[key]
    }, module, module.exports)
    return module.exports
}
const { TYRELL } = load(path.join(root, 'config.js'))
const panningModule = load(path.join(root, 'TyrellPanning.js'), { three: THREE, './config': { TYRELL } })
const { default: TyrellPanning, measureFocusDistances } = panningModule
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/extras/destello-paneo.json'), 'utf8'))
// The walk is only entered properly by the walkthrough, so that is where panning's behaviour
// during it is recorded.
const walkthrough = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase7/fase7-paseo.json'), 'utf8'))

function stub() {
    const canvas = {
        addEventListener: () => {}, removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1920, height: 800 })
    }
    const camera = new THREE.PerspectiveCamera(23, 2.4, 0.03, 2500)
    return { app: { render: { renderer: { domElement: canvas } } }, rig: { get_camera: () => camera }, camera }
}

/** A panning instance already based on an authored camera placed at the given pose. */
function panner({ position = [0, 1.55, 10], lookAt = [0, 1.55, 0], focusMetres = 10 } = {}) {
    const { app, rig, camera } = stub()
    const authored = new THREE.PerspectiveCamera(23, 2.4, 0.03, 2500)
    authored.position.fromArray(position)
    authored.lookAt(new THREE.Vector3().fromArray(lookAt))
    authored.updateMatrixWorld(true)
    const focusDistances = new Map([[authored, { metres: focusMetres, measured: true, hits: 20, samples: 25 }]])
    const panning = new TyrellPanning({ app, rig, focusDistances })
    // The rig would have copied the authored pose; here it is done by hand.
    camera.position.copy(authored.position)
    camera.quaternion.copy(authored.quaternion)
    panning.setBase(authored)
    panning.setEnabled(true)
    return { panning, camera, authored }
}

/** Runs the easing until it settles, at sixty frames a second. */
function settle(panning, frames = 240) {
    for (let i = 0; i < frames; i++) panning.update(1 / 60)
}

test('The flare carries the sun\'s own linear colour, not a tint picked by eye', () => {
    // Ghosts are the sun's light scattered inside the lens, so they carry its colour: the same
    // (1, 0,69, 0,34) the master gives the sun in TYRELL.lighting.sun.
    assert.deepEqual(TYRELL.post.flare.tint, TYRELL.lighting.sun.color)
    // Linear components, never a hex literal, like every other colour in this project.
    for (const channel of TYRELL.post.flare.tint) assert.ok(channel >= 0 && channel <= 1)
})

test('The flare is a look decision and the sweep behind it is monotonic, not a minimum', () => {
    // Unlike the bloom, there is nothing to compare a flare against: Blender's render has none.
    // So the sweep can only say how much of the frame it touches, and it rises all the way.
    const sweep = evidence.flare.sweep
    assert.ok(sweep.length >= 4)
    for (let i = 1; i < sweep.length; i++) {
        assert.ok(sweep[i].maxDifference > sweep[i - 1].maxDifference, 'la respuesta debe ser monótona')
    }
    assert.equal(TYRELL.post.flare.strength, evidence.flare.shipped)
    // It has to be doing something on the delivered value, or it is not worth its pass.
    const shipped = sweep.find(row => row.strength === TYRELL.post.flare.strength)
    assert.ok(shipped && shipped.maxDifference > 0.05, `diferencia máxima ${shipped?.maxDifference}`)
})

test('The flare costs a pass and no more', () => {
    // Phase 6 shipped 341 draw calls on CAM 01; the flare is one downsampled pass over the bloom.
    assert.ok(evidence.flare.drawCalls - 341 <= 4, `${evidence.flare.drawCalls} llamadas de dibujo`)
    assert.ok(evidence.flare.drawCalls > 341)
})

test('The pivot is measured on a grid, because one ray down the axis is not the subject', () => {
    // CAM 01 is composed on the sun through the window, so its centre pixel is sky and a single
    // ray leaves the building. Every camera has to come back measured, none on the fallback.
    for (const camera of evidence.panning.focusDistances) {
        assert.equal(camera.measured, true, `${camera.name} cayó en el valor de reserva`)
        assert.ok(camera.metres > 0.5, `${camera.name} a ${camera.metres} m`)
        assert.ok(camera.hits > camera.samples / 2, `${camera.name}: ${camera.hits} de ${camera.samples} rayos`)
    }
    // And the one that would have failed is the one the effect matters most on.
    const cam01 = evidence.panning.focusDistances.find(c => c.name.startsWith('CAM_01'))
    assert.ok(cam01.metres > 5, `CAM 01 pivota a ${cam01.metres} m`)
})

test('A camera that frames nothing falls back instead of pivoting on its own nose', () => {
    const empty = measureFocusDistances([new THREE.PerspectiveCamera(23, 2.4, 0.03, 2500)], [])
    const [only] = [...empty.values()]
    assert.equal(only.measured, false)
    assert.equal(only.metres, TYRELL.panning.fallbackFocusMetres)
    assert.equal(only.hits, 0)
})

test('Mouse left moves the camera right, and the reverse', () => {
    const { panning, camera, authored } = panner()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(authored.quaternion)
    panning.pointer.set(-1, 0)
    settle(panning)
    const left = camera.position.clone().sub(authored.position).dot(right)
    panning.pointer.set(1, 0)
    settle(panning)
    const rightward = camera.position.clone().sub(authored.position).dot(right)
    assert.ok(left > 0, `el ratón a la izquierda debe llevar la cámara a la derecha, salió ${left}`)
    assert.ok(rightward < 0)
    // And it never leaves the declared range.
    assert.ok(Math.abs(left) <= TYRELL.panning.maxOffset.x + 1e-6, `${left} m sobre ${TYRELL.panning.maxOffset.x}`)
    assert.ok(Math.abs(rightward) <= TYRELL.panning.maxOffset.x + 1e-6)
})

test('It keeps aiming at the same point, which is the whole difference from sliding', () => {
    const { panning, camera } = panner()
    for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [0.4, -0.7]]) {
        panning.pointer.set(x, y)
        settle(panning)
        const aim = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        const toFocus = panning.focus.clone().sub(camera.position).normalize()
        assert.ok(aim.angleTo(toFocus) < 1e-4, `apunta ${aim.angleTo(toFocus)} rad fuera del foco en ${x},${y}`)
    }
    // The browser measured zero degrees off at both ends of the travel.
    assert.equal(evidence.panning.aimErrorDegrees.left, 0)
    assert.equal(evidence.panning.aimErrorDegrees.right, 0)
})

test('The horizon does not roll while it pans', () => {
    const { panning, camera, authored } = panner()
    const authoredUp = new THREE.Vector3(0, 1, 0).applyQuaternion(authored.quaternion)
    panning.pointer.set(-1, 1)
    settle(panning)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    // Any roll would show as the up vector leaving the plane the authored up and the aim span.
    assert.ok(up.angleTo(authoredUp) < 0.05, `${up.angleTo(authoredUp)} rad de balanceo`)
})

test('At rest it gives the authored pose back exactly, not almost', () => {
    // Exponential easing never reaches its target, so on its own it would leave the camera a few
    // microns off for ever. Earlier phases compare frames pixel for pixel and would notice.
    const { panning, camera, authored } = panner()
    panning.pointer.set(-1, 0.6)
    settle(panning)
    assert.ok(!camera.position.equals(authored.position), 'primero tiene que haberse movido')
    panning.setEnabled(false)
    settle(panning, 600)
    assert.ok(camera.position.equals(authored.position), `quedó en ${camera.position.toArray()}`)
    assert.ok(camera.quaternion.equals(authored.quaternion))
    // Once settled it stops writing the camera at all.
    assert.equal(panning.update(1 / 60), false)
    // The browser said the same thing after a blur.
    assert.equal(evidence.panning.restIsExact, true)
})

test('The feel does not change with the frame rate', () => {
    // Easing on a time constant, not per frame: a second of pointing left has to land in the
    // same place at 30 and at 120 frames a second.
    const slow = panner(), fast = panner()
    slow.panning.pointer.set(-1, 0)
    fast.panning.pointer.set(-1, 0)
    for (let i = 0; i < 30; i++) slow.panning.update(1 / 30)
    for (let i = 0; i < 120; i++) fast.panning.update(1 / 120)
    assert.ok(slow.camera.position.distanceTo(fast.camera.position) < 5e-4,
        `${slow.camera.position.distanceTo(fast.camera.position)} m de diferencia entre 30 y 120 fps`)
})

test('It is inert wherever the authored pose has to be exact', () => {
    // Comparison mode is the one that matters: every measurement against Blender depends on it.
    assert.equal(evidence.panning.inComparison.enabled, false)
    assert.equal(evidence.panning.inComparison.poseUntouched, true)
    // And the walk owns the camera when it is walking.
    assert.equal(walkthrough.paneoDuranteElPaseo.walking, true)
    assert.equal(walkthrough.paneoDuranteElPaseo.enabled, false)
})

test('The panel offers every parameter that config.js ships', () => {
    // A parameter that cannot be reached from the panel is one that has to be guessed in a file.
    const offered = new Set(evidence.panel.fields)
    for (const name of ['strength', 'threshold', 'ghosts', 'spacing', 'attenuation', 'tintR', 'tintG', 'tintB']) {
        assert.ok(offered.has('flare.' + name), `falta el mando de ${name}`)
    }
    for (const name of ['enabled', 'x', 'y', 'smoothingSeconds', 'invert']) {
        assert.ok(offered.has('panning.' + name), `falta el mando de paneo ${name}`)
    }
    // It is a measuring instrument, so what it produces has to be pasteable into config.js.
    assert.ok(evidence.panel.snippet.includes('flare: {'))
    assert.ok(evidence.panel.snippet.includes('panning: {'))
    // The panel is review, not experience: presentation must not show it.
    assert.equal(evidence.panel.visibleInPresentation, false)
})
