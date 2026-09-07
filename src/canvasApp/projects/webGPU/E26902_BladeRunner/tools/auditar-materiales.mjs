// Phase 3 material audit. Reads the shipped GLB and reports every material, every texture and
// the colour space each texture must be read in, so colour maps and data maps can be told apart
// without opening the model.
//
//   node src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/auditar-materiales.mjs
//
// Writes docs/phase3/materiales.json. Findings are the deliverable; the exit code is not.
import fs from 'node:fs'
import path from 'node:path'
import { decodePNG, channelStats, srgbToLinear, luminance } from './lib/png.mjs'

const GLB = 'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb'
const OUT = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase3/materiales.json'

// glTF fixes the colour space per slot: base colour and emissive are sRGB, everything else is data.
const SRGB_SLOTS = new Set(['baseColorTexture', 'emissiveTexture'])
const DATA_SLOTS = new Set(['normalTexture', 'metallicRoughnessTexture', 'occlusionTexture',
    'clearcoatTexture', 'clearcoatRoughnessTexture', 'clearcoatNormalTexture',
    'transmissionTexture', 'thicknessTexture', 'sheenRoughnessTexture', 'specularTexture'])

const bytes = fs.readFileSync(GLB)
const jsonLength = bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
let offset = 20 + jsonLength, bin = null
while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4)
    if (type === 0x004e4942) bin = bytes.subarray(offset + 8, offset + 8 + length)
    offset += 8 + length
}

// Image dimensions straight from the container header; no decoding needed.
function imageSize(index) {
    const image = gltf.images[index]
    if (image.bufferView === undefined) return { mimeType: image.mimeType, bytes: null }
    const view = gltf.bufferViews[image.bufferView]
    const data = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)
    let width = null, height = null
    if (data.readUInt32BE(0) === 0x89504e47) {
        width = data.readUInt32BE(16); height = data.readUInt32BE(20)
    } else if (data[0] === 0xff && data[1] === 0xd8) {
        let p = 2
        while (p < data.length - 9) {
            if (data[p] !== 0xff) { p++; continue }
            const marker = data[p + 1]
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                height = data.readUInt16BE(p + 5); width = data.readUInt16BE(p + 7); break
            }
            p += 2 + data.readUInt16BE(p + 2)
        }
    }
    return { mimeType: image.mimeType || (width && data.readUInt32BE(0) === 0x89504e47 ? 'image/png' : 'image/jpeg'), width, height, bytes: view.byteLength, data }
}

// What the map actually contains, which is the point of "validar los mapas".
function mapStatistics(data, roles) {
    let image
    try { image = decodePNG(data) } catch (error) { return { readable: false, reason: error.message } }
    const stats = channelStats(image)
    const result = { readable: true, mean: stats.mean.slice(0, 3), min: stats.min.slice(0, 3), max: stats.max.slice(0, 3) }
    if (roles.includes('srgb')) {
        // Albedo is judged in linear light; a "black stone" map has to be dark there, not in sRGB.
        const linear = result.mean.map(srgbToLinear)
        result.meanLinear = linear.map(v => +v.toFixed(4))
        result.meanLuminanceLinear = +luminance(...linear).toFixed(4)
    }
    return result
}

const textureUse = new Map()          // texture index -> Set of colour-space roles
const imageUse = new Map()            // image index -> Set of texture indices

function slots(material) {
    const found = []
    const pbr = material.pbrMetallicRoughness || {}
    if (pbr.baseColorTexture) found.push(['baseColorTexture', pbr.baseColorTexture])
    if (pbr.metallicRoughnessTexture) found.push(['metallicRoughnessTexture', pbr.metallicRoughnessTexture])
    if (material.normalTexture) found.push(['normalTexture', material.normalTexture])
    if (material.occlusionTexture) found.push(['occlusionTexture', material.occlusionTexture])
    if (material.emissiveTexture) found.push(['emissiveTexture', material.emissiveTexture])
    for (const [name, extension] of Object.entries(material.extensions || {})) {
        for (const [key, value] of Object.entries(extension)) {
            if (value && typeof value === 'object' && value.index !== undefined) found.push([`${name}.${key}`, value])
        }
    }
    return found
}

