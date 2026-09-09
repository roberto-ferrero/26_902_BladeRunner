import * as THREE from 'three'
import { TYRELL } from './config'

// Mouse panning over the fixed cameras.
//
// Moving the pointer left slides the camera to the right and it keeps aiming at the same place,
// so the framing stays on its subject and what changes is the parallax: the near columns move
// against the far pyramids. That is the whole point of the effect; a camera that merely slid
// would drag the frame off the composition Blender authored.
//
// "The same place" is measured, not assumed. Each authored camera casts a ray down its own axis
// against the room once, at build time, and keeps the distance to whatever it actually frames.
// A camera that looks at nothing falls back to the distance in config.js, and says so.

const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _target = new THREE.Vector3()
const _matrix = new THREE.Matrix4()

/**
 * Distance from each authored camera to what it frames, by raycasting against the room.
 *
 * A single ray down the axis is not enough, and measuring it showed why: CAM 01 is composed on
 * the sun through the window, so its centre pixel is sky and the ray leaves the building. The
 * pivot would then fall back to a guess on the very shot the effect matters most on.
 *
 * So the frame is sampled on a grid and the median of what it hits is taken. The median is the
 * point: it ignores the few rays that escape through the window and the few that graze a column
 * a metre away, and lands on the distance the shot is actually about.
 *
 * Returned as a Map keyed by the camera object, so it survives cameras being reordered.
 */
export function measureFocusDistances(cameras, meshes, fallback = TYRELL.panning.fallbackFocusMetres) {
    const raycaster = new THREE.Raycaster()
    const distances = new Map()
    // The meshes come straight from the loaded model and their world matrices may not have been
    // resolved yet; a ray cast against stale matrices finds nothing and every camera falls back.
    for (const mesh of meshes) mesh.updateWorldMatrix(true, false)
    for (const camera of cameras) {
        camera.updateWorldMatrix(true, false)
        const origin = camera.getWorldPosition(new THREE.Vector3())
        const rotation = camera.getWorldQuaternion(new THREE.Quaternion())
        // Half the frame, in tangent units, so the grid covers what the camera actually sees.
        const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov ?? 30) / 2)
        const tanX = tanY * (camera.aspect || TYRELL.referenceAspect)
        const hits = []
        let sampled = 0
        for (let row = 0; row < GRID; row++) {
            for (let column = 0; column < GRID; column++) {
                // The inner part of the frame: the edges are surround, not subject.
                const x = SPREAD * (column / (GRID - 1) * 2 - 1)
                const y = SPREAD * (row / (GRID - 1) * 2 - 1)
                _forward.set(x * tanX, y * tanY, -1).applyQuaternion(rotation).normalize()
                raycaster.set(origin, _forward)
                raycaster.far = 4000
                sampled++
                const hit = raycaster.intersectObjects(meshes, false)[0]
                if (hit && hit.distance >= 0.5) hits.push(hit.distance)
            }
        }
        hits.sort((a, b) => a - b)
        const median = hits.length ? hits[Math.floor(hits.length / 2)] : null
        distances.set(camera, {
            metres: median ?? fallback, measured: median !== null,
            samples: sampled, hits: hits.length,
            nearest: hits.length ? +hits[0].toFixed(3) : null,
            farthest: hits.length ? +hits[hits.length - 1].toFixed(3) : null
        })
    }
    return distances
}

// Rays per side, and how much of the frame they cover from the centre outward.
const GRID = 5
const SPREAD = 0.6

export default class TyrellPanning {
    constructor({ app, rig, focusDistances }) {
        this.app = app
        this.rig = rig
        this.focusDistances = focusDistances || new Map()
        this.settings = TYRELL.panning

        this.enabled = false
        this.pointer = new THREE.Vector2()          // where the mouse is, −1 to 1
        this.offset = new THREE.Vector2()           // where the camera is, eased toward pointer
        this.basePosition = new THREE.Vector3()
        this.baseQuaternion = new THREE.Quaternion()
        this.focus = new THREE.Vector3()
        this.focusMetres = this.settings.fallbackFocusMetres
        this.focusMeasured = false
        this.hasBase = false

        this.canvas = app.render.renderer.domElement
        this.onPointerMove = event => {
            const rect = this.canvas.getBoundingClientRect()
            if (!rect.width || !rect.height) return
            // Normalised to the canvas, not the window: in comparison mode the canvas is
            // letterboxed and the window's centre is not the frame's centre.
            this.pointer.set(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                ((event.clientY - rect.top) / rect.height) * 2 - 1
            )
            this.pointer.clampScalar(-1, 1)
        }
        // Leaving the window returns the camera to the authored pose rather than freezing it
        // wherever the pointer happened to exit.
        this.onPointerLeave = () => this.pointer.set(0, 0)
    }

