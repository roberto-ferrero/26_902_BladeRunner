// Read-only audit of the active GLB. Node has no image decoder: textures are placeholders;
// all positions, indices and transforms come from GLTFLoader. Does not assess image fidelity.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
const require = createRequire(import.meta.url)
export const base = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/'
export function contactModule() {
    const code = require('@babel/core').transformSync(fs.readFileSync(base + 'TyrellContacts.js', 'utf8'), {
        configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code
    const m = { exports: {} }
    new Function('require', 'module', 'exports', code)(() => THREE, m, m.exports)
    return m.exports
}
export async function loadGeometry() {
    const previousSelf = globalThis.self, previousBitmap = globalThis.createImageBitmap
    globalThis.self = globalThis
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })
    try {
        const b = fs.readFileSync('static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb')
        const { scene } = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')
        scene.updateMatrixWorld(true)
        return scene
    } finally {
        if (previousSelf === undefined) delete globalThis.self; else globalThis.self = previousSelf
        if (previousBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = previousBitmap
    }
}
export function auditContacts(scene) {
    const floors = [], targets = [], table = []
    scene.traverse(o => {
        if (/^Sillon_\d\d|^Columna_\d\d.*hiladas$/.test(o.name)) targets.push(o)
        if (!o.isMesh) return
        if (/^Pavimento|^Mortero_bajo|^Podest$/.test(o.name)) floors.push(o)
        if (/^Foot_[45]$|^Instrument_case$|^Leather_folio$|^Cut_crystal_decanter$|^Crystal_tumbler/.test(o.name)) targets.push(o)
        if (['Table_Slab', 'Mesa_|_campo_de_cuero'].includes(o.name)) table.push(o)
    })
    const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, .1)
    const contacts = targets.filter(o => !targets.some(other => other !== o && o.parent === other)).map(o => {
        const box = new THREE.Box3().setFromObject(o, true), points = []
        o.traverse(mesh => {
            if (!mesh.isMesh) return
            const position = mesh.geometry.attributes.position
            for (let i = 0; i < position.count; i++) {
                const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
                if (point.y < box.min.y + .0001) points.push(point)
            }
        })
        const supports = box.min.y > .5 ? table : floors, gaps = []
        for (const point of points) {
            ray.ray.origin.copy(point).y += .01
            const hit = ray.intersectObjects(supports, true)[0]
            if (hit) gaps.push(point.y - hit.point.y)
        }
        return { name: o.name, probes: points.length, hits: gaps.length,
            minGap: gaps.length ? Math.min(...gaps) : null, maxGap: gaps.length ? Math.max(...gaps) : null }
    })
    // Vertical grid checks slab/mortar coverage, not every sub-pixel crack or solar path.
    let floorProbes = 0, floorMisses = 0
    for (let x = -8.8; x < 8.9; x += .2) for (let z = -14.2; z < 11.9; z += .2) {
        ray.ray.origin.set(x, .04, z); floorProbes++
        if (!ray.intersectObjects(floors, true).length) floorMisses++
    }
    return { units: 'metres, glTF Y up', contacts, floorProbes, floorMisses,
        limitations: 'Sampled support geometry only; no proof of complete light occlusion. Ambient/area lights have no shadows.' }
}
if (process.argv.includes('--write')) {
    const scene = await loadGeometry(), before = auditContacts(scene)
    const repair = contactModule().settleInstrumentCase(scene), after = auditContacts(scene)
    const out = base + 'docs/phase4/4.6'
    fs.mkdirSync(out, { recursive: true })
    fs.writeFileSync(out + '/contacts.json', JSON.stringify({ before, repair, after }, null, 2) + '\n')
    console.log(JSON.stringify({ repair, floorProbes: after.floorProbes, floorMisses: after.floorMisses, contacts: after.contacts }, null, 2))
}
