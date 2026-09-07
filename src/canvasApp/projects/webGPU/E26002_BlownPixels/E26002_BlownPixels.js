import * as THREE from 'three'
import * as THREE_GPU from 'three/webgpu'
import * as TSL from 'three/tsl'

import AssetLoader from '../../../core/AssetLoder/AssetLoader'
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'


class E002_Mars {
    constructor() {
        console.log("(E002_Mars.CONSTRUCTOR)!")
        this.type = "WEBGPU_APP"

        // this.PARTICLE_SIZE = 1.2
        this.ACCEL_STRENGTH = 210.0
        this.ACCEL_STRENGTH_RANDOMNESS = 0.28
        this.FLIGHT_FRICTION = 0.992
        this.FLIGHT_FRICTION_RANDOMNESS = 0.02
        this.RETURN_FRICTION = 0.9
        this.RETURN_FRICTION_RANDOMNESS = 0.06
        this.RETURN_FORCE = 9.0
        this.RETURN_FORCE_RANDOMNESS = 0.35
        this.MOUSE_FORCE = 5880.0
        this.MOUSE_FORCE_RANDOMNESS = 0.55
        this.MOUSE_RADIUS = 20.0
        this.MOUSE_FALLOFF_RADIUS = 320.0
        this.MOUSE_SMOOTHING = 0.22
        this.MOUSE_SPEED_SCALE = 950.0
        this.MOUSE_RADIUS_MIN_FACTOR = 0.2
        this.MOUSE_RADIUS_RESPONSE = 0.08
        this.SPEED_Z_OFFSET = 0.24
        this.BLOW_DURATION = 1.35
        this.BLOW_DURATION_RANDOMNESS = 0.3
        this.RANDOM_DRIFT = 14.0
        this.RANDOM_DRIFT_RANDOMNESS = 0.4

        this.DARK_PARTICLE_MIN_MOBILITY = 0.9
        this.DARK_PARTICLE_DRAG = 0.12 // 0.02 pattern 

        this.elapsedTime = 0
        this.mouseTarget = new THREE.Vector2(100000, 100000)
        this.mouseCurrent = new THREE.Vector2(100000, 100000)
        this.mousePrevious = new THREE.Vector2(100000, 100000)
        this.mouseTrail = new THREE.Vector2(100000, 100000)
        this.mouseSpeed = 0
        this.mouseRadiusFactor = 0
        this.mouseIsActive = false
    }

    init(app) {
        console.log("(E002_Mars.init)!")
        this.app = app
        this.scene = this.app.render.scene
        let tier = this.app.render.performanceData.tier
        tier = "Low"
        switch (tier) {
            case 'Low':
                this.NUM_PARTICLES = 500000
                this.PARTICLE_SIZE = 2
                break
            case 'Mid':
                this.NUM_PARTICLES = 1000000
                this.PARTICLE_SIZE = 2
                break
            case 'High':
            default:
                this.NUM_PARTICLES = 2000000
                this.PARTICLE_SIZE = 1.2
                break
        }

        this.stageCamera = new StageOrtoCamera({
            app: this.app,
            project: this,
            parent3D: this.scene,
            size: this.app.size.CURRENT
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())

        this.loader = new AssetLoader({
            app: this.app,
            pathPrefix: this.app.pathPrefix
        })

        const linearFilterSettings = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            generateMipmaps: false,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping
        }
        const imageKey = "image1"
        this.loader.add_texture("mars", this.app.pathPrefix + "img/"+imageKey+"_1.jpg")
        this.loader.add_texture("mars2", this.app.pathPrefix + "img/"+imageKey+"_2.jpg")
        this.loader.add_texture("accelMap", this.app.pathPrefix + "img/velMap5.jpg", linearFilterSettings)

        this.loader.emitter.on("onCompleted", () => {
            console.log("ALL ASSETS LOADED!")
            this.app.emitter.emit("onProjectLoaded", {})
        })
        this.loader.start()

        this._setupMouseInteraction()
    }