    attach() {
        // Looked up here and not in the constructor: everything above this line is arithmetic on
        // the model, and it stays testable without a document.
        this.leaveTarget = document.documentElement
        window.addEventListener('pointermove', this.onPointerMove)
        this.leaveTarget.addEventListener('pointerleave', this.onPointerLeave)
        window.addEventListener('blur', this.onPointerLeave)
    }

    dispose() {
        window.removeEventListener('pointermove', this.onPointerMove)
        this.leaveTarget?.removeEventListener('pointerleave', this.onPointerLeave)
        window.removeEventListener('blur', this.onPointerLeave)
    }

    /** Records the pose to pan around. Called whenever a camera becomes the one on screen. */
    setBase(camera) {
        camera.updateWorldMatrix(true, false)
        camera.getWorldPosition(this.basePosition)
        camera.getWorldQuaternion(this.baseQuaternion)
        const measured = this.focusDistances.get(camera)
        // A pivot closer than half a metre would swing the frame instead of parallaxing it, so a
        // camera standing against geometry falls back rather than pivoting on its own nose.
        const metres = measured?.metres ?? this.settings.fallbackFocusMetres
        this.focusMetres = metres >= 0.5 ? metres : this.settings.fallbackFocusMetres
        this.focusMeasured = Boolean(measured?.measured)
        this.focusSamples = measured ? { hits: measured.hits, samples: measured.samples, nearest: measured.nearest, farthest: measured.farthest } : null
        // The point it keeps aiming at, in world space.
        this.focus.copy(_forward.set(0, 0, -1).applyQuaternion(this.baseQuaternion))
            .multiplyScalar(this.focusMetres).add(this.basePosition)
        this.hasBase = true
    }

    setEnabled(enabled) {
        this.enabled = enabled
        if (!enabled) this.pointer.set(0, 0)
    }

    /**
     * Eases the camera toward the pointer and re-aims it. Returns true when it wrote the camera,
     * so the caller can tell an idle frame from a moved one.
     */
    update(delta) {
        if (!this.hasBase) return false
        const target = this.enabled ? this.pointer : _zero
        // Exponential easing on a time constant, so the feel does not change with the frame rate.
        const blend = this.settings.smoothingSeconds > 0
            ? 1 - Math.exp(-Math.min(delta, 0.1) / this.settings.smoothingSeconds)
            : 1
        this.offset.lerp(target, blend)
        // Easing is asymptotic: on its own it would leave the camera a few microns off the
        // authored pose for ever. Once it is heading home and close enough to be invisible, it
        // snaps the rest of the way, writes that pose once and then stops writing at all. Being
        // exactly the authored pose again, and not almost it, is what earlier phases measure.
        if (target.lengthSq() === 0 && this.offset.lengthSq() < 1e-8) {
            if (this.offset.lengthSq() > 0) { this.offset.set(0, 0); this.apply() }
            return false
        }
        this.apply()
        return true
    }

    apply() {
        const camera = this.rig.get_camera()
        // At rest the authored pose is restored exactly, not recomputed through lookAt: the
        // comparison frames of every earlier phase depend on it being the very same numbers.
        if (this.offset.x === 0 && this.offset.y === 0) {
            camera.position.copy(this.basePosition)
            camera.quaternion.copy(this.baseQuaternion)
            camera.updateMatrixWorld(true)
            return
        }
        const { maxOffset, invert } = this.settings
        const sign = invert ? -1 : 1
        _right.set(1, 0, 0).applyQuaternion(this.baseQuaternion)
        _up.set(0, 1, 0).applyQuaternion(this.baseQuaternion)
        camera.position.copy(this.basePosition)
            .addScaledVector(_right, sign * this.offset.x * maxOffset.x)
            // Screen y grows downward, so the vertical sign is already the inverted one.
            .addScaledVector(_up, sign * -this.offset.y * maxOffset.y)
        // Re-aim at the point the authored camera framed, keeping its own up vector so the
        // horizon does not roll.
        _up.set(0, 1, 0).applyQuaternion(this.baseQuaternion)
        _matrix.lookAt(camera.position, this.focus, _up)
        camera.quaternion.setFromRotationMatrix(_matrix)
        camera.updateMatrixWorld(true)
    }

    get state() {
        return {
            enabled: this.enabled,
            maxOffset: { ...this.settings.maxOffset },
            offset: [+this.offset.x.toFixed(4), +this.offset.y.toFixed(4)],
            focusMetres: +this.focusMetres.toFixed(3),
            focusMeasured: this.focusMeasured,
            focusSamples: this.focusSamples,
            displacementMetres: +_target.set(
                this.offset.x * this.settings.maxOffset.x, this.offset.y * this.settings.maxOffset.y, 0
            ).length().toFixed(4)
        }
    }
}

const _zero = new THREE.Vector2(0, 0)
