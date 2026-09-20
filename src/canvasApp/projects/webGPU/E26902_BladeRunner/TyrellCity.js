import { BoxGeometry, BufferAttribute, Color, DataTexture, Group, Mesh, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType, LinearFilter, LinearMipmapLinearFilter } from 'three'
import { MeshPhysicalNodeMaterial } from 'three/webgpu'
import { attribute, output, vec4 } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createCityRoof, CITY_ROOF } from './TyrellCityRoof'

export const CITY_FINISH = Object.freeze({
    baseColorMultiplier: .5, roofColorMultiplier: .16, towerColorMultiplier: .16,
    roofOutputMultiplier: .5, towerOutputMultiplier: .28,
    roughness: 1, metalness: 0, specularIntensity: 0, envMapIntensity: 0
})

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
        this.materials = [
            ['terraces', '#796c58'], ['stonework', '#867660'], ['service recesses', '#423e36']
        ].map(([name, color]) => {
            const { roughness, metalness, specularIntensity, envMapIntensity } = CITY_FINISH
            const material = new MeshPhysicalNodeMaterial({ color, roughness, metalness, specularIntensity, envMapIntensity, map: this.texture })
            material.color.multiplyScalar(CITY_FINISH.baseColorMultiplier)
            // The amber fog/shafts otherwise wash out even black roofing. Apply
            // local art direction after atmospheric shading, before scene grading.
            // NodeMaterial preserves this node when window lighting clones it.
            material.outputNode = vec4(output.rgb.mul(attribute('tyrellCityTone', 'float')), output.a)
            material.name = 'City / ' + name
            return material
        })
        const parts = this.materials.map(() => [])
        let seed = 902091
        const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
        let boxes = 0, buildings = 0, towerFinish = false
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
            geometry.setAttribute('tyrellCityTone', new BufferAttribute(new Float32Array(positions.count)
                .fill(towerFinish ? CITY_FINISH.towerOutputMultiplier : 1), 1))
            const tint = new Color().setScalar(.84 + random() * .22)
            if (towerFinish) tint.multiplyScalar(CITY_FINISH.towerColorMultiplier)
            geometry.setAttribute('color', new BufferAttribute(new Float32Array(positions.count * 3), 3))
            for (let i = 0; i < positions.count; i++) geometry.attributes.color.setXYZ(i, tint.r, tint.g, tint.b)
            geometry.translate(x, y, z)
            parts[material].push(geometry); boxes++
        }
        const building = (x, z, w, d, roof, tiers = 3) => {
            buildings++
            roof -= 2.5
            const base = -88
            box(x, (base + roof - 5) / 2, z, w, roof - 5 - base, d)
            for (let tier = 0; tier < tiers; tier++) {
                const tw = w - tier * 3.2, td = d - tier * 2.8, y = roof - 5 + tier * 2
                box(x, y + .8, z, tw, 1.6, td, tier % 2)
                box(x, y + 1.7, z, tw + .6, .25, td + .6, 1)
                // Shallow facade ribs and a recessed horizontal service band.
                box(x, y + .35, z + td / 2 + .08, tw * .93, .42, .16, 2)
            }
            const top = roof - 5 + (tiers - 1) * 2 + 1.85
            // Set-back service houses, ducts and roof equipment provide silhouette.
            box(x - w * .17, top + 1.2, z - d * .12, w * .32, 2.4, d * .38, 1)
            box(x + w * .23, top + .45, z, w * .14, .9, d * .65, 2)
            for (let i = 0; i < 4; i++) box(x - w * .3 + i * w * .17, top + .35, z + d * .26, w * .1, .7, 1.8, 2)
            for (let i = 0; i < 5; i++) box(x - w * .42 + i * w * .21, roof - 10, z + d / 2 + .25, .65, 9, .6, 1)
        }
        // Near belt overlaps in depth, so camera movement cannot reveal a flat cutout edge.
        for (let i = 0; i < 22; i++) {
            const x = -300 + i * 27
            const roof = -3 + random() * 4
            building(x, -151 - random() * 16, 27 + random() * 8, 24 + random() * 12, roof, 3)
        }
        // Mid-distance city is restricted to the sides of the principal pyramid.
        for (let side of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
            const x = side < 0 ? -180 - i * 30 : 65 + i * 30
            building(x, -230 - row * 68 - random() * 15, 27 + random() * 13, 35 + random() * 20,
                -10 + random() * 8, 2 + (i % 2))
        }
        // Low distant massing instead of a city photograph with fixed perspective.
        for (let i = 0; i < 33; i++) building(-640 + i * 40, -640 - random() * 85,
            38 + random() * 18, 55 + random() * 30, -32 + random() * 17, 2)
        // Sparse industrial stacks in the lateral zones reserved in 9.0 for 9.5.
        // Their complete silhouette stays outside CAM01, including its permitted pan.
        const towers = [
            { x: 360, z: -460, top: 28 },
            { x: -680, z: -700, top: 24 },
            { x: -900, z: -830, top: 15 }
        ]
        towerFinish = true
        for (const { x, z, top } of towers) {
            box(x, -67, z, 15, 42, 15, 2)
            box(x, -43, z, 11, 6, 11, 0)
            box(x, (top - 8 - 40) / 2, z, 5.4, top - 8 + 40, 5.4, 2)
            for (let y = -34; y < top - 9; y += 12) {
                box(x, y, z, 7.4, 1, 7.4, 1)
                // Four fine uprights join the service platforms.
                for (const dx of [-3.2, 3.2]) for (const dz of [-3.2, 3.2])
                    box(x + dx, y + 4, z + dz, .35, 8, .35, 2)
            }
            box(x, top - 7, z, 8.4, 2, 8.4, 0)
            box(x, top - 3, z, 2.2, 6, 2.2, 2)
            box(x + 3.2, top - 6, z, .45, 7, .45, 2)
        }
        towerFinish = false
        // Local continuity on the newly exposed original roof; existing buildings
        // retain all their positions, including the previous 2.5 m lowering.
        const roof = createCityRoof(world.getObjectByName('Tyrell_Corporation_Pyramid'))
        const continuity = { roofTriangles: 0, serviceBlocks: 0 }
        if (roof) {
            roof.setAttribute('tyrellCityTone', new BufferAttribute(new Float32Array(roof.attributes.position.count).fill(1), 1))
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
            const geometry = mergeGeometries(geometries, false)
            geometries.forEach(part => part.dispose())
            // Dark matte roofing on every upward face, including cornices, tower
            // platforms and the local roof repair. Facades keep their own base tint.
            const colors = geometry.attributes.color, normals = geometry.attributes.normal, tone = geometry.attributes.tyrellCityTone
            for (let i = 0; i < colors.count; i++) if (normals.getY(i) > .65) {
                const shade = CITY_FINISH.roofColorMultiplier
                colors.setXYZ(i, colors.getX(i) * shade, colors.getY(i) * shade, colors.getZ(i) * shade)
                tone.setX(i, Math.min(tone.getX(i), CITY_FINISH.roofOutputMultiplier))
            }
            this.materials[index].vertexColors = true
            const mesh = new Mesh(geometry, this.materials[index])
            mesh.name = 'City / ' + index
            mesh.castShadow = false; mesh.receiveShadow = false
            this.group.add(mesh)
        })
        this.stats = { buildings, boxes, meshes: this.group.children.length, triangles: boxes * 12 + continuity.roofTriangles,
            roofLowering: 2.5, towers, ...CITY_FINISH, continuity,
            textureSize: [256, 256], seed: 902091, cityBackdrop: 'layered geometry; no photographic background', lights: 0 }
        world.add(this.group)
    }
    setEnabled(enabled) { this.group.visible = !!enabled }
    diagnostics() { return { enabled: this.group.visible, ...this.stats } }
    // Resources belong to world and are disposed once by disposeScene(world).
}