    build() {
        console.log("(E002_Mars.build)!")

        this.world3D = new THREE.Object3D()
        this.scene.add(this.world3D)

        this.frame = new OrtoResponsiveFrame({
            app: this.app,
            project: this,
            itemRef: this.world3D,
            refWidth: this.app.size.REF.width,
            refHeight: this.app.size.REF.height,
            MODE: "COVER",
            SCALE_FACTOR: 1.0
        })

        this.marsTexture = this.loader.get_texture("mars")
        this.marsTexture2 = this.loader.get_texture("mars2")
        this.marsTexture.colorSpace = THREE.SRGBColorSpace
        this.marsTexture2.colorSpace = THREE.SRGBColorSpace
        this.accelMap = this.loader.get_texture("accelMap")

        this._buildBgPlane()
        this._buildSimulation()
        this._buildRender_cuads()
        // this._buildRender_points()
    }

    _buildBgPlane() {
        const geometry = new THREE.PlaneGeometry(this.app.size.REF.width, this.app.size.REF.height)
        const material = new THREE_GPU.MeshBasicNodeMaterial()
        material.colorNode = TSL.texture(this.marsTexture2, TSL.uv())
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.set(0, 0, -100)
        this.world3D.add(this.mesh)
    }

    _getUV(position) {
        return TSL.vec2(
            position.x.add(this.halfWidthUniform).div(this.stageWidthUniform),
            position.y.add(this.halfHeightUniform).div(this.stageHeightUniform)
        ).clamp(0.0, 1.0)
    }

    _getAccelForce(uv, strength) {
        return TSL.texture(this.accelMap, uv).rg.sub(0.5).mul(strength)
    }

    _getMouseInfluence(distance, innerRadius, outerRadius) {
        const safeOuterRadius = TSL.max(outerRadius, innerRadius.add(0.0001))
        const normalizedDistance = distance.sub(innerRadius).div(safeOuterRadius.sub(innerRadius)).clamp(0.0, 1.0)
        const influence = TSL.float(1.0).sub(normalizedDistance)
        return influence.mul(influence).mul(TSL.float(3.0).sub(influence.mul(2.0)))
    }

    _getMouseForce_repulsion(position, target, innerRadius, outerRadius, strength) {
        const delta = position.xy.sub(target)
        const distance = delta.length().add(0.0001)
        const softInfluence = this._getMouseInfluence(distance, innerRadius, outerRadius)
        return delta.div(distance).mul(softInfluence.mul(strength))
    }

    _getRenderPosition(positionNode, velocityNode) {
        const speedZ = velocityNode.xy.length().mul(this.SPEED_Z_OFFSET)
        return TSL.vec3(positionNode.x, positionNode.y, positionNode.z.add(speedZ))
    }