const report = { generated: new Date().toISOString(), source: GLB, findings: [], materials: [], textures: [], images: [] }
const finding = (severity, area, text) => report.findings.push({ severity, area, text })

// Which meshes use which material, and how many triangles they carry.
const materialMeshes = new Map()
gltf.meshes.forEach(mesh => {
    for (const primitive of mesh.primitives) {
        if (primitive.material === undefined) continue
        if (!materialMeshes.has(primitive.material)) materialMeshes.set(primitive.material, [])
        materialMeshes.get(primitive.material).push(mesh.name)
    }
})
const meshNodeNames = new Map()
gltf.nodes.forEach(node => {
    if (node.mesh === undefined) return
    if (!meshNodeNames.has(node.mesh)) meshNodeNames.set(node.mesh, [])
    meshNodeNames.get(node.mesh).push(node.name)
})
const nodesForMaterial = index => {
    const names = new Set()
    gltf.meshes.forEach((mesh, meshIndex) => {
        if (!mesh.primitives.some(p => p.material === index)) return
        for (const name of meshNodeNames.get(meshIndex) || []) names.add(name)
    })
    return [...names]
}

report.materials = gltf.materials.map((material, index) => {
    const pbr = material.pbrMetallicRoughness || {}
    const used = slots(material)
    for (const [slot, reference] of used) {
        const bare = slot.includes('.') ? slot.split('.')[1] : slot
        const role = SRGB_SLOTS.has(bare) ? 'srgb' : DATA_SLOTS.has(bare) ? 'data' : 'unknown'
        if (!textureUse.has(reference.index)) textureUse.set(reference.index, new Set())
        textureUse.get(reference.index).add(role)
    }
    const extensions = material.extensions || {}
    return {
        index, name: material.name,
        baseColorFactor: pbr.baseColorFactor || [1, 1, 1, 1],
        metallicFactor: pbr.metallicFactor ?? 1,
        roughnessFactor: pbr.roughnessFactor ?? 1,
        emissiveFactor: material.emissiveFactor || [0, 0, 0],
        emissiveStrength: extensions.KHR_materials_emissive_strength?.emissiveStrength ?? null,
        transmissionFactor: extensions.KHR_materials_transmission?.transmissionFactor ?? null,
        ior: extensions.KHR_materials_ior?.ior ?? null,
        alphaMode: material.alphaMode || 'OPAQUE',
        doubleSided: Boolean(material.doubleSided),
        normalScale: material.normalTexture?.scale ?? null,
        occlusionStrength: material.occlusionTexture?.strength ?? null,
        textures: used.map(([slot, reference]) => ({ slot, texture: reference.index, uv: reference.texCoord || 0 })),
        meshes: materialMeshes.get(index)?.length ?? 0,
        nodes: nodesForMaterial(index)
    }
})

report.textures = (gltf.textures || []).map((texture, index) => {
    const sampler = texture.sampler !== undefined ? gltf.samplers[texture.sampler] : {}
    const roles = [...(textureUse.get(index) || [])]
    if (!imageUse.has(texture.source)) imageUse.set(texture.source, new Set())
    imageUse.get(texture.source).add(index)
    return {
        index, image: texture.source, roles,
        wrapS: sampler.wrapS ?? 10497, wrapT: sampler.wrapT ?? 10497,
        magFilter: sampler.magFilter ?? null, minFilter: sampler.minFilter ?? null,
        mipmapped: [9984, 9985, 9986, 9987].includes(sampler.minFilter)
    }
})

report.images = (gltf.images || []).map((image, index) => {
    const { data, ...size } = imageSize(index)
    const textures = [...(imageUse.get(index) || [])]
    const roles = new Set()
    for (const t of textures) for (const role of report.textures[t].roles) roles.add(role)
    const slots = new Set()
    for (const material of report.materials) {
        for (const use of material.textures) if (textures.includes(use.texture)) slots.add(use.slot)
    }
    return {
        index, name: image.name || null, ...size,
        usedByTextures: textures, roles: [...roles], slots: [...slots],
        powerOfTwo: Boolean(size.width && size.height && (size.width & (size.width - 1)) === 0 && (size.height & (size.height - 1)) === 0),
        content: data ? mapStatistics(data, [...roles]) : null
    }
})

// --- findings ---------------------------------------------------------------

