// Phase 3 checks: the tone curve, the maps the materials rely on, and the sharing rules.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { decodePNG, channelStats, srgbToLinear, luminance, encodePNG, crop, sideBySide } from '../tools/lib/png.mjs'
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

// The shader module pulls in TSL, which needs a GPU context; only the scalar twin is exercised
// here, and it is written from the same constants as the shader body.
const AGX_MIN_EV = -12.47393, AGX_MAX_EV = 4.026069
const clamp01 = v => Math.min(1, Math.max(0, v))
function agxScalar(linear, exposure = 1, look = null) {
    const value = Math.max(linear * exposure, 1e-10)
    let t = clamp01((Math.log2(value) - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV))
    if (look) t = clamp01((t - look.pivot) * look.contrast + look.pivot)
    const t2 = t * t, t4 = t2 * t2
    const shaped = 15.5 * t4 * t2 - 40.14 * t4 * t + 31.96 * t4 - 6.868 * t2 * t + 0.4298 * t2 + 0.1191 * t - 0.00232
    return clamp01(Math.pow(Math.max(0, shaped), 2.2))
}
const srgbEncode = v => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055

test('Exposure matches the +0,1 EV the reference renders were made with', () => {
    assert.ok(Math.abs(TYRELL.exposure - 2 ** 0.1) < 0.0005, `exposición ${TYRELL.exposure}`)
})

test('The look is the identity at contrast 1 and closes the shadows at the configured value', () => {
    const { contrast, pivot } = TYRELL.look
    for (const ev of [-8, -4, 0, 2]) {
        const plain = agxScalar(2 ** ev)
        assert.equal(agxScalar(2 ** ev, 1, { contrast: 1, pivot }), plain, `contraste 1 debe ser la identidad en ${ev} EV`)
    }
    // Below the pivot the look must darken, above it must brighten; that is what contrast means.
    assert.ok(agxScalar(2 ** -6, 1, { contrast, pivot }) < agxScalar(2 ** -6), 'las sombras deben cerrarse')
    assert.ok(agxScalar(2 ** 2, 1, { contrast, pivot }) > agxScalar(2 ** 2), 'las altas deben abrirse')
    assert.ok(contrast > 1, 'un look de más contraste exige un factor mayor que 1')
})

test('The fitted look tracks the measured Blender ramp better than stock AgX', () => {
    const dir = path.join(root, 'docs/phase3')
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'rampa_meta.json'), 'utf8'))
    const png = decodePNG(path.join(dir, 'rampa_AgX_AgX_Medium_High_Contrast.png'))
    assert.equal(png.width, meta.samples)
    const { samples: N, minEV, maxEV } = meta
    let withLook = 0, without = 0
    for (let i = 0; i < N; i++) {
        const linear = 2 ** (minEV + i * (maxEV - minEV) / (N - 1))
        const target = png.pixels[i * 4]
        withLook += (target - srgbEncode(agxScalar(linear, 1, TYRELL.look))) ** 2
        without += (target - srgbEncode(agxScalar(linear))) ** 2
    }
    const rmsWith = Math.sqrt(withLook / N), rmsWithout = Math.sqrt(without / N)
    assert.ok(rmsWith < rmsWithout / 2, `con look ${rmsWith.toFixed(4)}, sin look ${rmsWithout.toFixed(4)}`)
    assert.ok(rmsWith < 0.015, `el residuo con look debe seguir siendo pequeño: ${rmsWith.toFixed(4)}`)
})

test('Colour maps and data maps never share an image', () => {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase3/materiales.json'), 'utf8'))
    for (const image of report.images) {
        assert.ok(!(image.roles.includes('srgb') && image.roles.includes('data')),
            `la imagen ${image.index} alimenta color y datos a la vez`)
    }
    assert.equal(report.summary.mipmapped, report.summary.textures, 'todas las texturas deben pedir mipmaps')
    assert.equal(report.summary.unusedTextures, 0)
})

test('The floor is authored as dark polished stone, so its brightness comes from the light', () => {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase3/materiales.json'), 'utf8'))
    const floor = report.materials.find(m => m.name === 'PBR | Piedra negra pulida')
    assert.ok(floor.nodes.filter(n => n.startsWith('Pavimento')).length >= 21, 'debe cubrir todos los sectores')
    const base = report.images.find(i => i.usedByTextures.includes(
        floor.textures.find(t => t.slot === 'baseColorTexture').texture))
    assert.ok(base.content.meanLuminanceLinear < 0.01,
        `el albedo del pavimento debe ser oscuro y es ${base.content.meanLuminanceLinear}`)
    // A strong normal on a mirror floor is what makes stone look like water.
    assert.ok(floor.normalScale <= 0.1, `escala de normal ${floor.normalScale}`)
})

test('Only the glass needs a physical material, and the crystal gets a real thickness', () => {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase3/materiales.json'), 'utf8'))
    const transmissive = report.materials.filter(m => m.transmissionFactor > 0)
    assert.equal(transmissive.length, 1, 'sólo la cristalería usa transmisión')
    assert.ok(TYRELL.crystalThicknessFactor > 0, 'el GLB no trae volumen, así que el visor debe dar grosor')
    const capture = JSON.parse(fs.readFileSync(path.join(root, 'docs/phase3/fase3-cam02-comparacion.json'), 'utf8'))
    assert.ok(capture.crystal?.length, 'el diagnóstico debe registrar el grosor aplicado')
    for (const entry of capture.crystal) assert.ok(entry.thickness > 0, `${entry.material} sin grosor`)
})

test('The PNG helpers round-trip, since every measurement depends on them', () => {
    const width = 7, height = 5
    const pixels = new Float32Array(width * height * 4)
    for (let i = 0; i < width * height; i++) {
        pixels.set([i / (width * height), 0.5, 1 - i / (width * height), 1], i * 4)
    }
    const decoded = decodePNG(encodePNG({ width, height, pixels }))
    assert.equal(decoded.width, width)
    assert.equal(decoded.height, height)
    for (let i = 0; i < width * height * 4; i += 4) {
        assert.ok(Math.abs(decoded.pixels[i] - pixels[i]) < 1 / 255, 'el rojo debe sobrevivir al viaje')
    }
    const piece = crop(decoded, { x: 1, y: 1, width: 2, height: 2 }, 3)
    assert.deepEqual([piece.width, piece.height], [6, 6])
    const sheet = sideBySide([piece, piece], 4)
    assert.deepEqual([sheet.width, sheet.height], [16, 6])
    assert.ok(Math.abs(srgbToLinear(0.5) - 0.2140) < 1e-3)
    assert.ok(Math.abs(luminance(1, 1, 1) - 1) < 1e-6)
    assert.equal(channelStats(decoded, { x: 0, y: 0, width: 1, height: 1 }).pixels, 1)
})
