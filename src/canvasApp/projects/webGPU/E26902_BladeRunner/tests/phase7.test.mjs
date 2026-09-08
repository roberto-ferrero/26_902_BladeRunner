// Phase 7 checks: the walk's own rules, and the measurements the browser gave back for them.
//
// The walker is exercised here rather than only in the browser because its two riskiest rules —
// never end up inside a wall, and never teleport when a frame is late — are cheap to check
// exhaustively offline and expensive to trust from a single run.
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
const navigation = load(path.join(root, 'TyrellNavigation.js'), { three: THREE, './config': { TYRELL } })
const { default: TyrellNavigation, collectObstacles, authoredEyeHeight } = navigation
const walk = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase7/fase7-paseo.json'), 'utf8'))

// A canvas and a camera rig with just enough surface for the walker to attach to.
function stub() {
    const listeners = []
    const canvas = {
        addEventListener: (type, fn) => listeners.push([type, fn]),
        removeEventListener: () => {}, requestPointerLock: () => {}
    }
    const camera = new THREE.PerspectiveCamera(30, 2.4, 0.1, 1000)
    return { app: { render: { renderer: { domElement: canvas } } }, rig: { get_camera: () => camera, setSource: () => {} }, camera }
}

function walker({ obstacles = [], eyeHeight = 1.62, floorY = 0, extent = 20 } = {}) {
    const { app, rig, camera } = stub()
    const bounds = new THREE.Box3(new THREE.Vector3(-extent, 0, -extent), new THREE.Vector3(extent, 6, extent))
    const nav = new TyrellNavigation({ app, rig, obstacles, floorY, eyeHeight, bounds })
    nav.walking = true
    return { nav, camera }
}

function mesh(name, box, matrix = new THREE.Matrix4()) {
    return {
        name, matrixWorld: matrix, updateWorldMatrix: () => {},
        geometry: { boundingBox: box, computeBoundingBox: () => {} }
    }
}

test('Eye height is the median of the film cameras, not a number chosen by taste', () => {
    // Heights are taken from the model so the walk sees the room from where it was shot. The
    // free camera at 3,19 m is above head height and must not drag the median up.
    const heights = [1.55, 1.62, 1.8, 1.65, 1.8, 1.868, 1.45, 1.435, 1.278, 3.193]
    const cameras = heights.map(y => ({ getWorldPosition: v => v.set(0, y, 0) }))
    assert.equal(authoredEyeHeight(cameras, 0), 1.62)
    // And it is the same figure the browser reported from the real model.
    assert.equal(walk.estado.eyeHeight, 1.62)
    // Without usable cameras it falls back rather than throwing.
    assert.equal(authoredEyeHeight([], 0), TYRELL.navigation.fallbackEyeHeight)
    assert.equal(authoredEyeHeight([{ getWorldPosition: v => v.set(0, 40, 0) }], 0), TYRELL.navigation.fallbackEyeHeight)
})

test('The ground is not an obstacle, and neither is a surface with no thickness', () => {
    const wide = new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 0.1, 5))
    const flat = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3, 4))
    const boxes = collectObstacles([
        mesh('Pavimento sector 03', wide), mesh('Mortero de juntas', wide),
        mesh('Cielo de fondo', flat), mesh('Columna izquierda', wide)
    ])
    assert.equal(boxes.length, 1, 'sólo la columna cuenta como obstáculo')
    assert.ok(boxes[0].equals(wide))
})

test('Walking and running cover the metres per second the configuration declares', () => {
    const { nav } = walker()
    nav.yaw = 0                                    // forward is −Z
    nav.keys.add('KeyW')
    for (let i = 0; i < 60; i++) nav.update(1 / 60)
    assert.ok(Math.abs(-nav.position.z - TYRELL.navigation.walkSpeed) < 1e-6, `${-nav.position.z} m en un segundo`)
    nav.keys.add('ShiftLeft')
    const from = nav.position.z
    for (let i = 0; i < 60; i++) nav.update(1 / 60)
    assert.ok(Math.abs((from - nav.position.z) - TYRELL.navigation.runSpeed) < 1e-6)
    // The browser measured the same thing through real key input.
    assert.ok(Math.abs(walk.paso.speed - TYRELL.navigation.walkSpeed) < 0.05, `${walk.paso.speed} m/s medidos`)
    assert.ok(Math.abs(walk.carrera.speed - TYRELL.navigation.runSpeed) < 0.1, `${walk.carrera.speed} m/s medidos`)
})

