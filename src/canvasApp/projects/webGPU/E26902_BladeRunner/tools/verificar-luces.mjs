// Phase 4 lighting check. Confronts the rig read out of the master .blend with what the GLB
// actually carries, and works out the values Three.js needs, so no intensity is copied across
// without knowing what it means.
//
//   blender.exe --background --factory-startup ../../_Blender/BladeRunner_5_6_High_v3.blend \
//       --python tools/blender/leer_luces.py -- docs/phase4
//   node src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/verificar-luces.mjs
//
// Writes docs/phase4/luces.json. Findings are the deliverable; the exit code is not.
import fs from 'node:fs'
import path from 'node:path'

const GLB = 'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb'
const RIG = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase4/luces-blender.json'
const OUT = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase4/luces.json'
const WATTS_TO_LUMENS = 683      // the constant Blender's glTF exporter uses for luminous efficacy

// ---------------------------------------------------------------- small vector maths

const sub = (a, b) => a.map((v, i) => v - b[i])
const len = a => Math.hypot(...a)
const norm = a => { const l = len(a); return a.map(v => v / l) }
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0)
const angleDeg = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot(norm(a), norm(b))))) * 180 / Math.PI

// Rotates (0,0,-1) by a glTF quaternion, which is where a light node points.
function forward([x, y, z, w]) {
    const v = [0, 0, -1]
    const uv = [y * v[2] - z * v[1], z * v[0] - x * v[2], x * v[1] - y * v[0]]
    const uuv = [y * uv[2] - z * uv[1], z * uv[0] - x * uv[2], x * uv[1] - y * uv[0]]
    return v.map((c, i) => c + 2 * (w * uv[i] + uuv[i]))
}

// ---------------------------------------------------------------- inputs

const rig = JSON.parse(fs.readFileSync(RIG, 'utf8'))
const bytes = fs.readFileSync(GLB)
const jsonLength = bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))

const report = {
    generated: new Date().toISOString(), blend: rig.blend, blender: rig.blender,
    note: 'El .blend maestro manda. El GLB sólo transporta el sol y algunos de sus valores están desfasados.',
    findings: [], sun: {}, areaLights: [], world: {}, shadow: {}
}
const finding = (severity, area, text) => report.findings.push({ severity, area, text })

// ---------------------------------------------------------------- 1. the sun

const masterSun = rig.lights.find(light => light.type === 'SUN')
const gltfLights = gltf.extensions?.KHR_lights_punctual?.lights || []
const sunNode = gltf.nodes.find(node => node.extensions?.KHR_lights_punctual !== undefined)
const gltfSun = sunNode ? gltfLights[sunNode.extensions.KHR_lights_punctual.light] : null
const gltfDirection = sunNode?.rotation ? forward(sunNode.rotation) : null

report.sun = {
    master: {
        energyWattsPerM2: masterSun.energy, color: masterSun.color,
        position: masterSun.position, direction: masterSun.direction,
        angularDiameterDeg: +(masterSun.angle * 180 / Math.PI).toFixed(4)
    },
    gltf: gltfSun ? {
        intensityLux: gltfSun.intensity, color: gltfSun.color,
        position: sunNode.translation, direction: gltfDirection?.map(v => +v.toFixed(6))
    } : null,
    // Blender's sun strength is irradiance in W/m2 and Three's DirectionalLight intensity enters
    // the shader as irradiance too, so the two are the same number. The exporter's lux value has
    // to be divided by the luminous efficacy constant to get back to it.
    conversion: {
        rule: 'intensidad de Three = W/m² de Blender = lux del glTF / 683',
        fromMaster: masterSun.energy,
        fromGltf: gltfSun ? +(gltfSun.intensity / WATTS_TO_LUMENS).toFixed(4) : null,
        expectedLuxForMaster: +(masterSun.energy * WATTS_TO_LUMENS).toFixed(2)
    }
}
if (gltfDirection) {
    const drift = angleDeg(gltfDirection, masterSun.direction)
    report.sun.directionDriftDeg = +drift.toFixed(4)
    if (drift > 0.1) finding('alta', 'sol', `La dirección del sol del GLB se aparta ${drift.toFixed(2)}° de la del maestro.`)
}
if (gltfSun && Math.abs(gltfSun.intensity - masterSun.energy * WATTS_TO_LUMENS) > 1) {
    finding('alta', 'sol', `El GLB declara ${gltfSun.intensity} lux, que son ${(gltfSun.intensity / WATTS_TO_LUMENS).toFixed(3)} W/m², cuando el maestro tiene ${masterSun.energy}. El sol del GLB está desfasado y no debe usarse.`)
}
if (gltfSun && masterSun.color.some((c, i) => Math.abs(c - gltfSun.color[i]) > 0.01)) {
    finding('alta', 'sol', `El color del sol del GLB es ${JSON.stringify(gltfSun.color)} y el del maestro ${JSON.stringify(masterSun.color)}.`)
}