    _buildSimulation() {
        const width = this.app.size.REF.width
        const height = this.app.size.REF.height
        const gridColumns = Math.max(1, Math.ceil(Math.sqrt(this.NUM_PARTICLES * (width / height))))
        const gridRows = Math.max(1, Math.ceil(this.NUM_PARTICLES / gridColumns))
        const cellWidth = width / gridColumns
        const cellHeight = height / gridRows

        const positions = new Float32Array(this.NUM_PARTICLES * 4)
        const velocities = new Float32Array(this.NUM_PARTICLES * 4)
        const origins = new Float32Array(this.NUM_PARTICLES * 4)
        const colors = new Float32Array(this.NUM_PARTICLES * 4)
        const randomValues = new Float32Array(this.NUM_PARTICLES * 4)
        const motionValues = new Float32Array(this.NUM_PARTICLES * 4)
        const stateValues = new Float32Array(this.NUM_PARTICLES * 4)

        const marsSampler = this._createTextureSampler(this.marsTexture)
        const sampledColorLinear = new THREE.Color()

        for (let i = 0; i < this.NUM_PARTICLES; i++) {
            const i4 = i * 4
            const column = i % gridColumns
            const row = Math.floor(i / gridColumns)
            const x = ((column + 0.5) * cellWidth) - (width * 0.5)
            const y = (height * 0.5) - ((row + 0.5) * cellHeight)
            const uvX = THREE.MathUtils.clamp((x + (width * 0.5)) / width, 0, 1)
            const uvY = THREE.MathUtils.clamp((y + (height * 0.5)) / height, 0, 1)
            const sampledColor = marsSampler.sample(uvX, uvY)
            sampledColorLinear.setRGB(sampledColor.r, sampledColor.g, sampledColor.b, THREE.SRGBColorSpace)

            positions[i4 + 0] = x
            positions[i4 + 1] = y
            positions[i4 + 2] = 0.0
            positions[i4 + 3] = 1.0

            velocities[i4 + 0] = 0.0
            velocities[i4 + 1] = 0.0
            velocities[i4 + 2] = 0.0
            velocities[i4 + 3] = 0.0

            origins[i4 + 0] = x
            origins[i4 + 1] = y
            origins[i4 + 2] = 0.0
            origins[i4 + 3] = 1.0

            colors[i4 + 0] = sampledColorLinear.r
            colors[i4 + 1] = sampledColorLinear.g
            colors[i4 + 2] = sampledColorLinear.b
            colors[i4 + 3] = 1.0

            randomValues[i4 + 0] = THREE.MathUtils.lerp(
                -this.RANDOM_DRIFT * (1.0 + this.RANDOM_DRIFT_RANDOMNESS),
                this.RANDOM_DRIFT * (1.0 + this.RANDOM_DRIFT_RANDOMNESS),
                Math.random()
            )
            randomValues[i4 + 1] = THREE.MathUtils.lerp(
                -this.RANDOM_DRIFT * (1.0 + this.RANDOM_DRIFT_RANDOMNESS),
                this.RANDOM_DRIFT * (1.0 + this.RANDOM_DRIFT_RANDOMNESS),
                Math.random()
            )
            randomValues[i4 + 2] = THREE.MathUtils.lerp(
                1.0 - this.ACCEL_STRENGTH_RANDOMNESS,
                1.0 + this.ACCEL_STRENGTH_RANDOMNESS,
                Math.random()
            )
            randomValues[i4 + 3] = THREE.MathUtils.lerp(
                1.0 - this.MOUSE_FORCE_RANDOMNESS,
                1.0 + this.MOUSE_FORCE_RANDOMNESS,
                Math.random()
            )

            motionValues[i4 + 0] = THREE.MathUtils.lerp(
                1.0 - this.FLIGHT_FRICTION_RANDOMNESS,
                1.0 + this.FLIGHT_FRICTION_RANDOMNESS,
                Math.random()
            )
            motionValues[i4 + 1] = THREE.MathUtils.lerp(
                1.0 - this.RETURN_FRICTION_RANDOMNESS,
                1.0 + this.RETURN_FRICTION_RANDOMNESS,
                Math.random()
            )
            motionValues[i4 + 2] = THREE.MathUtils.lerp(
                1.0 - this.RETURN_FORCE_RANDOMNESS,
                1.0 + this.RETURN_FORCE_RANDOMNESS,
                Math.random()
            )
            motionValues[i4 + 3] = THREE.MathUtils.lerp(
                1.0 - this.BLOW_DURATION_RANDOMNESS,
                1.0 + this.BLOW_DURATION_RANDOMNESS,
                Math.random()
            )

            stateValues[i4 + 0] = 0.0
            stateValues[i4 + 1] = THREE.MathUtils.lerp(0.2, 1.0, Math.random())
            stateValues[i4 + 2] = 0.0
            stateValues[i4 + 3] = 0.0
        }

        this.positionStorage = TSL.instancedArray(positions, 'vec4').setName('marsParticlePositions')
        this.velocityStorage = TSL.instancedArray(velocities, 'vec4').setName('marsParticleVelocities')
        this.originStorage = TSL.instancedArray(origins, 'vec4').setName('marsParticleOrigins')
        this.colorStorage = TSL.instancedArray(colors, 'vec4').setName('marsParticleColors')
        this.randomStorage = TSL.instancedArray(randomValues, 'vec4').setName('marsParticleRandomness')
        this.motionStorage = TSL.instancedArray(motionValues, 'vec4').setName('marsParticleMotion')
        this.stateStorage = TSL.instancedArray(stateValues, 'vec4').setName('marsParticleState')

        this.deltaUniform = TSL.uniform(1 / 60)
        this.stageWidthUniform = TSL.uniform(width)
        this.stageHeightUniform = TSL.uniform(height)
        this.halfWidthUniform = TSL.uniform(width * 0.5)
        this.halfHeightUniform = TSL.uniform(height * 0.5)
        this.mousePositionUniform = TSL.uniform(new THREE.Vector2(this.mouseCurrent.x, this.mouseCurrent.y))
        this.mouseActiveUniform = TSL.uniform(0.0)
        this.mouseForceUniform = TSL.uniform(this.MOUSE_FORCE)
        this.mouseRadiusUniform = TSL.uniform(this.MOUSE_RADIUS)
        this.mouseFalloffRadiusUniform = TSL.uniform(this.MOUSE_FALLOFF_RADIUS)
        this.mouseSpeedUniform = TSL.uniform(0.0)
        this.mouseRadiusFactorUniform = TSL.uniform(0.0)
        this.mouseSpeedScaleUniform = TSL.uniform(this.MOUSE_SPEED_SCALE)
        this.accelStrengthUniform = TSL.uniform(this.ACCEL_STRENGTH)
        this.flightFrictionUniform = TSL.uniform(this.FLIGHT_FRICTION)
        this.returnFrictionUniform = TSL.uniform(this.RETURN_FRICTION)
        this.returnForceUniform = TSL.uniform(this.RETURN_FORCE)
        this.blowDurationUniform = TSL.uniform(this.BLOW_DURATION)

        this.simulationCompute = TSL.Fn(() => {
            const position = this.positionStorage.element(TSL.instanceIndex)
            const velocity = this.velocityStorage.element(TSL.instanceIndex)
            const origin = this.originStorage.element(TSL.instanceIndex)
            const color = this.colorStorage.element(TSL.instanceIndex)
            const randomData = this.randomStorage.element(TSL.instanceIndex)
            const motionData = this.motionStorage.element(TSL.instanceIndex)
            const state = this.stateStorage.element(TSL.instanceIndex)

            const uv = this._getUV(position)
            const accelForce = this._getAccelForce(uv, this.accelStrengthUniform.mul(randomData.z))
            const randomDrift = randomData.xy
            const luminance = color.r.mul(0.2126).add(color.g.mul(0.7152)).add(color.b.mul(0.0722))
            const colorMobility = luminance.mul(1.0 - this.DARK_PARTICLE_MIN_MOBILITY).add(this.DARK_PARTICLE_MIN_MOBILITY)
            const colorDragFactor = TSL.float(1.0).sub(TSL.float(1.0).sub(luminance).mul(this.DARK_PARTICLE_DRAG))
            const mouseDistance = position.xy.sub(this.mousePositionUniform).length().add(0.0001)
            const mouseSpeedFactor = this.mouseSpeedUniform.div(this.mouseSpeedScaleUniform).clamp(0.0, 1.0)
            const mouseRadiusFactor = this.mouseRadiusFactorUniform
            const mouseInfluence = this._getMouseInfluence(
                mouseDistance,
                this.mouseRadiusUniform.mul(mouseRadiusFactor),
                this.mouseFalloffRadiusUniform.mul(mouseRadiusFactor)
            )
            const mouseResistance = state.y
            const returnDelta = origin.xy.sub(position.xy)
            const returnDistance = returnDelta.length().add(0.0001)
            const flightFriction = this.flightFrictionUniform.mul(motionData.x).mul(colorDragFactor).clamp(0.0, 0.9999)
            const returnFriction = this.returnFrictionUniform.mul(motionData.y).mul(colorDragFactor).clamp(0.0, 0.9999)
            const returnForce = this.returnForceUniform.mul(motionData.z).mul(colorMobility)
            const blowDuration = this.blowDurationUniform.mul(motionData.w)
            const selectedMouseForce = this._getMouseForce_repulsion(
                position,
                this.mousePositionUniform,
                this.mouseRadiusUniform.mul(mouseRadiusFactor),
                this.mouseFalloffRadiusUniform.mul(mouseRadiusFactor),
                this.mouseForceUniform.mul(randomData.w)
            )
            const selectedMouseInfluence = mouseInfluence
            const mouseRepulsion = selectedMouseForce.mul(mouseSpeedFactor).mul(mouseResistance).mul(colorMobility)
            const effectiveMouseInfluence = selectedMouseInfluence.mul(mouseResistance)

            TSL.If(this.mouseActiveUniform.greaterThan(0.5), () => {
                TSL.If(effectiveMouseInfluence.mul(mouseSpeedFactor).greaterThan(0.0), () => {
                    state.x.assign(blowDuration.mul(effectiveMouseInfluence.add(0.35)))
                    velocity.xy.addAssign(mouseRepulsion.mul(this.deltaUniform.mul(0.9)))
                })
            })

            TSL.If(state.x.greaterThan(0.0), () => {
                velocity.xy.addAssign(accelForce.add(randomDrift).mul(colorMobility).add(mouseRepulsion.mul(0.25)).mul(this.deltaUniform))
                velocity.xy.mulAssign(flightFriction)
                position.xy.addAssign(velocity.xy.mul(this.deltaUniform))
                state.x.subAssign(this.deltaUniform)
            }).Else(() => {
                velocity.xy.addAssign(returnDelta.mul(returnForce).mul(this.deltaUniform))
                velocity.xy.mulAssign(returnFriction)
                position.xy.addAssign(velocity.xy.mul(this.deltaUniform))

                TSL.If(returnDistance.lessThan(0.75), () => {
                    position.xy.assign(origin.xy)
                    velocity.xy.assign(TSL.vec2(0.0, 0.0))
                })
            })
        })().compute(this.NUM_PARTICLES)
    }