test('Looking up does not fly: movement stays on the floor plane', () => {
    const { nav } = walker()
    nav.pitch = Math.PI / 3
    nav.keys.add('KeyW')
    for (let i = 0; i < 30; i++) nav.update(1 / 60)
    assert.equal(+nav.position.y.toFixed(6), 1.62, 'la altura de ojo no cambia al mirar arriba')
})

test('A late frame does not teleport the walker through a wall', () => {
    // Coming back from a hidden tab hands the loop one enormous delta. Movement is capped at a
    // tenth of a second so that frame is a stumble, not a jump across the room.
    const wall = new THREE.Box3(new THREE.Vector3(-5, 0, -6), new THREE.Vector3(5, 4, -5))
    const { nav } = walker({ obstacles: [wall] })
    nav.yaw = 0
    nav.keys.add('KeyW')
    nav.update(30)
    assert.ok(nav.position.z > -5, `se quedó en z ${nav.position.z.toFixed(3)}, delante del muro`)
    // Horizontal distance only: the height of the eye is not travel.
    const travelled = Math.hypot(nav.position.x, nav.position.z)
    assert.ok(travelled <= TYRELL.navigation.walkSpeed * 0.1 + 1e-6, `avanzó ${travelled.toFixed(3)} m en un fotograma de 30 s`)
})

test('The walker never ends up inside an obstacle, from any direction', () => {
    // A pillar in the middle of the room, approached from thirty-six directions in turn.
    const pillar = new THREE.Box3(new THREE.Vector3(-0.6, 0, -0.6), new THREE.Vector3(0.6, 4, 0.6))
    for (let i = 0; i < 36; i++) {
        const angle = i * Math.PI / 18
        const { nav } = walker({ obstacles: [pillar] })
        // Start four metres out, aimed at the pillar.
        nav.position.set(Math.sin(angle) * 4, 1.62, Math.cos(angle) * 4)
        nav.yaw = angle + Math.PI
        nav.keys.add('KeyW')
        nav.keys.add('ShiftLeft')
        for (let step = 0; step < 300; step++) nav.update(1 / 60)
        assert.equal(nav.blocked(nav.position.x, nav.position.z, nav.feet), false,
            `entró en el obstáculo viniendo de ${(angle * 180 / Math.PI).toFixed(0)}°`)
    }
})

test('The walker stays inside the model, whatever the obstacles miss', () => {
    const { nav } = walker({ extent: 8 })
    nav.keys.add('KeyW')
    nav.keys.add('ShiftLeft')
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        nav.yaw = yaw
        for (let step = 0; step < 600; step++) nav.update(1 / 60)
        assert.ok(nav.position.x >= -8 && nav.position.x <= 8 && nav.position.z >= -8 && nav.position.z <= 8,
            `salió de los límites en ${nav.position.toArray()}`)
    }
    // And the browser said the same after running into the nearest wall it could find.
    assert.equal(walk.colision.dentroDeUnObstaculo, false)
    assert.equal(walk.colision.dentroDeLosLimites, true)
})

test('A step is climbed and a wall is not', () => {
    // A low platform running up to a wall: shallower than stepUp, so it is ground; the wall
    // behind it is taller, so it blocks. The platform reaches the wall on purpose, or the walker
    // would step back down before stopping and the test would prove nothing about standing on it.
    const platform = new THREE.Box3(new THREE.Vector3(-3, 0, -5), new THREE.Vector3(3, 0.3, -2))
    const wall = new THREE.Box3(new THREE.Vector3(-3, 0, -6), new THREE.Vector3(3, 2.5, -5))
    const { nav } = walker({ obstacles: [platform, wall] })
    nav.yaw = 0
    nav.keys.add('KeyW')
    for (let i = 0; i < 240; i++) nav.update(1 / 60)
    assert.ok(nav.position.z < -2 && nav.position.z > -5, `se detuvo en z ${nav.position.z.toFixed(3)}`)
    assert.equal(+nav.feet.toFixed(3), 0.3, 'subió los 30 cm del escalón')
    assert.equal(+(nav.position.y - nav.feet).toFixed(3), 1.62, 'la altura de ojo se mantiene sobre el escalón')
    assert.equal(nav.blocked(nav.position.x, nav.position.z, nav.feet), false)
})

