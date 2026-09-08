// Compares the viewer's tone mapping against Blender's own, measured rather than assumed.
//
//   "…/blender.exe" --background --factory-startup --python tools/blender/medir_agx.py -- docs/phase3
//   node src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/calibrar-color.mjs
//
// The reference renders used view transform AgX with the look "AgX - Medium High Contrast" and
// +0.1 EV. Three.js implements AgX base only, with no look, so the viewer needs the look adding
// back. This tool fits it and reports the residual instead of trusting the fit.
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

const DIR = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase3'
const OUT = path.join(DIR, 'calibracion-color.json')

// ---------------------------------------------------------------- PNG (16-bit RGB, no interlace)

function decodePNG(file) {
    const bytes = fs.readFileSync(file)
    let offset = 8, header = null
    const idat = []
    while (offset < bytes.length) {
        const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8)
        const data = bytes.subarray(offset + 8, offset + 8 + length)
        if (type === 'IHDR') header = {
            width: data.readUInt32BE(0), height: data.readUInt32BE(4),
            depth: data[8], colorType: data[9], interlace: data[12]
        }
        else if (type === 'IDAT') idat.push(data)
        else if (type === 'IEND') break
        offset += 12 + length
    }
    if (header.interlace !== 0) throw new Error(`${file}: entrelazado no soportado`)
    const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header.colorType]
    const bpp = channels * (header.depth / 8)
    const stride = header.width * bpp
    const raw = zlib.inflateSync(Buffer.concat(idat))
    const out = Buffer.alloc(header.height * stride)
    let previous = Buffer.alloc(stride)
    for (let y = 0; y < header.height; y++) {
        const filter = raw[y * (stride + 1)]
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
        const row = out.subarray(y * stride, (y + 1) * stride)
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? row[x - bpp] : 0, b = previous[x], c = x >= bpp ? previous[x - bpp] : 0
            let value = line[x]
            if (filter === 1) value += a
            else if (filter === 2) value += b
            else if (filter === 3) value += (a + b) >> 1
            else if (filter === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
                value += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
            }
            row[x] = value & 0xff
        }
        previous = row
    }
    const maximum = header.depth === 16 ? 65535 : 255
    const samples = new Float64Array(header.width * header.height * channels)
    for (let i = 0; i < samples.length; i++) {
        samples[i] = header.depth === 16 ? out.readUInt16BE(i * 2) / maximum : out[i] / maximum
    }
    return { ...header, channels, samples }
}

// ---------------------------------------------------------------- Three.js AgX, scalar form

// Every matrix in Three's AgX chain preserves grey (each row sums to 1), so for a grey ramp the
// whole transform collapses to this scalar function. Values copied from
// three/src/nodes/display/ToneMappingFunctions.js. Unchanged between r182 and r185.
const AGX_MIN_EV = -12.47393, AGX_MAX_EV = 4.026069
const clamp01 = v => Math.min(1, Math.max(0, v))
function agxSigmoid(x) {
    const x2 = x * x, x4 = x2 * x2
    return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232
}
// look(t) is applied where OCIO applies it: on the normalised log value, before the sigmoid.
function agxScalar(linear, exposure = 1, look = t => t) {
    const value = Math.max(linear * exposure, 1e-10)
    const normalised = clamp01((Math.log2(value) - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV))
    const shaped = agxSigmoid(clamp01(look(normalised)))
    return clamp01(Math.pow(Math.max(0, shaped), 2.2))
}
const srgbEncode = v => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
const contrastLook = (contrast, pivot) => t => (t - pivot) * contrast + pivot

// ---------------------------------------------------------------- measurement

const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'rampa_meta.json'), 'utf8'))
const { samples: N, minEV, maxEV } = meta
const linear = Array.from({ length: N }, (_, i) => 2 ** (minEV + i * (maxEV - minEV) / (N - 1)))

const ramp = name => {
    const png = decodePNG(path.join(DIR, name))
    if (png.width !== N) throw new Error(`${name}: ${png.width} muestras, se esperaban ${N}`)
    // Grey in, grey out: take the red channel and record the channel spread as a sanity check.
    const red = [], spread = []
    for (let i = 0; i < N; i++) {
        const r = png.samples[i * png.channels], g = png.samples[i * png.channels + 1], b = png.samples[i * png.channels + 2]
        red.push(r)
        spread.push(Math.max(r, g, b) - Math.min(r, g, b))
    }
    return { red, maxChannelSpread: Math.max(...spread) }
}

const measured = {
    standard: ramp('rampa_Standard_None.png'),
    agxNone: ramp('rampa_AgX_None.png'),
    agxBase: ramp('rampa_AgX_AgX_Base_Contrast.png'),
    agxMediumHigh: ramp('rampa_AgX_AgX_Medium_High_Contrast.png')
}

const stats = (a, b) => {
    let sum = 0, worst = 0, worstAt = 0
    for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i])
        sum += d * d
        if (d > worst) { worst = d; worstAt = i }
    }
    return {
        rms: +Math.sqrt(sum / a.length).toFixed(5), max: +worst.toFixed(5),
        maxAtEV: +(minEV + worstAt * (maxEV - minEV) / (N - 1)).toFixed(2)
    }
}

const report = { generated: new Date().toISOString(), blender: meta.blender, samples: N, evRange: [minEV, maxEV], checks: {} }

