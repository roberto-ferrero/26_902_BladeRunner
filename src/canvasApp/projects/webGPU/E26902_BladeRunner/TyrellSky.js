import { BackSide, Color, CylinderGeometry, Mesh, Vector3 } from 'three'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { Fn, texture, uniform, positionWorld, cameraWorldMatrix, vec2, vec4, renderGroup, atan, select, mix } from 'three/tsl'

export function cylinderCoverage(source, { radius = 1200, centerY = 80, aspect = 2.4, marginDegrees = 3 } = {}, imageAspect = 2) {
    if (!source) throw new Error('Falta Camera_D para calcular el cielo cilíndrico.')
    source.updateWorldMatrix(true, false)
    const camera = source.clone(false)
    source.getWorldPosition(camera.position); source.getWorldQuaternion(camera.quaternion)
    camera.scale.set(1, 1, 1); camera.aspect = aspect
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
    let halfArc = 0, halfHeight = 0
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
        const ray = new Vector3(x, y, 0.5).unproject(camera).sub(camera.position).normalize()
        const p = camera.position, a = ray.x ** 2 + ray.z ** 2
        const b = p.x * ray.x + p.z * ray.z
        const c = p.x ** 2 + p.z ** 2 - radius ** 2
        const t = (-b + Math.sqrt(b * b - a * c)) / a
        const hit = p.clone().addScaledVector(ray, t)
        halfArc = Math.max(halfArc, Math.abs(Math.atan2(hit.x, -hit.z)))
        halfHeight = Math.max(halfHeight, Math.abs(hit.y - centerY))
    }
    halfArc = Math.min(Math.PI, halfArc + marginDegrees * Math.PI / 180)
    return { radius, centerY, halfArc, arc: halfArc * 2,
        height: Math.max(radius * halfArc * 2 / imageAspect, halfHeight * 2 + 100),
        referenceCamera: source.name, aspect }
}