test('Leaving the walk eases back to the authored pose and lands on it exactly', () => {
    const { nav, camera } = walker()
    camera.position.set(3, 1.62, 4)
    const target = new THREE.PerspectiveCamera(22.9175, 2.4, 0.1, 1000)
    target.position.set(-0.12, 1.55, 10.3)
    target.updateMatrixWorld(true)
    nav.transitionTo(target)
    let frames = 0
    while (nav.transition && frames < 600) { nav.update(1 / 60); frames++ }
    assert.ok(frames / 60 >= TYRELL.navigation.transitionSeconds - 1 / 60, 'no debe cortar')
    // The browser's own tween clock agreed with the declared duration.
    assert.equal(walk.transicion.declarada, TYRELL.navigation.transitionSeconds)
    assert.ok(walk.transicion.recorrida > TYRELL.navigation.transitionSeconds - 0.2)
    // Landing is on the authored pose itself, never on the tween's last step.
    assert.equal(walk.errorDePose.metros, 0)
    assert.equal(walk.errorDePose.fov, 0)
    // And the picture that comes back is the same one, pixel for pixel.
    assert.equal(walk.encuadreRestaurado.iguales, true)
    assert.ok(walk.encuadreRestaurado.pixeles > 500000, `${walk.encuadreRestaurado.pixeles} píxeles comparados`)
})

test('Losing the mouse or the window does not leave a key stuck down', () => {
    const { nav } = walker()
    nav.keys.add('KeyW')
    nav.onBlur()
    assert.equal(nav.keys.size, 0)
    nav.keys.add('KeyW')
    // The handler asks the document who holds the pointer; out of a browser it has to be told.
    globalThis.document = { pointerLockElement: null }
    nav.onPointerLockChange()
    assert.equal(nav.pointerLocked, false)
    assert.equal(nav.keys.size, 0)
    delete globalThis.document
    // Esc gives the mouse back without ending the walk; the browser confirmed both halves.
    assert.equal(walk.escapeSueltaElRaton, true)
    assert.equal(walk.escapeNoSaleDelPaseo, true)
    assert.equal(walk.raton.bloqueoDePuntero, true)
    assert.ok(Math.abs(walk.raton.giroEnGrados) > 5, 'el ratón debe girar la vista')
})

test('Keys that the walk does not use are left to the rest of the page', () => {
    const { nav } = walker()
    let prevented = 0
    const event = code => ({ code, preventDefault: () => prevented++ })
    nav.handleKey(event('Tab'), true)
    nav.handleKey(event('KeyR'), true)
    assert.equal(prevented, 0)
    assert.equal(nav.keys.size, 0)
    nav.handleKey(event('KeyW'), true)
    assert.equal(prevented, 1)
    // And nothing at all is captured while the walk is off.
    nav.walking = false
    nav.handleKey(event('KeyA'), true)
    assert.equal(prevented, 1)
})

test('Hiding the tab stops the loop and showing it starts it again', () => {
    assert.equal(walk.pausa.oculta.activa, false)
    assert.equal(walk.pausa.oculta.fotogramasEnUnSegundo, 0, 'oculta no debe dibujar')
    assert.equal(walk.pausa.devuelta.activa, true)
    assert.ok(walk.pausa.devuelta.fotogramasEnUnSegundo > 20, `${walk.pausa.devuelta.fotogramasEnUnSegundo} fotogramas al volver`)
})

test('The drawing buffer follows the window, and comparison mode pins it on purpose', () => {
    const resize = walk.redimensionado
    assert.deepEqual([resize.fijadoEnComparacion.width, resize.fijadoEnComparacion.height],
        [TYRELL.compareSize.width, TYRELL.compareSize.height])
    assert.equal(resize.siguioALaVentana, true)
    assert.equal(resize.volvio, true)
})

test('Presentation hides the review controls without taking the cameras away', () => {
    assert.ok(walk.revision.length > 10, `${walk.revision.length} controles en revisión`)
    assert.equal(walk.presentacion.length, 3)
    assert.ok(walk.presentacion.some(label => label.startsWith('Cámara')), 'las cámaras de la película se quedan')
    assert.ok(walk.presentacion.includes('Recorrido libre'))
    for (const hidden of ['Calidad', 'Comparación', 'Diagnóstico', 'Indirecta']) {
        assert.ok(!walk.presentacion.some(label => label.startsWith(hidden)), `${hidden} no debe verse en presentación`)
    }
})
