import * as THREE from 'three'
import { TYRELL } from './config'

// Free walk through the room, alongside the film cameras.
//
// The user asked for both, so neither replaces the other: the fixed cameras stay the reference
// for comparison and the walk is a way of being inside the space. Leaving the walk returns to the
// camera it started from, with its exact authored framing, so nothing is lost by wandering off.
//
// Nothing here is a number typed from taste. Eye height is the median of the heights the Blender
// cameras were placed at, the floor is the top of the pavement, and the walls and furniture the
// walker cannot cross are the boxes of the meshes already collected as shadow casters.

const _box = new THREE.Box3()
const _size = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _euler = new THREE.Euler(0, 0, 0, 'YXZ')
const _quaternion = new THREE.Quaternion()
const _position = new THREE.Vector3()

// Anything the walker should pass through rather than bump into.
const WALKABLE = /^(Pavimento|Mortero)/

/**
 * Collects the obstacles as world boxes, once, from meshes that already had to be gathered for
 * the shadow pass. The pavement is excluded because it is the ground, not an obstacle.
 */
export function collectObstacles(meshes) {
    const boxes = []
    for (const mesh of meshes) {
        if (WALKABLE.test(mesh.name)) continue
        mesh.updateWorldMatrix(true, false)
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
        _box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
        _box.getSize(_size)
        // A box with no thickness cannot be stood against and only costs time to test.
        if (_size.x < 1e-3 || _size.z < 1e-3) continue
        boxes.push(new THREE.Box3().copy(_box))
    }
    return boxes
}

/** The height the film cameras were placed at, so the walk sees the room from where it was shot. */
export function authoredEyeHeight(cameras, floorY) {
    const heights = cameras
        .map(camera => camera.getWorldPosition(new THREE.Vector3()).y - floorY)
        .filter(height => height > 0.5 && height < 3)
        .sort((a, b) => a - b)
    if (!heights.length) return TYRELL.navigation.fallbackEyeHeight
    return heights[Math.floor(heights.length / 2)]
}

export default class TyrellNavigation {
    constructor({ app, rig, obstacles, floorY, eyeHeight, bounds }) {
        this.app = app
        this.rig = rig
        this.obstacles = obstacles
        this.floorY = floorY
        this.eyeHeight = eyeHeight
        this.bounds = bounds
        this.settings = TYRELL.navigation

        this.walking = false
        this.keys = new Set()
        this.yaw = 0
        this.pitch = 0
        this.feet = floorY
        this.position = new THREE.Vector3()
        this.transition = null
        this.returnCamera = null

        this.canvas = app.render.renderer.domElement
        this.onKeyDown = event => this.handleKey(event, true)
        this.onKeyUp = event => this.handleKey(event, false)
        this.onMouseMove = event => this.handleLook(event)
        this.onPointerLockChange = () => {
            this.pointerLocked = document.pointerLockElement === this.canvas
            if (!this.pointerLocked) this.keys.clear()
        }
        this.onCanvasClick = () => {
            if (this.walking && !this.pointerLocked) this.canvas.requestPointerLock?.()
        }
        // Losing the window must not leave a key stuck down.
        this.onBlur = () => this.keys.clear()
    }

    attach() {
        window.addEventListener('keydown', this.onKeyDown)
        window.addEventListener('keyup', this.onKeyUp)
        window.addEventListener('blur', this.onBlur)
        document.addEventListener('mousemove', this.onMouseMove)
        document.addEventListener('pointerlockchange', this.onPointerLockChange)
        this.canvas.addEventListener('click', this.onCanvasClick)
    }

    dispose() {
        window.removeEventListener('keydown', this.onKeyDown)
        window.removeEventListener('keyup', this.onKeyUp)
        window.removeEventListener('blur', this.onBlur)
        document.removeEventListener('mousemove', this.onMouseMove)
        document.removeEventListener('pointerlockchange', this.onPointerLockChange)
        this.canvas.removeEventListener('click', this.onCanvasClick)
        if (document.pointerLockElement === this.canvas) document.exitPointerLock?.()
    }

    handleKey(event, down) {
        if (!this.walking) return
        // Only the keys the walk uses are swallowed, so the rest of the page keeps working.
        const code = event.code
        if (!MOVEMENT.has(code) && code !== 'ShiftLeft' && code !== 'ShiftRight') return
        event.preventDefault()
        if (down) this.keys.add(code)
        else this.keys.delete(code)
    }

    handleLook(event) {
        if (!this.walking || !this.pointerLocked) return
        const { lookSensitivity, pitchLimitDeg } = this.settings
        this.yaw -= event.movementX * lookSensitivity
        this.pitch -= event.movementY * lookSensitivity
        const limit = THREE.MathUtils.degToRad(pitchLimitDeg)
        this.pitch = Math.max(-limit, Math.min(limit, this.pitch))
    }

