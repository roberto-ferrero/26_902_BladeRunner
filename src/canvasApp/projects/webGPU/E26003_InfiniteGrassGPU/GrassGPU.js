import * as THREE from 'three'
import * as THREE_GPU from 'three/webgpu'
import * as TSL from 'three/tsl'

class GrassGPU {
    constructor(obj) {
        console.log("(GrassGPU.CONSTRUCTOR)!")
        this.app = obj.app // CanvasApp
        this.parent3D = obj.parent3D || this.app.render.scene
        this.stageCamera = obj.stageCamera
        this.map = obj.map // RGB texture. Higher levels of G (green) mean higher grass density
        this.heightMap = obj.heightMap // RGB texture. Higher levels of G (green) mean higher grass density
        this.alphaChannel = obj.alphaChannel
        this.size = obj.size // {width, height, aspect}
        this.bladeCount = obj.bladeCount // Number of grass blades to render
        this.clock = new THREE.Clock()

        this.colorPool = [
            new THREE.Color(0xa5b85e),
            new THREE.Color(0xa5b85e),
            new THREE.Color(0x79a529),
            new THREE.Color(0x79a529),
            new THREE.Color(0x729714),
            new THREE.Color(0x729714),
            new THREE.Color(0xb7b675)
        ]

        this.params = {
            patchWidth: Math.max(1, this.size?.width || 1),
            patchDepth: Math.max(1, this.size?.height || 1),
            bladeCount: Math.max(1, this.bladeCount || 1),
            bladeWidth: 0.42,
            bladeHeight: 10.0,
            bladeScaleMin: 0.3,
            bladeScaleMax: 1.75,
            bladeScaleRandomness: 0.35,
            cellSnap: 2.0,
            windStrength: 5.28,
            windSpeed: 1.1,
            edgeFade: 0.00,
            centerHole: 0.0,
            densityThreshold: 0.005,
            maxPlacementAttemptsFactor: 18,
            maxHeight: obj.maxHeight ?? obj.heightScale ?? 100.0,
            radius1: obj.radius1 ?? 150,   // inside: 100% visible + animated
            radius2: obj.radius2 ?? 400    // inside: 50% visible; outside: 20% visible
        }
    }

    build() {
        this.timeUniform = TSL.uniform(0.0)
        this.patchSizeUniform = TSL.uniform(new THREE.Vector2(
            this.params.patchWidth,
            this.params.patchDepth
        ))
        this.windStrengthUniform = TSL.uniform(this.params.windStrength)
        this.windSpeedUniform = TSL.uniform(this.params.windSpeed)
        this.edgeFadeUniform = TSL.uniform(this.params.edgeFade)
        this.centerHoleUniform = TSL.uniform(this.params.centerHole)
        this.cameraPosUniform = TSL.uniform(new THREE.Vector3())
        // Squared radii — avoids sqrt() in the vertex shader
        this.radius1SqUniform = TSL.uniform(this.params.radius1 * this.params.radius1)
        this.radius2SqUniform = TSL.uniform(this.params.radius2 * this.params.radius2)

        this._buildGrass()
    }

    _buildGrass() {
        // 2 height segments instead of 4: 6 vertices/blade vs 10 — 40% fewer vertex shader invocations.
        // Visually identical for static distant blades; animated near blades retain a natural kink.
        const bladeGeo = new THREE.PlaneGeometry(
            this.params.bladeWidth,
            this.params.bladeHeight,
            1,
            2
        )
        bladeGeo.translate(0, this.params.bladeHeight * 0.5, 0)

        const instanceData = this._createInstanceData()

        if (instanceData.count === 0) {
            return
        }

        // Stride = 10: [x, y, z, scale, rotation, bend, r, g, b, lodRnd]
        // lodRnd is a stable per-blade random baked at build time — no hash() in the vertex shader.
        const interleaved = new THREE.InstancedInterleavedBuffer(instanceData.array, 10)
        bladeGeo.setAttribute('aOffsetScale', new THREE.InterleavedBufferAttribute(interleaved, 4, 0))
        bladeGeo.setAttribute('aRotBend',     new THREE.InterleavedBufferAttribute(interleaved, 2, 4))
        bladeGeo.setAttribute('aColor',       new THREE.InterleavedBufferAttribute(interleaved, 3, 6))
        bladeGeo.setAttribute('aLodRnd',      new THREE.InterleavedBufferAttribute(interleaved, 1, 9))

        this.material = this._createGrassMaterial()
        this.grass = new THREE.InstancedMesh(bladeGeo, this.material, instanceData.count)
        this.grass.instanceMatrix.setUsage(THREE.StaticDrawUsage)
        this._setIdentityInstanceMatrices(this.grass)
        this.grass.frustumCulled = false
        this.parent3D.add(this.grass)
    }

