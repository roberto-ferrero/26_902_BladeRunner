import * as THREE from 'three'
import * as THREE_GPU from 'three/webgpu'
import * as TSL from 'three/tsl'

import AssetLoader from '../../../core/AssetLoder/AssetLoader'
import StageOrtoCamera from "../../../core/cameras/StageOrtoCamera"
import OrtoResponsiveFrame from '../../../core/utils/OrtoResponsiveFrame'

class E26004_PageCurlGPU {
    constructor() {
        console.log("(E26004_PageCurlGPU.CONSTRUCTOR)!")
        this.type = "WEBGPU_APP"

        this.PAGE_WIDTH = 510
        this.PAGE_HEIGHT = 700
        this.PAGE_SEGMENTS_X = 60
        this.PAGE_SEGMENTS_Y = 80
        this.OUTPUT_SCALE = 1.255
        this.CURL_RADIUS = 76.5
        this.CURL_START_LINE_FACTOR = 0.35
        this.PAGE_THICKNESS = 2.2
        this.MOUSE_SMOOTHING = 0.18
        this.CURL_RESPONSE = 0.14
        this.MAX_CURL_ANGLE = Math.PI * 1.15

        this.originPoint = new THREE.Vector2(0, 0)
        this.mouseTarget = new THREE.Vector2(this.PAGE_WIDTH * 0.5, 0)
        this.mouseCurrent = new THREE.Vector2(this.PAGE_WIDTH * 0.5, 0)
        this.mouseRest = new THREE.Vector2(this.PAGE_WIDTH * 0.5, 0)
        this.currentStartPoint = new THREE.Vector2()
        this.currentInteractionDir = new THREE.Vector2(1, 0)
        this.currentCurlLineDir = new THREE.Vector2(0, 1)
        this.currentAxisPoint = new THREE.Vector3()

        this.interactionLimitX = (-this.PAGE_WIDTH * 0.5) + (this.PAGE_WIDTH * 0.6)
        this.interactionArea = {
            minX: this.interactionLimitX,
            maxX: this.interactionLimitX + this.PAGE_WIDTH,
            minY: -this.PAGE_HEIGHT * 0.75,
            maxY: this.PAGE_HEIGHT * 0.75
        }

        this.pointerInsideArea = false
        this.interactionBlend = 0
    }

    init(app) {
        console.log("(E26004_PageCurlGPU.init)!")
        this.app = app
        this.scene = this.app.render.scene
        this.clock = new THREE.Clock()

        this.stageCamera = new StageOrtoCamera({
            app: this.app,
            project: this,
            parent3D: this.scene,
            size: {
                width: this.app.size.CURRENT.width,
                height: this.app.size.CURRENT.height,
                aspect: this.app.size.CURRENT.width / this.app.size.CURRENT.height
            }
        })
        this.app.render.set_stageCamera(this.stageCamera.get_camera())

        this.loader = new AssetLoader({
            app: this.app,
            pathPrefix: this.app.pathPrefix
        })
        this.loader.add_texture("page0", this.app.pathPrefix + "img/E26004_PageCurlGPU/Mad_1.jpg")
        this.loader.add_texture("page1", this.app.pathPrefix + "img/E26004_PageCurlGPU/Mad_2.jpg")
        this.loader.add_texture("page2", this.app.pathPrefix + "img/E26004_PageCurlGPU/Mad_3.jpg")

        this.loader.emitter.on("onCompleted", () => {
            console.log("ALL ASSETS LOADED!")
            this.app.emitter.emit("onProjectLoaded", {})
        })

        this.loader.start()
        this._setupPointerInteraction()
    }

    build() {
        console.log("(E26004_PageCurlGPU.build)!")

        this.world3D = new THREE.Object3D()
        this.world3D.scale.setScalar(this.OUTPUT_SCALE)
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

        this.page0Texture = this.loader.get_texture("page0")
        this.page1Texture = this.loader.get_texture("page1")
        this.page2Texture = this.loader.get_texture("page2")

        this.page0Texture.colorSpace = THREE.SRGBColorSpace
        this.page1Texture.colorSpace = THREE.SRGBColorSpace
        this.page2Texture.colorSpace = THREE.SRGBColorSpace

        this._buildPages()
        this._buildHelpers()
        this._updateCurlState(true)
        this._applyCurlGeometry()
        this._updateHelpers()
    }