// Single inward-facing cylindrical section; the original plane is only used for comparison/probes.
export default class TyrellSky {
    constructor(scene, originalSky, panorama, options) {
        this.scene = scene; this.originalSky = originalSky; this.panorama = panorama
        this.previous = scene.backgroundNode
        this.originalVisible = originalSky.visible
        this.enabled = true; this.studio = false
        this.radialCenter = uniform(new Vector3(0, 0, -1))
        this.radialStart = uniform(0)
        this.radialEnd = uniform(1)
        this.radialStrength = uniform(0)
        this.radialBoostEnd = uniform(1)
        this.radialBoost = uniform(0)
        this.radialIntensity = uniform(1)
        this.setRadialIntensity(options.radialIntensity ?? 1)
        this.options = options
        this.coverage = cylinderCoverage(options.camera, options, panorama.image.width / panorama.image.height)
        const radiance = uniform(new Color()).setGroup(renderGroup).onRenderUpdate(() => originalSky.material.emissive)
        const sky = texture(panorama)
        this.cityFusion = uniform(0)
        this.setCityFusion(options.city?.fusionDegrees ?? 4.7)
        const cityColor = ray => {
            // Distant city photo by viewing angle: its own alpha ramp (rows fadeStart..horizon) spans from the
            // horizon up to the fusion height, the lit city below keeps the photo's pixel aspect.
            const { rows, depthDegrees } = options.city, image = options.cityTexture.image
            const radiansPerRow = depthDegrees * Math.PI / 180 / (rows.height - rows.horizon)
            const elevation = ray.y.clamp(-1, 1).asin()
            const above = elevation.div(this.cityFusion.max(1e-4)).mul(rows.horizon - rows.fadeStart)
            const row = select(elevation.greaterThanEqual(0), above.negate(), elevation.negate().div(radiansPerRow)).add(rows.horizon)
            const u = atan(ray.x, ray.z.negate()).div(radiansPerRow * image.width).add(.5)
            return texture(options.cityTexture, vec2(u, row.div(rows.height).oneMinus().clamp(0, 1)))
        }
        this.node = Fn(() => {
            const ray = positionWorld.sub(cameraWorldMatrix.element(3).xyz).normalize()
            // Angular distance in world space keeps the gradient fixed when the viewer turns.
            const distance = ray.dot(this.radialCenter).clamp(-1, 1).acos()
            const darkening = distance.smoothstep(this.radialStart, this.radialEnd).mul(this.radialStrength)
            const extraDarkening = distance.smoothstep(this.radialStart, this.radialBoostEnd).mul(this.radialBoost)
            const attenuation = darkening.oneMinus().mul(extraDarkening.oneMinus()).pow(this.radialIntensity)
            let rgb = sky.rgb
            if (options.cityTexture) { const city = cityColor(ray); rgb = mix(rgb, city.rgb, city.a) }
            return vec4(rgb.mul(radiance).mul(attenuation), 1)
        })()
        const { radius, height, halfArc, arc, centerY } = this.coverage
        const geometry = new CylinderGeometry(radius, radius, height, options.segments || 192, 1, true, Math.PI - halfArc, arc)
        // CylinderGeometry runs right to left when viewed from inside the front section.
        const uv = geometry.attributes.uv
        for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i))
        const material = new MeshBasicNodeMaterial({ side: BackSide, depthWrite: false, fog: false })
        material.colorNode = this.node
        this.mesh = new Mesh(geometry, material)
        this.mesh.name = 'Tyrell / cielo cilíndrico'
        this.mesh.position.y = centerY
        this.setHeightScale(options.heightScale ?? 1)
        this.mesh.renderOrder = -1000
        scene.add(this.mesh)
        this.apply()
    }
    configureRadialDarkening(referenceCamera, sunDisc, aspect, leftReferenceCamera) {
        if (!referenceCamera || !sunDisc) return
        referenceCamera.updateWorldMatrix(true, false)
        const camera = referenceCamera.clone(false)
        referenceCamera.getWorldPosition(camera.position)
        referenceCamera.getWorldQuaternion(camera.quaternion)
        camera.scale.set(1, 1, 1)
        camera.aspect = aspect
        camera.updateProjectionMatrix()
        camera.updateMatrixWorld(true)
        const sun = sunDisc.getWorldPosition(new Vector3())
        const center = sun.clone().sub(camera.position).normalize()
        const solarHeight = sun.clone().project(camera).y
        const edgeAngles = [-1, 1].map(x => new Vector3(x, solarHeight, 0.5)
            .unproject(camera).sub(camera.position).normalize().angleTo(center))
        // A circular gradient starts at the nearer horizontal edge when the sun is off-centre.
        const start = Math.min(...edgeAngles)
        this.radialCenter.value.copy(center)
        this.radialStart.value = start
        this.radialEnd.value = Math.min(Math.PI, start + Math.PI / 4)
        this.radialStrength.value = 0.75
        this.radialBoost.value = 0
        if (leftReferenceCamera) {
            leftReferenceCamera.updateWorldMatrix(true, false)
            const leftCamera = leftReferenceCamera.clone(false)
            leftReferenceCamera.getWorldPosition(leftCamera.position)
            leftReferenceCamera.getWorldQuaternion(leftCamera.quaternion)
            leftCamera.scale.set(1, 1, 1)
            leftCamera.aspect = aspect
            leftCamera.updateProjectionMatrix()
            leftCamera.updateMatrixWorld(true)
            // Upper-left sky in CAM02: reach one third of the previous linear radiance.
            const leftRay = new Vector3(-0.9, 0.5, 0.5).unproject(leftCamera).sub(leftCamera.position).normalize()
            this.radialBoostEnd.value = Math.max(start + 0.001, leftRay.angleTo(center))
            this.radialBoost.value = 2 / 3
        }
    }
    setHeightScale(value) {
        if (!Number.isFinite(value)) return
        this.heightScale = Math.max(0.1, Math.min(2, value))
        this.mesh.scale.y = this.heightScale
        this.mesh.updateMatrixWorld(true)
    }
    // Height above the horizon (degrees) where the city photo has faded completely into the sky.
    setCityFusion(degrees) {
        if (!Number.isFinite(degrees)) return
        this.cityFusionDegrees = Math.max(.5, Math.min(20, degrees))
        this.cityFusion.value = this.cityFusionDegrees * Math.PI / 180
    }
    setRadialIntensity(value) {
        if (Number.isFinite(value)) this.radialIntensity.value = Math.max(0, Math.min(3, value))
    }
    setEnabled(enabled) { this.enabled = Boolean(enabled); this.apply() }
    setStudio(studio) { this.studio = studio; this.apply() }
    apply() {
        this.scene.backgroundNode = this.previous
        this.mesh.visible = this.enabled && !this.studio
        this.originalSky.visible = this.originalVisible && !this.enabled && !this.studio
    }
    withOriginalBackground(callback) {
        const current = this.scene.backgroundNode, visible = this.originalSky.visible, cylinderVisible = this.mesh.visible
        this.mesh.visible = false
        this.scene.backgroundNode = this.previous
        this.originalSky.visible = this.originalVisible && !this.studio
        try { return callback() } finally { this.scene.backgroundNode = current; this.originalSky.visible = visible; this.mesh.visible = cylinderVisible }
    }
    diagnostics() { return { enabled: this.enabled, studio: this.studio, projection: 'cylinder', version: 5, ...this.coverage, heightScale: this.heightScale, cityFusionDegrees: this.cityFusionDegrees, city: this.options.city?.texture || null, effectiveHeight: this.coverage.height * this.heightScale, arcDegrees: this.coverage.arc * 180 / Math.PI, originalProjection: false, originalPlaneVisible: this.originalSky.visible, source: this.options.texture, size: [this.panorama.image.width, this.panorama.image.height], visualOnly: true, probeUsesOriginalBackground: true } }
    dispose() { this.scene.backgroundNode = this.previous; this.originalSky.visible = this.originalVisible; this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.node.dispose(); this.panorama.dispose() }
}
