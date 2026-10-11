import { BoxGeometry, BufferAttribute, Color, DataTexture, Group, Mesh, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType, LinearFilter, LinearMipmapLinearFilter, Vector2, Vector3 } from 'three'
import { MeshPhysicalNodeMaterial } from 'three/webgpu'
import { attribute, normalWorld, output, renderGroup, uniform, vec3, vec4, vertexStage, sRGBTransferEOTF } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createCityRoof, CITY_ROOF } from './TyrellCityRoof'

export const CITY_FINISH = Object.freeze({
    baseColor: '#43311d', baseHSL: [31.4, 38.9, 18.8], facadeDepth: 18,
    gradientCenterX: -49.2357, pyramidZ: -264.7806, blockSpacing: 27,
    baseColorMultiplier: 1, roofColorMultiplier: 1, towerColorMultiplier: 1,
    leftTowerLightnessOffset: 2,
    roughness: 1, metalness: 0, specularIntensity: 0, envMapIntensity: 0
})

export const CITY_COLOR_DEFAULTS = Object.freeze({ h: 31.4, s: 38.9, l: 18.8,
    cameraD: 14, cam02: 14.6, rightStep: -.3, leftStep: -1.3, mode: 'lod' })
export const wrapYaw = angle => Math.atan2(Math.sin(angle), Math.cos(angle))
export function yawLuminance(yaw, anchors) {
    // Interpolate around the full circle, including the seam behind the viewer.
    const sorted = anchors.map(([angle, value]) => [wrapYaw(angle), value]).sort((a, b) => a[0] - b[0])
    const angle = wrapYaw(yaw)
    for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i], b = i + 1 < sorted.length ? sorted[i + 1] : [sorted[0][0] + Math.PI * 2, sorted[0][1]]
        const x = angle < sorted[0][0] ? angle + Math.PI * 2 : angle
        if (x >= a[0] && x <= b[0]) {
            const t = Math.max(0, Math.min(1, (x - a[0]) / Math.max(1e-8, b[0] - a[0])))
            return a[1] + (b[1] - a[1]) * t * t * (3 - 2 * t)
        }
    }
    return sorted[0][1]
}

export function cityBlockSteps(x, spacing = CITY_FINISH.blockSpacing) {
    return Math.round((x - CITY_FINISH.gradientCenterX) / spacing)
}

// Deterministic architecture, in world metres. No lights: reserved for phase 9.2.
export function createCityTexture() {
    const size = 256, pixels = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const panel = (x % 64 < 2 || y % 32 < 2)
        const recess = x % 16 > 4 && x % 16 < 12 && y % 32 > 9 && y % 32 < 17
        const noise = ((x * 17 + y * 71 + (x ^ y) * 13) % 19) - 9
        const value = (panel ? 104 : recess ? 130 : 196) + noise
        const i = (y * size + x) * 4
        pixels[i] = value; pixels[i + 1] = value; pixels[i + 2] = value; pixels[i + 3] = 255
    }
    const texture = new DataTexture(pixels, size, size, RGBAFormat, UnsignedByteType)
    texture.name = 'City / unlit panel and service recesses'
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.generateMipmaps = true
    texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter
    texture.needsUpdate = true
    return texture
}