    _createInstanceData() {
        const targetCount = this.params.bladeCount
        const INSTANCE_STRIDE = 10 // +1 for lodRnd (baked per-blade random for LOD visibility)
        const halfWidth = this.params.patchWidth * 0.5
        const halfDepth = this.params.patchDepth * 0.5
        const sampler = this._createTextureSampler(this.map)
        const heightSampler = this._createTextureSampler(this.heightMap)
        const scratch = new Float32Array(targetCount * INSTANCE_STRIDE)
        const colorPool = this.colorPool?.length ? this.colorPool : [new THREE.Color(0x4d8f37)]

        let bladeIndex = 0
        let attempts = 0
        const maxAttempts = targetCount * this.params.maxPlacementAttemptsFactor

        while (bladeIndex < targetCount && attempts < maxAttempts) {
            attempts++

            const x = (Math.random() - 0.5) * this.params.patchWidth
            const z = (Math.random() - 0.5) * this.params.patchDepth
            const u = (x + halfWidth) / this.params.patchWidth
            const v = (z + halfDepth) / this.params.patchDepth
            const sample = sampler.sample(u, v)
            const density = THREE.MathUtils.clamp(sample.g, 0, 1)

            if (density <= this.params.densityThreshold || Math.random() > density) {
                continue
            }

            const heightSample = heightSampler.sample(u, v)
            const y = heightSample.r * this.params.maxHeight

            const scaleRandomness = (Math.random() - 0.5) * this.params.bladeScaleRandomness
            const scale = THREE.MathUtils.clamp(
                THREE.MathUtils.lerp(this.params.bladeScaleMin, this.params.bladeScaleMax, density) + scaleRandomness,
                this.params.bladeScaleMin * 0.5,
                this.params.bladeScaleMax + this.params.bladeScaleRandomness
            )
            const rotation = Math.random() * Math.PI * 2.0
            const bend = THREE.MathUtils.lerp(0.25, 1.0, density * 0.7 + Math.random() * 0.3)
            const color = colorPool[Math.floor(Math.random() * colorPool.length)]
            const index = bladeIndex * INSTANCE_STRIDE

            scratch[index + 0] = x
            scratch[index + 1] = y
            scratch[index + 2] = z
            scratch[index + 3] = scale
            scratch[index + 4] = rotation
            scratch[index + 5] = bend
            scratch[index + 6] = color.r
            scratch[index + 7] = color.g
            scratch[index + 8] = color.b
            scratch[index + 9] = Math.random() // lodRnd: stable per-blade random for LOD visibility

            bladeIndex++
        }

        return {
            count: bladeIndex,
            array: scratch.slice(0, bladeIndex * INSTANCE_STRIDE)
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
                const y = Math.min(height - 1, Math.max(0, Math.floor(v * (height - 1))))
                const index = ((y * width) + x) * 4

                return {
                    r: pixels[index + 0] / 255,
                    g: pixels[index + 1] / 255,
                    b: pixels[index + 2] / 255
                }
            }
        }
    }

    _setIdentityInstanceMatrices(mesh) {
        const matrixArray = mesh.instanceMatrix.array

        for (let i = 0; i < mesh.count; i++) {
            const index = i * 16
            matrixArray[index + 0] = 1
            matrixArray[index + 1] = 0
            matrixArray[index + 2] = 0
            matrixArray[index + 3] = 0
            matrixArray[index + 4] = 0
            matrixArray[index + 5] = 1
            matrixArray[index + 6] = 0
            matrixArray[index + 7] = 0
            matrixArray[index + 8] = 0
            matrixArray[index + 9] = 0
            matrixArray[index + 10] = 1
            matrixArray[index + 11] = 0
            matrixArray[index + 12] = 0
            matrixArray[index + 13] = 0
            matrixArray[index + 14] = 0
            matrixArray[index + 15] = 1
        }

        mesh.instanceMatrix.needsUpdate = true
    }

    _createGrassMaterial() {
        const positionLocal = TSL.positionLocal
        const bladeUv = TSL.uv()
        const aOffsetScale = TSL.attribute('aOffsetScale', 'vec4')
        const aRotBend = TSL.attribute('aRotBend', 'vec2')
        const aColor = TSL.attribute('aColor', 'vec3')
        const aLodRnd = TSL.attribute('aLodRnd', 'float') // baked per-blade random, no hash() in shader
        const aOffset = aOffsetScale.xyz
        const aScale = aOffsetScale.w
        const aRotation = aRotBend.x
        const aBend = aRotBend.y

        const h = bladeUv.y

        // --- Camera LOD (squared distance — no sqrt per vertex) ---
        const diff = aOffset.xz.sub(this.cameraPosUniform.xz)
        const sqDist = diff.dot(diff)

        // 1 when sqDist >= radius², 0 when sqDist < radius²
        const beyondR1 = TSL.step(this.radius1SqUniform, sqDist)
        const beyondR2 = TSL.step(this.radius2SqUniform, sqDist)

        // Visibility threshold per zone: 1.0 (zone1) → 0.5 (zone2) → 0.2 (zone3)
        // zone1: 1.0 - 0 - 0 = 1.0  →  all blades pass (aLodRnd always < 1)
        // zone2: 1.0 - 0.5 - 0 = 0.5  →  50% pass
        // zone3: 1.0 - 0.5 - 0.3 = 0.2  →  20% pass
        const visThreshold = TSL.float(1.0)
            .sub(beyondR1.mul(0.5))
            .sub(beyondR2.mul(0.3))

        // isVisible = 1 when aLodRnd <= visThreshold, 0 otherwise
        const isVisible = TSL.step(aLodRnd, visThreshold)

        // Outside zone1: no animation
        const animFactor = beyondR1.oneMinus()

        const widthScale = TSL.mix(0.85, 1.2, aScale.mul(3.17).fract())

        // Collapse invisible blades to zero scale (vertex-level cull, cheaper than alpha discard)
        const effectiveScale = aScale.mul(isVisible)

        const basePos = TSL.vec3(
            positionLocal.x.mul(widthScale),
            positionLocal.y.mul(effectiveScale),
            positionLocal.z
        )

        const timePhase = this.timeUniform.mul(this.windSpeedUniform)
        const windNoise = aOffset.x.mul(0.11).add(timePhase).sin()
            .mul(aOffset.z.mul(0.09).add(timePhase.mul(0.85)).cos())
        const sideNoise = aOffset.x.add(aOffset.z).mul(0.07).add(this.timeUniform.mul(0.7)).sin()

        // animFactor = 0 outside zone1 → no wind bend
        const bendFactor = this.windStrengthUniform.mul(h).mul(h).mul(aBend).mul(animFactor)
        const bentPos = TSL.vec3(
            basePos.x.add(windNoise.mul(bendFactor)),
            basePos.y,
            basePos.z.add(sideNoise.mul(bendFactor).mul(0.35))
        )

        const sinR = aRotation.sin()
        const cosR = aRotation.cos()
        const rotatedXZ = TSL.vec2(
            bentPos.x.mul(cosR).sub(bentPos.z.mul(sinR)),
            bentPos.x.mul(sinR).add(bentPos.z.mul(cosR))
        )

        const worldPos = TSL.vec3(
            rotatedXZ.x.add(aOffset.x),
            bentPos.y.add(aOffset.y),
            rotatedXZ.y.add(aOffset.z)
        )

        const patchUv = aOffset.xz.div(this.patchSizeUniform).add(TSL.vec2(0.5, 0.5))
        const normalizedOffset = aOffset.xz.div(this.patchSizeUniform.mul(0.5))
        const distToCenter = normalizedOffset.length()
        const edgeDistance = TSL.min(
            TSL.min(patchUv.x, patchUv.y),
            TSL.min(TSL.sub(1.0, patchUv.x), TSL.sub(1.0, patchUv.y))
        )

        const edge = TSL.smoothstep(0.0, this.edgeFadeUniform, edgeDistance)
        const centerFade = this.centerHoleUniform.greaterThan(0.0).select(
            TSL.smoothstep(this.centerHoleUniform, this.centerHoleUniform.add(0.08), distToCenter),
            TSL.float(1.0)
        )

        const rnd = TSL.hash(patchUv.mul(200.0).floor())
        const thinning = TSL.smoothstep(0.55, 1.0, edge.add(rnd.mul(0.35)))
        const tipFade = TSL.smoothstep(1.0, 0.82, h)
        const alphaMask = this.alphaChannel
            ? TSL.texture(this.alphaChannel, bladeUv).r
            : TSL.float(1.0)

        const alpha = tipFade.mul(edge).mul(centerFade).mul(thinning).mul(alphaMask)
        const baseCol = aColor.mul(0.72)
        const tipCol = aColor.mul(1.15)
        const finalColor = TSL.mix(baseCol, tipCol, TSL.smoothstep(0.0, 0.85, h))

        const material = new THREE_GPU.MeshBasicNodeMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending
        })

        material.positionNode = worldPos
        material.colorNode = finalColor
        material.opacityNode = alpha
        material.alphaTest = 0.05

        return material
    }

    update_RAF() {
        if (!this.material) return

        this.timeUniform.value = this.clock.getElapsedTime()

        // Use the actively rendered camera (handles dev camera switches correctly)
        const cam = this.app.render.get_activeCamera()
        if (cam?.position) {
            this.cameraPosUniform.value.copy(cam.position)
        }
    }
}

export default GrassGPU
