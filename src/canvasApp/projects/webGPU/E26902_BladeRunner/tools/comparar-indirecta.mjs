// Ranks the indirect-lighting options against the Blender reference, which is what the plan asks
// for before choosing one: "comparar soluciones de iluminación indirecta".
//
//   for each mode: npm run tyrell:capture -- --indirect <modo> --out docs/phase4/indirecta --prefix ind-<modo>
//   node src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/comparar-indirecta.mjs
//
// Writes docs/phase4/indirecta.json and a contact sheet per region. Blender path-traces the
// bounces and none of these options can; the point is to see which comes closest and where each
// one fails, not to declare a winner on one number.
import fs from 'node:fs'
import path from 'node:path'
import { decodePNG, channelStats, crop, sideBySide, encodePNG, srgbToLinear, luminance } from './lib/png.mjs'
import { REGIONS, SHADOWED } from './lib/regiones.mjs'

const DIR = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase4/indirecta'
const OUT = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase4/indirecta.json'
const MODES = ['ninguna', 'ambiente', 'mundo', 'escena']
const SLUG = { 'CAM 01': 'cam01', 'CAM 02': 'cam02' }

const measure = (image, rect) => {
    const mean = channelStats(image, rect).mean.slice(0, 3)
    return {
        display: +luminance(...mean).toFixed(4),
        linear: luminance(...mean.map(srgbToLinear))
    }
}

const report = {
    generated: new Date().toISOString(), modes: MODES,
    note: 'Blender traza los rebotes y ninguna de estas opciones puede. Lo que se compara es cuál se acerca más y dónde falla cada una.',
    cameras: []
}

for (const [camera, spec] of Object.entries(REGIONS)) {
    const reference = decodePNG(spec.reference)
    const images = {}
    for (const mode of MODES) {
        const file = path.join(DIR, `ind-${mode}-${SLUG[camera]}-comparacion.png`)
        if (!fs.existsSync(file)) { console.log(`${camera}: falta ${file}`); continue }
        images[mode] = decodePNG(file)
    }
    const available = Object.keys(images)
    if (!available.length) continue

    const entry = { camera, size: [reference.width, reference.height], whole: {}, regions: [] }
    for (const mode of available) {
        let sum = 0
        for (let i = 0; i < reference.pixels.length; i += 4) {
            for (let c = 0; c < 3; c++) sum += (reference.pixels[i + c] - images[mode].pixels[i + c]) ** 2
        }
        entry.whole[mode] = {
            rms: +Math.sqrt(sum / (reference.width * reference.height * 3)).toFixed(4),
            luminance: measure(images[mode], null).display
        }
    }
    entry.whole.blenderLuminance = measure(reference, null).display
    entry.best = available.reduce((a, b) => entry.whole[a].rms <= entry.whole[b].rms ? a : b)

    for (const [name, rect] of Object.entries(spec.regions)) {
        const target = measure(reference, rect)
        const row = { name, shadowed: SHADOWED.has(name), blender: target.display, modes: {} }
        for (const mode of available) {
            const value = measure(images[mode], rect)
            row.modes[mode] = {
                display: value.display,
                ratio: target.linear > 1e-6 ? +(value.linear / target.linear).toFixed(2) : null,
                ev: target.linear > 1e-6 && value.linear > 1e-9 ? +Math.log2(value.linear / target.linear).toFixed(2) : null
            }
        }
        entry.regions.push(row)
    }
    report.cameras.push(entry)

    const sheets = path.join(DIR, 'recortes')
    fs.mkdirSync(sheets, { recursive: true })
    for (const [name, rect] of Object.entries(spec.regions)) {
        const panels = [crop(reference, rect, 2), ...available.map(mode => crop(images[mode], rect, 2))]
        const slug = `${camera}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        fs.writeFileSync(path.join(sheets, `${slug}.png`), encodePNG(sideBySide(panels)))
    }
    entry.sheetOrder = ['Blender', ...available]
}

// How well each option lifts the parts that live on bounced light, which is the whole point.
report.shadowedSummary = {}
for (const mode of MODES) {
    const rows = report.cameras.flatMap(c => c.regions).filter(r => r.shadowed && r.modes[mode])
    if (!rows.length) continue
    const evs = rows.map(r => r.modes[mode].ev).filter(v => v !== null)
    report.shadowedSummary[mode] = {
        regions: rows.length,
        meanEv: +(evs.reduce((n, v) => n + v, 0) / evs.length).toFixed(2),
        worstEv: +Math.min(...evs).toFixed(2)
    }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(report, null, 2))

for (const camera of report.cameras) {
    console.log(`\n${camera.camera}  ·  Blender ${camera.whole.blenderLuminance} de luminancia media`)
    const modes = MODES.filter(m => camera.whole[m])
    console.log('  error del fotograma:  ' + modes.map(m => `${m} ${camera.whole[m].rms}`).join('  ·  '))
    console.log(`  mejor por ese criterio: ${camera.best}`)
    console.log('  region                      Blender' + modes.map(m => m.padStart(11)).join(''))
    for (const region of camera.regions) {
        const mark = region.shadowed ? '*' : ' '
        console.log(`   ${mark}${region.name.padEnd(25)}${String(region.blender).padStart(7)}` +
            modes.map(m => String(region.modes[m].display).padStart(11)).join(''))
    }
}
console.log('\n  * regiones que viven de la luz rebotada')
console.log('\nEn esas regiones, distancia media a Blender en EV:')
for (const [mode, summary] of Object.entries(report.shadowedSummary)) {
    console.log(`  ${mode.padEnd(10)} media ${String(summary.meanEv).padStart(6)} EV · peor ${String(summary.worstEv).padStart(6)} EV`)
}
console.log(`\nInforme: ${OUT}`)