    update_RAF() {
        this.frame?.update_RAF()

        if (!this.coverFrontGeometry) {
            return
        }

        this.mouseCurrent.lerp(this.mouseTarget, this.MOUSE_SMOOTHING)

        const targetBlend = this.pointerInsideArea ? 1 : 0
        this.interactionBlend = THREE.MathUtils.lerp(this.interactionBlend, targetBlend, this.CURL_RESPONSE)

        this._updateCurlState()
        this._applyCurlGeometry()
        this._updateHelpers()
    }

    _buildPages() {
        const baseGeometry = new THREE.PlaneGeometry(
            this.PAGE_WIDTH,
            this.PAGE_HEIGHT,
            this.PAGE_SEGMENTS_X,
            this.PAGE_SEGMENTS_Y
        )

        this.coverFrontGeometry = baseGeometry.clone()
        this.coverBackGeometry = baseGeometry.clone()
        this.coverFrontBasePositions = Float32Array.from(this.coverFrontGeometry.attributes.position.array)
        this.coverBackBasePositions = Float32Array.from(this.coverBackGeometry.attributes.position.array)

        const insideGeometry = new THREE.PlaneGeometry(this.PAGE_WIDTH, this.PAGE_HEIGHT, 1, 1)

        const insideMaterial = new THREE_GPU.MeshBasicNodeMaterial({
            side: THREE.DoubleSide
        })
        insideMaterial.colorNode = TSL.texture(this.page2Texture, TSL.uv())

        this.insidePageMesh = new THREE.Mesh(insideGeometry, insideMaterial)
        this.insidePageMesh.position.z = -0.6
        this.world3D.add(this.insidePageMesh)

        const coverFrontMaterial = new THREE_GPU.MeshBasicNodeMaterial({
            side: THREE.FrontSide
        })
        coverFrontMaterial.colorNode = TSL.texture(this.page0Texture, TSL.uv())

        const coverBackMaterial = new THREE_GPU.MeshBasicNodeMaterial({
            side: THREE.BackSide
        })
        coverBackMaterial.colorNode = TSL.texture(this.page1Texture, TSL.uv())

        this.coverFrontMesh = new THREE.Mesh(this.coverFrontGeometry, coverFrontMaterial)
        this.coverBackMesh = new THREE.Mesh(this.coverBackGeometry, coverBackMaterial)
        this.coverFrontMesh.position.z = 0.12
        this.coverBackMesh.position.z = -0.12

        this.world3D.add(this.coverBackMesh)
        this.world3D.add(this.coverFrontMesh)
    }

    _buildHelpers() {
        this.helpers3D = new THREE.Object3D()
        this.helpers3D.position.z = 30
        this.world3D.add(this.helpers3D)

        this.originHelper = this._createPointHelper(0x00ff88)
        this.mouseHelper = this._createPointHelper(0xff5533)
        this.curlStartPointHelper = this._createPointHelper(0xffdd55)
        this.axisPointHelper = this._createPointHelper(0x55aaff)

        this.helpers3D.add(this.originHelper)
        this.helpers3D.add(this.mouseHelper)
        this.helpers3D.add(this.curlStartPointHelper)
        this.helpers3D.add(this.axisPointHelper)

        this.limitLineHelper = this._createLineHelper(0x3399ff)
        this.interactionLineHelper = this._createLineHelper(0xffffff)
        this.curlStartLineHelper = this._createLineHelper(0xffdd55)
        this.curlAxisLineHelper = this._createLineHelper(0x55aaff)
        this.interactionAreaHelper = this._createLineHelper(0x22ccff)

        this.helpers3D.add(this.limitLineHelper)
        this.helpers3D.add(this.interactionLineHelper)
        this.helpers3D.add(this.curlStartLineHelper)
        this.helpers3D.add(this.curlAxisLineHelper)
        this.helpers3D.add(this.interactionAreaHelper)

        const area = this.interactionArea
        const areaCorners = [
            new THREE.Vector3(area.minX, area.minY, 0),
            new THREE.Vector3(area.maxX, area.minY, 0),
            new THREE.Vector3(area.maxX, area.maxY, 0),
            new THREE.Vector3(area.minX, area.maxY, 0),
            new THREE.Vector3(area.minX, area.minY, 0)
        ]
        this._setLinePoints(this.interactionAreaHelper, areaCorners)

        this._setLinePoints(this.limitLineHelper, [
            new THREE.Vector3(this.interactionLimitX, -this.PAGE_HEIGHT * 0.5, 0),
            new THREE.Vector3(this.interactionLimitX, this.PAGE_HEIGHT * 0.5, 0)
        ])
    }

