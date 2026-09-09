import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
function load(file, imports) {
    const code = require('@babel/core').transformSync(fs.readFileSync(path.join(project, file), 'utf8'), {
        filename: file, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(key => imports[key], module, module.exports)
    return module.exports
}

export async function auditSharedChairs() {
    const { TYRELL } = load('config.js', {})
    const { default: Look } = load('TyrellLook.js', { three: THREE, './config': { TYRELL } })
    const { disposeScene } = load('TyrellAssets.js', { 'three/addons/loaders/GLTFLoader.js': { GLTFLoader } })
    const raw = fs.readFileSync(path.resolve(project, '../../../../../static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb'))
    const oldSelf = globalThis.self, oldBitmap = globalThis.createImageBitmap
    const images = []
    try {
        globalThis.self = globalThis
        // Offline bindings/lifecycle audit; PNG decoding and GPU allocation are not exercised.
        globalThis.createImageBitmap = async blob => {
            const bytes = Buffer.from(await blob.arrayBuffer())
            assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
            const image = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), closes: 0,
                close() { this.closes++ } }
            images.push(image); return image
        }
        const { scene } = await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '')
        const chairs = [], meshes = [], materials = new Set(), geometries = new Set(), textures = new Set()
        scene.traverse(o => {
            if (/^Sillon_0[1-4]_/.test(o.name)) chairs.push(o)
            if (!o.isMesh) return
            meshes.push(o); geometries.add(o.geometry)
            for (const m of [].concat(o.material)) {
                materials.add(m)
                for (const value of Object.values(m)) if (value?.isTexture) textures.add(value)
            }
        })
        assert.equal(chairs.length, 4, 'Expected four chair roots')
        const parts = chairs.map(chair => { const a = []; chair.traverse(o => { if (o.isMesh) a.push(o) }); return a })
        assert.ok(parts.every(a => a.length === 6), 'Expected six material parts per chair')
        for (let i = 1; i < 4; i++) for (let j = 0; j < 6; j++) {
            assert.equal(parts[i][j].geometry, parts[0][j].geometry, 'Chair geometry must be shared')
            assert.equal(parts[i][j].material, parts[0][j].material, 'Chair material must be shared')
        }
        const meshState = meshes.map(o => ({ o, geometry: o.geometry, material: o.material,
            position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray() }))
        const bindings = [...materials].flatMap(m => Object.entries(m).filter(([, v]) => v?.isTexture).map(([slot, texture]) => ({ m, slot, texture })))
        const versions = [...textures].map(t => [t, t.version])
        const colors = [...materials].filter(m => m.color).map(m => [m, m.color.clone()])
        const look = new Look(scene)
        for (let i = 0; i < 10; i++) {
            look.apply('tyrell-v1'); look.setFloorNormal(false); look.apply('imported'); look.setFloorNormal(true)
            for (const s of meshState) {
                assert.equal(s.o.geometry, s.geometry); assert.equal(s.o.material, s.material)
                assert.deepEqual(s.o.position.toArray(), s.position); assert.deepEqual(s.o.quaternion.toArray(), s.quaternion)
                assert.deepEqual(s.o.scale.toArray(), s.scale)
            }
            for (const { m, slot, texture } of bindings) assert.equal(m[slot], texture)
            for (const [t, version] of versions) assert.equal(t.version, version)
            for (const [m, color] of colors) assert.ok(m.color.equals(color), 'Imported color must restore without drift')
        }
        const chairTextures = new Set(parts[0].flatMap(o => Object.values(o.material).filter(v => v?.isTexture)))
        const report = { threeRevision: THREE.REVISION, assetSha256: createHash('sha256').update(raw).digest('hex'),
            scope: 'Offline real GLTFLoader and project look/disposal; image decoding stubbed; no GPU benchmark',
            chairs: chairs.map(o => o.name), chairMeshObjects: parts.flat().length,
            sharedChairGeometries: new Set(parts[0].map(o => o.geometry)).size,
            sharedChairMaterials: new Set(parts[0].map(o => o.material)).size,
            sharedChairTextures: chairTextures.size, chairMaterialNames: parts[0].map(o => o.material.name),
            sceneResources: { meshes: meshes.length, geometries: geometries.size, materials: materials.size, textures: textures.size },
            lookCycles: 10, identitiesAndTransformsPreserved: true, importedColorsRestored: true }
        const disposeCounts = new Map([...geometries, ...materials, ...textures].map(resource => [resource, 0]))
        for (const resource of disposeCounts.keys()) resource.addEventListener('dispose', () => disposeCounts.set(resource, disposeCounts.get(resource) + 1))
        disposeScene(scene)
        assert.ok([...disposeCounts.values()].every(count => count === 1), 'Shared resource disposed more or less than once')
        assert.ok(images.every(image => image.closes === 1), 'Decoded image not closed exactly once')
        report.disposal = { resourcesDisposedOnce: disposeCounts.size, imagesClosedOnce: images.length }
        return report
    } finally {
        if (oldSelf === undefined) delete globalThis.self; else globalThis.self = oldSelf
        if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const report = await auditSharedChairs()
    const out = path.join(project, 'docs/phase3/3.6')
    fs.mkdirSync(out, { recursive: true })
    fs.writeFileSync(path.join(out, 'shared-chairs.json'), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(report, null, 2))
}