    /** Starts walking from wherever the given camera is looking, so the change is continuous. */
    start(fromCamera, returnIndex) {
        const camera = this.rig.get_camera()
        this.returnCamera = returnIndex
        this.position.copy(camera.position)
        this.feet = this.groundUnder(this.position.x, this.position.z, this.position.y - this.eyeHeight)
        _euler.setFromQuaternion(camera.quaternion, 'YXZ')
        this.yaw = _euler.y
        this.pitch = _euler.x
        this.walking = true
        this.transition = null
        this.canvas.requestPointerLock?.()
    }

    stop() {
        this.walking = false
        this.keys.clear()
        if (document.pointerLockElement === this.canvas) document.exitPointerLock?.()
    }

    /** Eases the camera from where it is now to an authored pose, rather than cutting to it. */
    transitionTo(target) {
        const camera = this.rig.get_camera()
        target.updateWorldMatrix(true, false)
        this.transition = {
            elapsed: 0,
            seconds: this.settings.transitionSeconds,
            fromPosition: camera.position.clone(),
            fromQuaternion: camera.quaternion.clone(),
            fromFov: camera.fov,
            toPosition: target.getWorldPosition(new THREE.Vector3()),
            toQuaternion: target.getWorldQuaternion(new THREE.Quaternion()),
            toFov: target.fov,
            target
        }
    }

    /** Highest surface the walker can stand on at this spot, within a step of where they are. */
    groundUnder(x, z, currentFeet) {
        const { stepUp, stepDown } = this.settings
        let ground = this.floorY
        for (const box of this.obstacles) {
            if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z) continue
            const top = box.max.y
            if (top > currentFeet + stepUp || top < currentFeet - stepDown) continue
            if (top > ground) ground = top
        }
        return ground
    }

    /** Slides against the obstacles one axis at a time, which is what keeps corners passable. */
    blocked(x, z, feet) {
        const { radius, stepUp, height } = this.settings
        const low = feet + stepUp
        const high = feet + height
        for (const box of this.obstacles) {
            if (box.max.y <= low || box.min.y >= high) continue
            if (x + radius < box.min.x || x - radius > box.max.x) continue
            if (z + radius < box.min.z || z - radius > box.max.z) continue
            return true
        }
        return false
    }

    update(delta) {
        if (this.transition) return this.updateTransition(delta)
        if (!this.walking) return false

        const camera = this.rig.get_camera()
        const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
        const speed = (running ? this.settings.runSpeed : this.settings.walkSpeed) * Math.min(delta, 0.1)

        let ahead = 0, side = 0
        if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) ahead += 1
        if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ahead -= 1
        if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) side += 1
        if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) side -= 1

        if (ahead || side) {
            // Movement stays on the floor plane whatever the pitch, so looking up does not fly.
            _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
            _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
            const dx = (_forward.x * ahead + _right.x * side)
            const dz = (_forward.z * ahead + _right.z * side)
            const length = Math.hypot(dx, dz) || 1
            const stepX = dx / length * speed
            const stepZ = dz / length * speed

            const nextX = this.position.x + stepX
            const nextZ = this.position.z + stepZ
            if (!this.blocked(nextX, this.position.z, this.feet)) this.position.x = nextX
            if (!this.blocked(this.position.x, nextZ, this.feet)) this.position.z = nextZ
            this.position.x = Math.min(this.bounds.max.x, Math.max(this.bounds.min.x, this.position.x))
            this.position.z = Math.min(this.bounds.max.z, Math.max(this.bounds.min.z, this.position.z))
            this.feet = this.groundUnder(this.position.x, this.position.z, this.feet)
        }

        this.position.y = this.feet + this.eyeHeight
        camera.position.copy(this.position)
        _euler.set(this.pitch, this.yaw, 0, 'YXZ')
        camera.quaternion.setFromEuler(_euler)
        camera.updateMatrixWorld(true)
        return true
    }

    updateTransition(delta) {
        const move = this.transition
        move.elapsed += delta
        const t = Math.min(1, move.elapsed / move.seconds)
        // Smoothstep: no jerk at either end, which is what makes a cut feel like a move.
        const eased = t * t * (3 - 2 * t)
        const camera = this.rig.get_camera()
        camera.position.lerpVectors(move.fromPosition, move.toPosition, eased)
        camera.quaternion.slerpQuaternions(move.fromQuaternion, move.toQuaternion, eased)
        camera.fov = THREE.MathUtils.lerp(move.fromFov, move.toFov, eased)
        camera.updateProjectionMatrix()
        camera.updateMatrixWorld(true)
        if (t >= 1) {
            // Land on the authored pose exactly, never on the tween's last step.
            this.rig.setSource(move.target)
            this.transition = null
        }
        return true
    }

    get state() {
        return {
            walking: this.walking,
            pointerLocked: Boolean(this.pointerLocked),
            transitioning: Boolean(this.transition),
            eyeHeight: +this.eyeHeight.toFixed(3),
            floorY: +this.floorY.toFixed(3),
            obstacles: this.obstacles.length,
            position: this.position.toArray().map(v => +v.toFixed(2)),
            returnCamera: this.returnCamera
        }
    }
}

const MOVEMENT = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
])