// Harness check: "Standard" must be the plain sRGB transfer function.
report.checks.harness = {
    note: 'Si la vista Standard no coincide con la curva sRGB, el banco de medida no es fiable y el resto sobra.',
    ...stats(measured.standard.red, linear.map(v => srgbEncode(clamp01(v)))),
    greyStaysGrey: +measured.standard.maxChannelSpread.toFixed(5)
}

// Does Three's AgX match Blender's AgX with no look?
report.checks.agxBaseVsThree = {
    note: 'Three.js implementa AgX base con una aproximación polinómica del sigmoide; Blender usa su LUT. Ésta es la diferencia que queda aunque el look se reproduzca perfecto.',
    ...stats(measured.agxNone.red, linear.map(v => srgbEncode(agxScalar(v))))
}
report.checks.blenderLookSpread = {
    note: 'Cuánto cambia la imagen el look que usó el render de referencia, frente a no usar ninguno.',
    mediumHighVsNone: stats(measured.agxMediumHigh.red, measured.agxNone.red),
    baseContrastVsNone: stats(measured.agxBase.red, measured.agxNone.red)
}

// Fit contrast and pivot in Three's normalised log space against the measured curve.
function fit(target, contrasts, pivots) {
    let best = null
    for (const contrast of contrasts) for (const pivot of pivots) {
        const curve = linear.map(v => srgbEncode(agxScalar(v, 1, contrastLook(contrast, pivot))))
        const error = stats(target, curve)
        if (!best || error.rms < best.error.rms) best = { contrast, pivot, error }
    }
    return best
}
const coarse = fit(measured.agxMediumHigh.red,
    Array.from({ length: 61 }, (_, i) => 0.8 + i * 0.02),
    Array.from({ length: 81 }, (_, i) => 0.1 + i * 0.01))
const fine = fit(measured.agxMediumHigh.red,
    Array.from({ length: 41 }, (_, i) => coarse.contrast - 0.02 + i * 0.001),
    Array.from({ length: 41 }, (_, i) => coarse.pivot - 0.01 + i * 0.0005))

report.checks.lookFit = {
    note: 'Contraste y pivote que mejor reproducen "AgX - Medium High Contrast" cuando se insertan en el AgX de Three.js, sobre el valor logarítmico normalizado y antes del sigmoide.',
    contrast: +fine.contrast.toFixed(4), pivot: +fine.pivot.toFixed(4),
    residual: fine.error,
    withoutLook: stats(measured.agxMediumHigh.red, linear.map(v => srgbEncode(agxScalar(v))))
}

// Blender's reference renders also carried +0.1 EV.
report.checks.exposure = {
    note: 'Los renders de referencia se hicieron con exposición +0,1 EV en Blender, que es el factor lineal que debe llevar el visor.',
    blenderEV: 0.1, linearFactor: +(2 ** 0.1).toFixed(4), configured: 1.07
}

// A short table for the write-up: display value at useful stops.
report.curve = [-8, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3].map(ev => {
    const index = Math.round((ev - minEV) / (maxEV - minEV) * (N - 1))
    return {
        ev, linear: +(2 ** ev).toFixed(5),
        blenderMediumHigh: +measured.agxMediumHigh.red[index].toFixed(4),
        blenderNoLook: +measured.agxNone.red[index].toFixed(4),
        threeAgX: +srgbEncode(agxScalar(2 ** ev)).toFixed(4),
        threeAgXWithFittedLook: +srgbEncode(agxScalar(2 ** ev, 1, contrastLook(fine.contrast, fine.pivot))).toFixed(4)
    }
})

fs.writeFileSync(OUT, JSON.stringify(report, null, 2))
const c = report.checks
console.log(`Blender ${report.blender} · ${N} muestras de ${minEV} a ${maxEV} EV`)
console.log(`Banco: Standard frente a sRGB puro, RMS ${c.harness.rms}, max ${c.harness.max}; gris sigue gris dentro de ${c.harness.greyStaysGrey}`)
console.log(`AgX de Three frente a AgX de Blender sin look: RMS ${c.agxBaseVsThree.rms}, max ${c.agxBaseVsThree.max} en ${c.agxBaseVsThree.maxAtEV} EV`)
console.log(`El look del render cambia la imagen: RMS ${c.blenderLookSpread.mediumHighVsNone.rms}, max ${c.blenderLookSpread.mediumHighVsNone.max}`)
console.log(`Ajuste del look: contraste ${c.lookFit.contrast}, pivote ${c.lookFit.pivot}`)
console.log(`  residuo con look ajustado: RMS ${c.lookFit.residual.rms}, max ${c.lookFit.residual.max}`)
console.log(`  residuo sin look:          RMS ${c.lookFit.withoutLook.rms}, max ${c.lookFit.withoutLook.max}`)
console.log('\n  EV    lineal   Blender    Three   Three+look')
for (const row of report.curve) {
    console.log(`  ${String(row.ev).padStart(3)}  ${row.linear.toFixed(4).padStart(8)}   ${row.blenderMediumHigh.toFixed(4)}   ${row.threeAgX.toFixed(4)}   ${row.threeAgXWithFittedLook.toFixed(4)}`)
}
console.log(`\nInforme: ${OUT}`)