// The emissive disc has to sit where the sun comes from, or the backlight and the visible sun
// disagree on screen.
const discNode = gltf.nodes.find(node => /^Sol \|/.test(node.name || ''))
if (discNode) {
    const towardsDisc = norm(discNode.translation)
    const towardsSun = masterSun.direction.map(v => -v)
    const drift = angleDeg(towardsDisc, towardsSun)
    const material = gltf.materials.find(m => /^Sol \|/.test(m.name))
    report.sun.disc = {
        position: discNode.translation, distance: +len(discNode.translation).toFixed(1),
        emissiveFactor: material?.emissiveFactor,
        emissiveStrength: material?.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
        driftFromSunDeg: +drift.toFixed(3)
    }
    if (drift > 1) finding('media', 'sol', `El disco solar se aparta ${drift.toFixed(2)}° de la dirección de la luz.`)
}
const skyMaterial = gltf.materials.find(m => /^Cielo \|/.test(m.name))
report.sun.sky = {
    emissiveFactor: skyMaterial?.emissiveFactor,
    emissiveStrength: skyMaterial?.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
    note: 'El maestro pone la emisión del cielo en 0,6, que es lo que trae el GLB.'
}

// ---------------------------------------------------------------- 2. the area fills

// Blender area lamps carry total power in watts. A Lambertian emitter of area A radiating that
// power into the hemisphere has radiance P / (A * pi), and that is what a RectAreaLight takes.
// Three has no disc light, so each disc becomes a square of the same area: the power and the
// radiance stay right and only the silhouette changes, which a soft fill can afford.
for (const light of rig.lights.filter(l => l.type === 'AREA')) {
    const radius = light.sizeX / 2
    const area = light.shape === 'DISK' || light.shape === 'ELLIPSE'
        ? Math.PI * radius * (light.sizeY / 2)
        : light.sizeX * light.sizeY
    const side = Math.sqrt(area)
    report.areaLights.push({
        name: light.name, shape: light.shape, powerWatts: light.energy,
        sizeBlender: [light.sizeX, light.sizeY], areaM2: +area.toFixed(4),
        equivalentSquareSide: +side.toFixed(4),
        radiance: +(light.energy / (area * Math.PI)).toFixed(4),
        color: light.color, position: light.position, direction: light.direction, target: light.target,
        visible: light.visible
    })
}
if (!gltfLights.some(l => l.type !== 'directional')) {
    finding('alta', 'rellenos', `El GLB no lleva ninguna luz de área: las ${report.areaLights.length} del maestro nunca se exportaron, así que el visor tiene que reconstruirlas desde este informe.`)
}
// Every factor at 1 and every visibility flag on means the fills contribute fully in Blender,
// diffuse and glossy alike. That rules out the easy explanation for a floor that comes out too
// bright, and leaves the one Three cannot avoid.
const shadowing = rig.lights.filter(l => l.type === 'AREA' && l.useShadow)
report.areaLightLimits = {
    blenderCastsShadow: shadowing.map(l => l.name),
    factors: rig.lights.filter(l => l.type === 'AREA').map(l => ({
        name: l.name, diffuse: l.diffuse_factor, specular: l.specular_factor, visibleToCamera: l.visibility?.camera
    })),
    note: 'Three.js no proyecta sombras desde una RectAreaLight. En Blender estos rellenos sí las proyectan, así que en el visor llegan al suelo sin que las columnas los corten.'
}
if (shadowing.length) {
    finding('media', 'rellenos', `${shadowing.length} rellenos proyectan sombra en Blender y Three.js no puede hacerlo desde una luz de área. Su luz llega al pavimento sin recortar, que es parte de por qué el suelo sale más claro que la referencia.`)
}