export default class TyrellCity {
    constructor(world) {
        this.group = new Group()
        this.group.name = 'Tyrell / lower city 9.1'
        this.texture = createCityTexture()
        this.colorSettings = { ...CITY_COLOR_DEFAULTS }
        this.colorLOD = { 'Extra baja': true, Baja: true, Media: true, Alta: true, UltraAlta: true }
        this.quality = 'Baja'
        this.hueBasis = uniform(new Vector3()).setGroup(renderGroup)
        this.lightness = uniform(.188).setGroup(renderGroup)
        this.slopes = uniform(new Vector2(-.001, -.002)).setGroup(renderGroup)
        this.direction = new Vector3()
        this.referenceYaw = 0
        this.anchorYaw = { cameraD: Math.PI / 3, cam02: -Math.PI / 3 }
        this.setColorHSL(CITY_COLOR_DEFAULTS)
        this.materials = [
            ['terraces', CITY_FINISH.baseColor], ['stonework', CITY_FINISH.baseColor], ['service recesses', '#30251a']
        ].map(([name, color]) => {
            const { roughness, metalness, specularIntensity, envMapIntensity } = CITY_FINISH
            const material = new MeshPhysicalNodeMaterial({ color, roughness, metalness, specularIntensity, envMapIntensity, map: this.texture })
            material.color.multiplyScalar(CITY_FINISH.baseColorMultiplier)
            // Anchor the silhouette after atmospheric shading: fog cannot turn
            // roofs beige again. Keep a narrow range of directional relief and
            // scene illumination around the requested brown, before grading.
            // Window emission is added separately by TyrellBuildingLights.
            const relief = normalWorld.dot(vec3(.36, .8, .48)).mul(.07)
                .add(output.rgb.clamp(0, 1).mul(.08)).add(.93)
            const ramps = attribute('tyrellCityRamps', 'vec2')
            const l = this.lightness.add(ramps.dot(this.slopes)).clamp(0, 1)
                .add(attribute('tyrellCityLightnessOffset', 'float')).clamp(0, 1)
            // H/S are shared; HSL lightness varies per building. Convert sRGB to
            // linear once per vertex, never per fragment, with the same eight buffers.
            const srgb = vec3(l).add(this.hueBasis.mul(l.min(l.oneMinus())))
            const blockColor = vertexStage(sRGBTransferEOTF(srgb)).mul(name === 'service recesses' ? .93 : 1)
            material.outputNode = vec4(blockColor.mul(relief), output.a)
            material.name = 'City / ' + name
            return material
        })
        const parts = this.materials.map(() => [])
        let seed = 902091
        const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
        let boxes = 0
        const box = (x, y, z, w, h, d, material = 0) => {
            const geometry = new BoxGeometry(w, h, d)
            // World-sized UVs avoid stretched panels across different building sizes.
            const uv = geometry.attributes.uv, normals = geometry.attributes.normal, positions = geometry.attributes.position
            const panels = new Float32Array(positions.count * 4)
            for (let i = 0; i < uv.count; i++) {
                const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i))
                uv.setXY(i, (nx > .5 ? positions.getZ(i) : positions.getX(i)) / 18,
                    (ny > .5 ? positions.getZ(i) : positions.getY(i)) / 18)
                if (ny < .5 && h > 1 && (nx > .5 ? d : w) > 3) panels.set([
                    nx > .5 ? positions.getZ(i) + d / 2 : positions.getX(i) + w / 2,
                    positions.getY(i) + h / 2, nx > .5 ? d : w, h
                ], i * 4)
            }
            geometry.setAttribute('tyrellPanel', new BufferAttribute(panels, 4))
            geometry.setAttribute('tyrellCentral', new BufferAttribute(new Float32Array(positions.count), 1))
            // All modules of a building share its centre sample, including roof equipment.
            // Pack both ramps: separate buffers exceed WebGPU's default limit of eight.
            const ramps = new BufferAttribute(new Float32Array(positions.count * 2), 2)
            const steps = cityBlockSteps(x)
            for (let i = 0; i < positions.count; i++)
                ramps.setXY(i, Math.max(steps, 0), Math.max(-steps, 0))
            geometry.setAttribute('tyrellCityRamps', ramps)
            geometry.setAttribute('tyrellCityLightnessOffset', new BufferAttribute(new Float32Array(positions.count), 1))
            const tint = new Color().setScalar(.84 + random() * .22)
            geometry.setAttribute('color', new BufferAttribute(new Float32Array(positions.count * 3), 3))
            for (let i = 0; i < positions.count; i++) geometry.attributes.color.setXYZ(i, tint.r, tint.g, tint.b)
            geometry.translate(x, y, z)
            parts[material].push(geometry); boxes++
        }
        // Context buildings (near belt, mid-distance rows, distant massing) and the
        // industrial flare stacks were removed: only the pyramid v3 and its leaning
        // towers remain. What is left is the roof continuity of ?pyramid=old.
        // Local continuity on the newly exposed original roof; existing buildings
        // retain all their positions, including the previous 2.5 m lowering.
        const roof = createCityRoof(world.getObjectByName('Tyrell_Corporation_Pyramid'))
        const continuity = { roofTriangles: 0, serviceBlocks: 0 }
        if (roof) {
            const ramps = new BufferAttribute(new Float32Array(roof.attributes.position.count * 2), 2)
            for (let i = 0; i < ramps.count; i++) {
                const x = roof.attributes.position.getX(i)
                const steps = cityBlockSteps(x)
                ramps.setXY(i, Math.max(steps, 0), Math.max(-steps, 0))
            }
            roof.setAttribute('tyrellCityRamps', ramps)
            roof.setAttribute('tyrellCityLightnessOffset', new BufferAttribute(
                new Float32Array(roof.attributes.position.count), 1))
            parts[0].push(roof)
            continuity.roofTriangles = roof.index.count / 3
            const roofY = (x, z) => (CITY_ROOF.plane - CITY_ROOF.normal[0] * x - CITY_ROOF.normal[2] * z) / CITY_ROOF.normal[1]
            for (const [z, width, depth, height] of [[-207, 5.6, 9, .65], [-237, 4.6, 12, .9], [-274, 3.8, 10, .7]]) {
                const x = 8.2 + (-207 - z) * .0489
                const y = roofY(x, z)
                box(x, y + height / 2 - .25, z, width, height + .5, depth, 0)
                box(x, y + height + .07, z, width + .2, .14, depth + .2, 1)
                box(x, y + height + .26, z, width * .7, .24, depth * .62, 2)
                continuity.serviceBlocks++
            }
        }
        parts.forEach((geometries, index) => {
            if (!geometries.length) return
            const geometry = mergeGeometries(geometries, false)
            geometries.forEach(part => part.dispose())
            // Dark matte roofing on every upward face, including cornices, tower
            // platforms and the local roof repair. Facades keep their own base tint.
            const colors = geometry.attributes.color, normals = geometry.attributes.normal
            for (let i = 0; i < colors.count; i++) if (normals.getY(i) > .65) {
                const shade = CITY_FINISH.roofColorMultiplier
                colors.setXYZ(i, colors.getX(i) * shade, colors.getY(i) * shade, colors.getZ(i) * shade)
            }
            this.materials[index].vertexColors = true
            const mesh = new Mesh(geometry, this.materials[index])
            mesh.name = 'City / ' + index
            mesh.castShadow = false; mesh.receiveShadow = false
            this.group.add(mesh)
        })
        this.stats = { buildings: 0, boxes, meshes: this.group.children.length, triangles: boxes * 12 + continuity.roofTriangles,
            towers: [], ...CITY_FINISH, continuity,
            textureSize: [256, 256], seed: 902091, cityBackdrop: 'layered geometry; no photographic background', lights: 0 }
        world.add(this.group)
    }
    setEnabled(enabled) { this.group.visible = !!enabled }
    setColorHSL(values) {
        for (const [key, min, max] of [['h', 0, 360], ['s', 0, 100], ['l', 0, 100],
            ['cameraD', 0, 100], ['cam02', 0, 100], ['rightStep', -5, 0], ['leftStep', -5, 0]]) {
            if (Number.isFinite(values?.[key])) this.colorSettings[key] = Math.max(min, Math.min(max, values[key]))
        }
        if (['lod', 'on', 'off'].includes(values?.mode)) this.colorSettings.mode = values.mode
        for (const level of Object.keys(this.colorLOD))
            if (typeof values?.lod?.[level] === 'boolean') this.colorLOD[level] = values.lod[level]
        const { h, s, l, rightStep, leftStep } = this.colorSettings
        const basis = new Color().setHSL(h / 360, s / 100, .5, SRGBColorSpace).convertLinearToSRGB()
        this.hueBasis.value.set(basis.r * 2 - 1, basis.g * 2 - 1, basis.b * 2 - 1)
        this.slopes.value.set(rightStep / 100, leftStep / 100)
        this.lightness.value = l / 100
    }
    setQuality(quality) { this.quality = quality }
    configureCameraReferences(cameras) {
        const central = cameras.find(camera => /^CAM[ _]?0?1(?:\D|$)/i.test(camera.name))
        if (central) {
            central.getWorldPosition(this.direction)
            this.referenceYaw = Math.atan2(CITY_FINISH.gradientCenterX - this.direction.x, -(CITY_FINISH.pyramidZ - this.direction.z))
        }
        for (const [key, pattern] of [['cameraD', /^(?:Camera|CAM)[ _]D(?:\W|$)/i], ['cam02', /^CAM[ _]?0?2(?:\D|$)/i]]) {
            const camera = cameras.find(item => pattern.test(item.name))
            if (camera) {
                camera.getWorldDirection(this.direction)
                this.anchorYaw[key] = wrapYaw(Math.atan2(this.direction.x, -this.direction.z) - this.referenceYaw)
            }
        }
    }
    updateCamera(camera, overrideYaw) {
        const settings = this.colorSettings
        const active = settings.mode === 'on' || settings.mode === 'lod' && this.colorLOD[this.quality]
        let lightness = settings.l
        if (active) {
            camera.getWorldDirection(this.direction)
            if (this.direction.x ** 2 + this.direction.z ** 2 > 1e-10)
                this.yaw = overrideYaw ?? wrapYaw(Math.atan2(this.direction.x, -this.direction.z) - this.referenceYaw)
            lightness = yawLuminance(this.yaw || 0, [[0, settings.l],
                [this.anchorYaw.cameraD, settings.cameraD], [this.anchorYaw.cam02, settings.cam02]])
        }
        this.angleColorActive = !!active
        const changed = Math.abs(this.lightness.value - lightness / 100) > 1e-7
        this.lightness.value = lightness / 100
        return changed
    }
    diagnostics() { return { enabled: this.group.visible, ...this.stats,
        colorHSL: this.colorSettings, colorLOD: this.colorLOD, angleColorActive: this.angleColorActive,
        yawDegrees: (this.yaw || 0) * 180 / Math.PI, effectiveLightness: this.lightness.value * 100,
        referenceYawDegrees: this.referenceYaw * 180 / Math.PI,
        anchorDegrees: Object.fromEntries(Object.entries(this.anchorYaw).map(([key, angle]) => [key, angle * 180 / Math.PI])) } }
    // Resources belong to world and are disposed once by disposeScene(world).
}