    _buildRender_points() {
        const geometry = new THREE.BufferGeometry()
        const ids = new Float32Array(this.NUM_PARTICLES)

        for (let i = 0; i < this.NUM_PARTICLES; i++) {
            ids[i] = i
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.NUM_PARTICLES * 3), 3))
        geometry.setAttribute('particleId', new THREE.Float32BufferAttribute(ids, 1))

        const material = new THREE_GPU.PointsNodeMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        })

        const particlePosition = this.positionStorage.element(TSL.vertexIndex)
        const particleVelocity = this.velocityStorage.element(TSL.vertexIndex)
        material.positionNode = this._getRenderPosition(particlePosition.xyz, particleVelocity)
        material.sizeNode = TSL.float(this.PARTICLE_SIZE)
        material.colorNode = this.colorStorage.element(TSL.vertexIndex).rgb

        this.points = new THREE.Points(geometry, material)
        this.world3D.add(this.points)
    }

    _buildRender_cuads() {
        const geometry = new THREE.PlaneGeometry(1, 1)
        const material = new THREE_GPU.MeshBasicNodeMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        })

        const particlePosition = this.positionStorage.element(TSL.instanceIndex)
        const particleVelocity = this.velocityStorage.element(TSL.instanceIndex)

        material.positionNode = TSL.positionLocal
            .mul(this.PARTICLE_SIZE)
            .add(this._getRenderPosition(particlePosition.xyz, particleVelocity))
        material.colorNode = this.colorStorage.element(TSL.instanceIndex).rgb

        this.points = new THREE.InstancedMesh(geometry, material, this.NUM_PARTICLES)
        this.points.frustumCulled = false
        this.points.position.set(0, 0, 800)
        this.world3D.add(this.points)
    }

    update_RAF() {
        this.frame?.update_RAF()

        if (!this.simulationCompute) {
            return
        }

        this.elapsedTime += this.app.DELTA_TIME
        this.deltaUniform.value = this.app.DELTA_TIME
        this._updateMouseTrail()
        this._updateMouseSpeed()
        this._updateMouseRadiusFactor()
        this.mousePositionUniform.value.copy(this.mouseCurrent)
        this.mouseSpeedUniform.value = this.mouseSpeed
        this.mouseRadiusFactorUniform.value = this.mouseRadiusFactor
        this.mouseActiveUniform.value = this.mouseIsActive ? 1.0 : 0.0

        const renderer = this.app.get_render()

        if (renderer && typeof renderer.computeAsync === 'function') {
            renderer.computeAsync(this.simulationCompute)
        }
    }

    _setupMouseInteraction() {
        const target = this.app.$mouseEvents || this.app.$container

        if (!target) {
            return
        }

        target.addEventListener('pointermove', this._onPointerMove = (event) => {
            const rect = target.getBoundingClientRect()
            const localX = event.clientX - rect.left
            const localY = event.clientY - rect.top

            this.mouseTarget.set(
                ((localX / rect.width) - 0.5) * this.app.size.REF.width,
                (0.5 - (localY / rect.height)) * this.app.size.REF.height
            )

            if (!this.mouseIsActive) {
                this.mouseCurrent.copy(this.mouseTarget)
                this.mousePrevious.copy(this.mouseTarget)
                this.mouseTrail.copy(this.mouseTarget)
            }

            this.mouseIsActive = true
        })

        const deactivateMouse = () => {
            this.mouseIsActive = false
        }

        target.addEventListener('pointerleave', this._onPointerLeave = deactivateMouse)
        target.addEventListener('pointercancel', this._onPointerCancel = deactivateMouse)
    }

    _updateMouseTrail() {
        if (!this.mouseIsActive) {
            this.mouseCurrent.lerp(this.mouseTarget, 0.04)
            this.mouseTrail.lerp(this.mouseCurrent, 0.08)
            return
        }

        this.mouseCurrent.lerp(this.mouseTarget, this.MOUSE_SMOOTHING)
        this.mouseTrail.lerp(this.mouseCurrent, this.MOUSE_SMOOTHING * 0.45)
    }

    _updateMouseSpeed() {
        if (!this.mouseIsActive) {
            this.mouseSpeed = 0
            this.mousePrevious.copy(this.mouseCurrent)
            return
        }

        const deltaTime = Math.max(this.app.DELTA_TIME, 1 / 240)
        this.mouseSpeed = this.mouseCurrent.distanceTo(this.mousePrevious) / deltaTime
        this.mousePrevious.copy(this.mouseCurrent)
    }

    _updateMouseRadiusFactor() {
        const normalizedSpeed = THREE.MathUtils.clamp(this.mouseSpeed / this.MOUSE_SPEED_SCALE, 0, 1)
        const targetRadiusFactor = normalizedSpeed > 0
            ? THREE.MathUtils.lerp(this.MOUSE_RADIUS_MIN_FACTOR, 1.0, normalizedSpeed)
            : 0

        this.mouseRadiusFactor = THREE.MathUtils.lerp(
            this.mouseRadiusFactor,
            targetRadiusFactor,
            this.MOUSE_RADIUS_RESPONSE
        )

        if (!this.mouseIsActive && this.mouseRadiusFactor < 0.0001) {
            this.mouseRadiusFactor = 0
        }
    }

    _createTextureSampler(texture) {
        const image = texture?.image || texture?.source?.data
        const width = image?.width || 1
        const height = image?.height || 1
        const canvas = globalThis.document?.createElement?.('canvas')
        const context = canvas?.getContext?.('2d', { willReadFrequently: true })

        if (!canvas || !context || !image) {
            return {
                sample: () => ({ r: 1, g: 1, b: 1 })
            }
        }

        canvas.width = width
        canvas.height = height
        context.drawImage(image, 0, 0, width, height)
        const pixels = context.getImageData(0, 0, width, height).data

        return {
            sample: (u, v) => {
                const x = Math.min(width - 1, Math.max(0, Math.floor(u * (width - 1))))
                const y = Math.min(height - 1, Math.max(0, Math.floor((1 - v) * (height - 1))))
                const index = ((y * width) + x) * 4

                return {
                    r: pixels[index + 0] / 255,
                    g: pixels[index + 1] / 255,
                    b: pixels[index + 2] / 255
                }
            }
        }
    }
}

export default E002_Mars