// ---------------------------------------------------------------- 3. the world

// A uniform Blender world of colour C and strength S radiates C*S in every direction, which puts
// an irradiance of pi*C*S on an unoccluded surface. Three's AmbientLight adds its colour times
// its intensity straight into the irradiance, so the intensity carries that pi.
const worldRadiance = rig.world.color.map(c => c * rig.world.strength)
report.world = {
    blender: rig.world,
    radiance: worldRadiance.map(v => +v.toFixed(5)),
    ambient: {
        color: rig.world.color,
        intensity: +(Math.PI * rig.world.strength).toFixed(5),
        rule: 'intensidad de AmbientLight = pi * fuerza del mundo, con el color del mundo'
    },
    note: 'Una luz ambiente sólo alimenta el difuso. El mundo de Blender también aporta especular, y eso pertenece al punto de iluminación indirecta.'
}

// ---------------------------------------------------------------- 4. shadow coverage

// The shadow map only has to cover what casts and receives inside the room. The pyramid, the sky
// and the sun disc sit hundreds of metres away and would swallow the whole frustum.
const FAR_AWAY = /^(Tyrell_Corporation|Cielo \||Sol \|)/
let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
const nodeMatrix = node => node.translation || [0, 0, 0]
for (const node of gltf.nodes) {
    if (node.mesh === undefined || FAR_AWAY.test(node.name || '')) continue
    const scale = node.scale || [1, 1, 1]
    const offset = nodeMatrix(node)
    for (const primitive of gltf.meshes[node.mesh].primitives) {
        const accessor = gltf.accessors[primitive.attributes.POSITION]
        for (let i = 0; i < 3; i++) {
            lo[i] = Math.min(lo[i], accessor.min[i] * scale[i] + offset[i])
            hi[i] = Math.max(hi[i], accessor.max[i] * scale[i] + offset[i])
        }
    }
}
const size = hi.map((v, i) => v - lo[i])
const centre = hi.map((v, i) => (v + lo[i]) / 2)
// Worst case for an orthographic frustum aimed at the box from any angle.
const radius = Math.hypot(...size) / 2