    _createPointHelper(color) {
        return new THREE.Mesh(
            new THREE.SphereGeometry(this.PAGE_WIDTH * 0.015, 12, 12),
            new THREE.MeshBasicMaterial({
                color,
                depthTest: false,
                transparent: true,
                opacity: 0.95
            })
        )
    }

    _createLineHelper(color) {
        const geometry = new THREE.BufferGeometry()
        geometry.setFromPoints([
            new THREE.Vector3(),
            new THREE.Vector3()
        ])

        return new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: 0.9,
                depthTest: false
            })
        )
    }

    _setLinePoints(line, points) {
        line.geometry.setFromPoints(points)
        line.geometry.computeBoundingSphere()
    }

    _updateCurlState(force = false) {
        if (force && !this.pointerInsideArea) {
            this.mouseCurrent.copy(this.mouseRest)
        }

        const effectiveMouse = this.originPoint.clone().lerp(this.mouseCurrent, this.interactionBlend)
        const delta = effectiveMouse.clone().sub(this.originPoint)
        const rawDistance = delta.length()
        const distance = Math.max(rawDistance, 0.0001)
        const interactionDir = rawDistance > 0.0001
            ? delta.normalize()
            : new THREE.Vector2(1, 0)
        const curlLineDir = new THREE.Vector2(-interactionDir.y, interactionDir.x)
        const startPoint = this.originPoint.clone().lerp(effectiveMouse, this.CURL_START_LINE_FACTOR)

        this.currentMousePoint = effectiveMouse
        this.currentStartPoint.copy(startPoint)
        this.currentInteractionDir.copy(interactionDir)
        this.currentCurlLineDir.copy(curlLineDir)
        this.currentInteractionDistance = distance
        this.currentAxisPoint.set(
            startPoint.x + (interactionDir.x * this.CURL_RADIUS),
            startPoint.y + (interactionDir.y * this.CURL_RADIUS),
            this.CURL_RADIUS
        )
    }

    _applyCurlGeometry() {
        this._deformPageGeometry(this.coverFrontGeometry, this.coverFrontBasePositions, this.PAGE_THICKNESS * 0.5)
        this._deformPageGeometry(this.coverBackGeometry, this.coverBackBasePositions, -this.PAGE_THICKNESS * 0.5)
    }

    _deformPageGeometry(geometry, basePositions, thicknessOffset) {
        const positions = geometry.attributes.position.array
        const interactionDir = this.currentInteractionDir
        const curlLineDir = this.currentCurlLineDir
        const startPoint = this.currentStartPoint

        for (let i = 0; i < positions.length; i += 3) {
            const baseX = basePositions[i + 0]
            const baseY = basePositions[i + 1]
            const localX = baseX - startPoint.x
            const localY = baseY - startPoint.y

            const alongCurl = (localX * interactionDir.x) + (localY * interactionDir.y)
            const alongLine = (localX * curlLineDir.x) + (localY * curlLineDir.y)

            let finalX = baseX
            let finalY = baseY
            let finalZ = thicknessOffset

            const maxCurlDistance = this.CURL_RADIUS * this.MAX_CURL_ANGLE

            if (alongCurl > 0 && this.interactionBlend > 0.0001) {
                const curlDistance = Math.min(alongCurl, maxCurlDistance) * this.interactionBlend
                const curlAngle = curlDistance / this.CURL_RADIUS
                const curledOffset = Math.sin(curlAngle) * this.CURL_RADIUS
                const liftedOffset = (1 - Math.cos(curlAngle)) * this.CURL_RADIUS
                const tailOffset = Math.max(0, alongCurl - maxCurlDistance)

                finalX = startPoint.x + (curlLineDir.x * alongLine) + (interactionDir.x * (curledOffset - tailOffset * 0.2))
                finalY = startPoint.y + (curlLineDir.y * alongLine) + (interactionDir.y * (curledOffset - tailOffset * 0.2))
                finalZ = liftedOffset + thicknessOffset + (tailOffset * 0.35)
            }

            if (baseX <= (-this.PAGE_WIDTH * 0.5) + 0.001) {
                finalX = baseX
                finalY = baseY
                finalZ = thicknessOffset
            }

            positions[i + 0] = finalX
            positions[i + 1] = finalY
            positions[i + 2] = finalZ
        }

        geometry.attributes.position.needsUpdate = true
        geometry.computeVertexNormals()
    }

    _updateHelpers() {
        const helperVisible = this.interactionBlend > 0.001 || this.pointerInsideArea
        const lineHalfLength = Math.max(this.PAGE_WIDTH, this.PAGE_HEIGHT) * 0.9
        const curlStartA = new THREE.Vector3(
            this.currentStartPoint.x + (this.currentCurlLineDir.x * lineHalfLength),
            this.currentStartPoint.y + (this.currentCurlLineDir.y * lineHalfLength),
            0
        )
        const curlStartB = new THREE.Vector3(
            this.currentStartPoint.x - (this.currentCurlLineDir.x * lineHalfLength),
            this.currentStartPoint.y - (this.currentCurlLineDir.y * lineHalfLength),
            0
        )
        const axisA = new THREE.Vector3(
            this.currentAxisPoint.x + (this.currentCurlLineDir.x * lineHalfLength),
            this.currentAxisPoint.y + (this.currentCurlLineDir.y * lineHalfLength),
            this.currentAxisPoint.z
        )
        const axisB = new THREE.Vector3(
            this.currentAxisPoint.x - (this.currentCurlLineDir.x * lineHalfLength),
            this.currentAxisPoint.y - (this.currentCurlLineDir.y * lineHalfLength),
            this.currentAxisPoint.z
        )

        this.originHelper.position.set(this.originPoint.x, this.originPoint.y, 0)
        this.mouseHelper.position.set(this.currentMousePoint.x, this.currentMousePoint.y, 0)
        this.curlStartPointHelper.position.set(this.currentStartPoint.x, this.currentStartPoint.y, 0)
        this.axisPointHelper.position.copy(this.currentAxisPoint)

        this._setLinePoints(this.interactionLineHelper, [
            new THREE.Vector3(this.originPoint.x, this.originPoint.y, 0),
            new THREE.Vector3(this.currentMousePoint.x, this.currentMousePoint.y, 0)
        ])
        this._setLinePoints(this.curlStartLineHelper, [curlStartA, curlStartB])
        this._setLinePoints(this.curlAxisLineHelper, [axisA, axisB])

        this.mouseHelper.visible = helperVisible
        this.curlStartPointHelper.visible = helperVisible
        this.axisPointHelper.visible = helperVisible
        this.interactionLineHelper.visible = helperVisible
        this.curlStartLineHelper.visible = helperVisible
        this.curlAxisLineHelper.visible = helperVisible
    }

    _setupPointerInteraction() {
        const target = this.app.$mouseEvents || this.app.$container

        if (!target) {
            return
        }

        target.addEventListener('pointermove', this._onPointerMove = (event) => {
            const localPoint = this._getPointerInStageSpace(event, target)
            const isInsideArea = this._isInsideInteractionArea(localPoint)

            this.pointerInsideArea = isInsideArea

            if (isInsideArea) {
                this.mouseTarget.copy(localPoint)
            } else {
                this.mouseTarget.copy(this.mouseRest)
            }
        })

        const deactivatePointer = () => {
            this.pointerInsideArea = false
            this.mouseTarget.copy(this.mouseRest)
        }

        target.addEventListener('pointerleave', this._onPointerLeave = deactivatePointer)
        target.addEventListener('pointercancel', this._onPointerCancel = deactivatePointer)
    }

    _getPointerInStageSpace(event, target) {
        const rect = target.getBoundingClientRect()
        const localX = event.clientX - rect.left
        const localY = event.clientY - rect.top

        return new THREE.Vector2(
            ((localX / rect.width) - 0.5) * this.app.size.REF.width,
            (0.5 - (localY / rect.height)) * this.app.size.REF.height
        )
    }

    _isInsideInteractionArea(point) {
        return (
            point.x >= this.interactionArea.minX &&
            point.x <= this.interactionArea.maxX &&
            point.y >= this.interactionArea.minY &&
            point.y <= this.interactionArea.maxY
        )
    }
}

export default E26004_PageCurlGPU