const mixedRole = report.images.filter(image => image.roles.includes('srgb') && image.roles.includes('data'))
if (mixedRole.length) {
    finding('alta', 'espacio de color', `${mixedRole.length} imágenes alimentan a la vez una ranura de color y una de datos: ${mixedRole.map(i => i.index).join(', ')}. Una de las dos se leería en el espacio equivocado.`)
}
const unknownRole = report.textures.filter(t => t.roles.includes('unknown'))
if (unknownRole.length) finding('media', 'espacio de color', `${unknownRole.length} texturas ocupan ranuras que este informe no clasifica.`)

const noMips = report.textures.filter(t => !t.mipmapped)
if (noMips.length) {
    finding('media', 'muestreo', `${noMips.length} de ${report.textures.length} texturas no piden mipmaps. Sin ellas, las juntas y el pavimento centellean al alejarse.`)
}
const notPowerOfTwo = report.images.filter(i => i.width && !i.powerOfTwo)
if (notPowerOfTwo.length) finding('baja', 'texturas', `${notPowerOfTwo.length} imágenes no son potencia de dos.`)

// Roughness 1 with no map only matters on a shaded surface; an emissive backdrop never uses it.
const suspiciousRoughness = report.materials.filter(m => m.roughnessFactor === 1
    && !m.textures.some(t => t.slot.includes('metallicRoughness'))
    && !m.emissiveFactor.some(v => v > 0) && !m.textures.some(t => t.slot.includes('emissive')))
if (suspiciousRoughness.length) {
    finding('media', 'rugosidad', `${suspiciousRoughness.length} materiales sombreados quedan con rugosidad 1 y sin mapa: ${suspiciousRoughness.map(m => m.name).join(', ')}.`)
}
const transmissive = report.materials.filter(m => m.transmissionFactor)
for (const material of transmissive) {
    finding('alta', 'transmision', `"${material.name}" usa KHR_materials_transmission con factor ${material.transmissionFactor} e IOR ${material.ior}. Three.js necesita que el material sea MeshPhysicalMaterial con transmisión y un objetivo de transmisión activo; comprobar cómo llega tras GLTFLoader.`)
}

report.summary = {
    materials: report.materials.length, textures: report.textures.length, images: report.images.length,
    srgbTextures: report.textures.filter(t => t.roles.includes('srgb')).length,
    dataTextures: report.textures.filter(t => t.roles.includes('data')).length,
    unusedTextures: report.textures.filter(t => t.roles.length === 0).length,
    mipmapped: report.textures.filter(t => t.mipmapped).length,
    imageBytes: report.images.reduce((n, i) => n + (i.bytes || 0), 0),
    sizes: [...new Set(report.images.filter(i => i.width).map(i => `${i.width}x${i.height}`))].sort()
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(report, null, 2))

const s = report.summary
console.log(`${s.materials} materiales · ${s.textures} texturas · ${s.images} imágenes · ${(s.imageBytes / 1e6).toFixed(1)} MB embebidos`)
console.log(`Ranuras: ${s.srgbTextures} en sRGB, ${s.dataTextures} de datos, ${s.unusedTextures} sin uso · con mipmaps ${s.mipmapped}/${s.textures}`)
console.log(`Tamaños de imagen: ${s.sizes.join(', ')}`)
const number = (value, digits = 2) => value === null || value === undefined ? '-' : Number(value).toFixed(digits)
console.log('\nMaterial                            metal  rugos  transm  emis  color base            texturas')
for (const m of report.materials) {
    const base = m.baseColorFactor.slice(0, 3).map(v => number(v, 3)).join(' ')
    console.log(`  ${m.name.padEnd(34).slice(0, 34)}${number(m.metallicFactor).padStart(5)}${number(m.roughnessFactor).padStart(7)}${number(m.transmissionFactor).padStart(8)}${number(m.emissiveStrength, 0).padStart(6)}  ${base.padEnd(20)} ${m.textures.map(t => t.slot.replace('Texture', '').replace('KHR_materials_', '')).join(', ') || 'ninguna'}`)
}
console.log(`\n${report.findings.length} hallazgos:`)
for (const f of report.findings) console.log(`  [${f.severity}] ${f.area}: ${f.text}`)
console.log(`\nInforme: ${OUT}`)