// What the viewer actually does: put the eight corners of that box into the light's own space
// and take the box there. The sun grazes, only 4 degrees above the horizon, so the fit is far
// tighter than a sphere would suggest.
const forwardAxis = norm(masterSun.direction)
const worldUp = Math.abs(forwardAxis[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const right = norm(cross(forwardAxis, worldUp))
const up = cross(right, forwardAxis)
let lightLo = [Infinity, Infinity, Infinity], lightHi = [-Infinity, -Infinity, -Infinity]
for (let corner = 0; corner < 8; corner++) {
    const point = [
        corner & 1 ? hi[0] : lo[0],
        corner & 2 ? hi[1] : lo[1],
        corner & 4 ? hi[2] : lo[2]
    ]
    const local = [dot(point, right), dot(point, up), dot(point, forwardAxis)]
    for (let i = 0; i < 3; i++) {
        lightLo[i] = Math.min(lightLo[i], local[i])
        lightHi[i] = Math.max(lightHi[i], local[i])
    }
}
const fittedWidth = lightHi[0] - lightLo[0]
const fittedHeight = lightHi[1] - lightLo[1]
const fittedDepth = lightHi[2] - lightLo[2]

report.shadow = {
    fittedWidth: +fittedWidth.toFixed(3),
    fittedHeight: +fittedHeight.toFixed(3),
    fittedDepth: +fittedDepth.toFixed(3),
    fittedTexelMetresLightSpace: +(Math.max(fittedWidth, fittedHeight) / 2048).toFixed(5),
    areaRatioAgainstCurrent: +((fittedWidth * fittedHeight) / (36 * 24)).toFixed(3),
    interiorBoundsMin: lo.map(v => +v.toFixed(3)),
    interiorBoundsMax: hi.map(v => +v.toFixed(3)),
    interiorSize: size.map(v => +v.toFixed(3)),
    interiorCentre: centre.map(v => +v.toFixed(3)),
    boundingRadius: +radius.toFixed(3),
    current: { halfWidth: 18, halfHeight: 12, near: 0.1, far: 150, mapSize: 2048 },
    currentTexelMetres: +(36 / 2048).toFixed(5),
    fittedTexelMetres: +(2 * radius / 2048).toFixed(5),
    note: 'Ajustar el frustum a la esfera que envuelve el interior deja el mismo mapa cubriendo menos metros, así que cada texel mide menos y el sesgo puede bajar.'
}
if (radius * 2 < 36) {
    finding('media', 'sombras', `El frustum actual cubre 36 m de ancho para un interior que cabe en ${(radius * 2).toFixed(1)} m, así que se desperdicia resolución.`)
}

// ---------------------------------------------------------------- output

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(report, null, 2))

console.log(`Maestro: ${path.basename(report.blend)} · Blender ${report.blender}`)
console.log(`\nSol`)
console.log(`  maestro   ${masterSun.energy} W/m², color ${masterSun.color.map(c => c.toFixed(2)).join(' ')}, diámetro angular ${report.sun.master.angularDiameterDeg}°`)
console.log(`  GLB       ${gltfSun.intensity} lux = ${report.sun.conversion.fromGltf} W/m², color ${gltfSun.color.join(' ')}`)
console.log(`  el maestro exportado daría ${report.sun.conversion.expectedLuxForMaster} lux`)
console.log(`  desvío de dirección GLB frente a maestro: ${report.sun.directionDriftDeg}°`)
console.log(`  disco solar a ${report.sun.disc.distance} m, desviado ${report.sun.disc.driftFromSunDeg}° de la luz, emisión ${report.sun.disc.emissiveStrength}`)
console.log(`\nRellenos de área (ninguno viaja en el GLB)`)
console.log(`  nombre                          W    forma  diám  area m²  lado eq.  radiancia  color`)
for (const light of report.areaLights) {
    console.log(`  ${light.name.padEnd(30)}${String(light.powerWatts).padStart(4)}   ${light.shape.padEnd(6)}${String(light.sizeBlender[0]).padStart(5)}${String(light.areaM2).padStart(9)}${String(light.equivalentSquareSide).padStart(10)}${String(light.radiance).padStart(11)}  ${light.color.map(c => c.toFixed(2)).join(' ')}`)
}
console.log(`\nMundo: color ${rig.world.color.join(' ')} × fuerza ${rig.world.strength} → ambiente de intensidad ${report.world.ambient.intensity}`)
console.log(`\nSombras: el interior mide ${report.shadow.interiorSize.join(' × ')} m y cabe en un radio de ${report.shadow.boundingRadius} m`)
console.log(`  frustum actual 36 × 24 m · ajustado a la luz ${report.shadow.fittedWidth} × ${report.shadow.fittedHeight} m, profundidad ${report.shadow.fittedDepth} m`)
console.log(`  el ajustado ocupa el ${(report.shadow.areaRatioAgainstCurrent * 100).toFixed(0)} % del área actual · texel ${report.shadow.currentTexelMetres} m → ${report.shadow.fittedTexelMetresLightSpace} m`)
console.log(`\n${report.findings.length} hallazgos:`)
for (const f of report.findings) console.log(`  [${f.severity}] ${f.area}: ${f.text}`)
console.log(`\nInforme: ${OUT}`)
