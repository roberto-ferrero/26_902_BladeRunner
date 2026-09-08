// Compares a viewer capture against the Blender reference render region by region, so "the
// floor is too bright" becomes a number instead of an opinion.
//
//   node src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/comparar-render.mjs [--recortes]
//
// With --recortes it also writes a side-by-side sheet per region: Blender on the left, the
// current viewer in the middle, the previous phase on the right.
//
// Both images must be the same size; the comparison frame renders at 1920 x 800, which is what
// Blender rendered too. Writes docs/phase4/comparacion.json.
//
// The reference was traced in Cycles with full indirect light and a dust volume, which the viewer
// does not have. A gap is expected: what this tool gives is where the gap is and how large, not a
// pass or fail.
import fs from 'node:fs'
import path from 'node:path'
import { decodePNG, channelStats, crop, sideBySide, encodePNG, srgbToLinear, luminance } from './lib/png.mjs'
import { REGIONS } from './lib/regiones.mjs'

// Which delivery is being measured, and which one it is compared against. Passing them keeps
// the tool usable in later phases without editing it each time.
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback }
const CURRENT = arg('--fase', 'fase5')
const PREVIOUS = arg('--anterior', 'fase4')
const DOCS = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs'
const OUT = `${DOCS}/${CURRENT.replace('fase', 'phase')}/comparacion.json`
// The rectangles live in lib/regiones.mjs so this tool and comparar-indirecta.mjs cannot drift
// apart and quietly measure different things.
const SHOTS = [
    {
        camera: 'CAM 01', ...REGIONS['CAM 01'],
        current: `${DOCS}/${CURRENT.replace('fase', 'phase')}/${CURRENT}-cam01-comparacion.png`,
        baseline: `${DOCS}/${PREVIOUS.replace('fase', 'phase')}/${PREVIOUS}-cam01-comparacion.png`
    },
    {
        camera: 'CAM 02', ...REGIONS['CAM 02'],
        current: `${DOCS}/${CURRENT.replace('fase', 'phase')}/${CURRENT}-cam02-comparacion.png`,
        baseline: `${DOCS}/${PREVIOUS.replace('fase', 'phase')}/${PREVIOUS}-cam02-comparacion.png`
    }
]

const read = file => {
    if (!fs.existsSync(file)) return null
    return decodePNG(file)
}

// Display values are what the eye sees; linear luminance is what a light change moves.
function measure(image, rect) {
    const stats = channelStats(image, rect)
    const display = stats.mean.slice(0, 3)
    const linear = display.map(srgbToLinear)
    return {
        display: display.map(v => +v.toFixed(4)),
        displayLuminance: +luminance(...display).toFixed(4),
        linearLuminance: +luminance(...linear).toFixed(5),
        min: stats.min.slice(0, 3), max: stats.max.slice(0, 3)
    }
}

const CROPS = process.argv.includes('--recortes')
const CROP_SCALE = 2

const report = { generated: new Date().toISOString(), note: 'La referencia es Cycles con luz indirecta completa y volumen de polvo, que el visor no tiene. La diferencia es esperada y lo que aquí se mide es dónde está y cuánta es.', shots: [] }

for (const shot of SHOTS) {
    const reference = read(shot.reference), current = read(shot.current), baseline = read(shot.baseline)
    if (!reference || !current) {
        console.log(`${shot.camera}: falta ${!reference ? shot.reference : shot.current}`)
        continue
    }
    if (reference.width !== current.width || reference.height !== current.height) {
        throw new Error(`${shot.camera}: la referencia es ${reference.width}x${reference.height} y la captura ${current.width}x${current.height}`)
    }
    const regions = Object.entries(shot.regions).map(([name, rect]) => {
        const r = measure(reference, rect), c = measure(current, rect)
        const b = baseline ? measure(baseline, rect) : null
        const ratio = r.linearLuminance > 1e-6 ? c.linearLuminance / r.linearLuminance : null
        return {
            name, rect,
            referencia: r.displayLuminance, actual: c.displayLuminance,
            anterior: b ? b.displayLuminance : null,
            razonLineal: ratio === null ? null : +ratio.toFixed(2),
            evDeDiferencia: ratio ? +Math.log2(ratio).toFixed(2) : null,
            detalle: { referencia: r, actual: c, anterior: b }
        }
    })
    // Whole-frame agreement, as a single number to watch across phases.
    const whole = { referencia: measure(reference, null), actual: measure(current, null), anterior: baseline ? measure(baseline, null) : null }
    let sum = 0
    for (let i = 0; i < reference.pixels.length; i += 4) {
        for (let c = 0; c < 3; c++) sum += (reference.pixels[i + c] - current.pixels[i + c]) ** 2
    }
    whole.rmsDisplay = +Math.sqrt(sum / (reference.width * reference.height * 3)).toFixed(4)
    if (baseline) {
        let base = 0
        for (let i = 0; i < reference.pixels.length; i += 4) {
            for (let c = 0; c < 3; c++) base += (reference.pixels[i + c] - baseline.pixels[i + c]) ** 2
        }
        whole.rmsDisplayAnterior = +Math.sqrt(base / (reference.width * reference.height * 3)).toFixed(4)
    }
    if (CROPS) {
        const dir = path.join(DOCS, CURRENT.replace('fase', 'phase'), 'recortes')
        fs.mkdirSync(dir, { recursive: true })
        for (const [name, rect] of Object.entries(shot.regions)) {
            const panels = [crop(reference, rect, CROP_SCALE), crop(current, rect, CROP_SCALE)]
            if (baseline) panels.push(crop(baseline, rect, CROP_SCALE))
            const slug = `${shot.camera}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            const file = path.join(dir, `${slug}.png`)
            fs.writeFileSync(file, encodePNG(sideBySide(panels)))
            report.crops = report.crops || []
            report.crops.push({ camera: shot.camera, region: name, file, order: baseline ? ['Blender', 'visor', 'fase anterior'] : ['Blender', 'visor'] })
        }
    }
    report.shots.push({ camera: shot.camera, reference: shot.reference, current: shot.current, size: [reference.width, reference.height], whole, regions })
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(report, null, 2))

for (const shot of report.shots) {
    console.log(`\n${shot.camera}  ${shot.size.join(' x ')}`)
    console.log(`  error cuadrático medio del fotograma frente a Blender: ${shot.whole.rmsDisplay}` +
        (shot.whole.rmsDisplayAnterior !== undefined ? ` (en la fase anterior era ${shot.whole.rmsDisplayAnterior})` : ''))
    console.log(`  luminancia media del fotograma: Blender ${shot.whole.referencia.displayLuminance}, visor ${shot.whole.actual.displayLuminance}` +
        (shot.whole.anterior ? `, fase anterior ${shot.whole.anterior.displayLuminance}` : ''))
    console.log('  region                        Blender   visor  fase anterior   razon   EV')
    for (const region of shot.regions) {
        console.log(`    ${region.name.padEnd(26)}${String(region.referencia).padStart(7)}${String(region.actual).padStart(8)}${String(region.anterior ?? '-').padStart(10)}${String(region.razonLineal ?? '-').padStart(8)}${String(region.evDeDiferencia ?? '-').padStart(6)}`)
    }
}
console.log(`\nInforme: ${OUT}`)
