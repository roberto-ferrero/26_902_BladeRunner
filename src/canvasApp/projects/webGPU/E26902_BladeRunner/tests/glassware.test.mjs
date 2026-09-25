import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { Box3, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { addGlassware, GLASSWARE_SCALE } from '../TyrellGlassware.js'
import TyrellGlasswareTable from '../TyrellGlasswareTable.js'

async function load(path) {
    const raw = fs.readFileSync(path)
    return new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '')
}

test('User meshes are retained exactly, all vessels are empty at scale 1.5', async () => {
    const oldSelf = globalThis.self, oldBitmap = globalThis.createImageBitmap
    globalThis.self = globalThis
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })
    try {
        const { scene } = await load('static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb')
        const { scene: imported } = await load('static/glbs/E26902_BladeRunner/Glassware.glb')
        const originalGeometry = Object.fromEntries(['Licorera', 'Tapon', 'Vaso'].map(name => [name, imported.getObjectByName(name).geometry]))
        const originalPositions = Object.fromEntries(Object.entries(originalGeometry).map(([name, geo]) => [name, geo.attributes.position.array.slice()]))
        const names = ['Cut_crystal_decanter', 'Crystal_tumbler', 'Crystal_tumbler001']
        const originals = names.map(name => scene.getObjectByName(name))
        const oldBounds = originals.map(o => new Box3().setFromObject(o))
        const result = addGlassware(scene, imported)
        assert.equal(result.vessels, 3)
        assert.equal(scene.getObjectByName('Crystal_stopper').visible, false)
        result.groups.forEach((group, index) => {
            assert.equal(originals[index].visible, false)
            const bounds = new Box3().setFromObject(group)
            const centre = bounds.getCenter(new Vector3()), oldCentre = oldBounds[index].getCenter(new Vector3())
            assert.ok(Math.abs(bounds.min.y - oldBounds[index].min.y) < 1e-6)
            assert.ok(Math.abs(centre.x - oldCentre.x) < 1e-6 && Math.abs(centre.z - oldCentre.z) < 1e-6)
            assert.equal(GLASSWARE_SCALE, 1.5)
            assert.deepEqual(group.scale.toArray(), [1.5, index === 0 ? 1.5 * 1.2 : 1.5, 1.5])
            assert.ok(Math.abs(bounds.max.y - bounds.min.y - (index === 0 ? .2302 * 1.2 : .0852) * GLASSWARE_SCALE) < 1e-6)
            if (index > 0) assert.equal(group.children.length, 1, 'empty tumbler contains glass only')
            for (const mesh of group.children) {
                if (originalGeometry[mesh.name]) {
                    assert.equal(mesh.geometry, originalGeometry[mesh.name], 'use the supplied mesh, not a procedural reconstruction')
                    assert.deepEqual(mesh.geometry.attributes.position.array, originalPositions[mesh.name])
                }
                assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite))
            }
        })
        assert.equal(result.groups[1].children[0].geometry, result.groups[2].children[0].geometry)
        assert.equal(scene.getObjectByName('Whisky'), undefined)
        assert.equal(result.groups[0].children.length, 2, 'bottle contains only glass and stopper')
        assert.equal(result.empty, true)
        assert.equal(imported.children.length, 0, 'all imported resources move into the owned scene')
        const geometry = result.groups[0].children[0].geometry
        const stopperThickness = result.materials[1].thickness
        result.configure({ color: '#44aa88', transmission: 0, roughness: .4, ior: 1.7,
            attenuationColor: '#668899', attenuationDistance: .5, clearcoat: 0, thicknessScale: 2,
            imperfections: 0, bottleHeightScale: 1.5 })
        for (const material of result.materials) {
            assert.equal(material.color.getHexString(), '44aa88')
            assert.equal(material.transmission, 0)
            assert.equal(material.roughness, .4)
            assert.equal(material.ior, 1.7)
            assert.equal(material.attenuationColor.getHexString(), '668899')
            assert.equal(material.attenuationDistance, .5)
            assert.equal(material.clearcoat, 0)
        }
        assert.equal(result.materials[1].thickness, stopperThickness * 2)
        assert.equal(result.groups[2].children[0].material, result.groups[1].children[0].material)
        assert.equal(result.groups[0].children[0].geometry, geometry)
        assert.ok(Math.abs(new Box3().setFromObject(result.groups[0]).min.y - oldBounds[0].min.y) < 1e-6)
        result.configure({ transmission: 1, bottleHeightScale: 1.2 })
        assert.ok(result.materials.every(material => material.transmission === 1 && material.roughness === .4))
    } finally {
        if (oldSelf === undefined) delete globalThis.self; else globalThis.self = oldSelf
        if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap
    }
})

test('Export provenance matches the user source and the committed asset', () => {
    const report = JSON.parse(fs.readFileSync('src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/glassware-source.json'))
    const hash = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex')
    const source = '../../_Fuentes/Vaso y licorera/licorera_vaso_v2.blend'
    if (fs.existsSync(source)) assert.equal(hash(source), report.sourceSHA256)
    assert.equal(hash('static/glbs/E26902_BladeRunner/Glassware.glb'), report.assetSHA256)
})

test('Table has matte wood and contact shadows, no mirror pass; disposal restores the source material', () => {
    const root = new Group(), groups = [new Group(), new Group(), new Group()]
    groups.forEach((group, i) => { group.position.set(i * .2, .752, 0); root.add(group) })
    const wood = new MeshStandardMaterial(), slab = new Mesh(new PlaneGeometry(), wood)
    slab.name = 'Table_Slab'; root.add(slab)
    const originalNode = wood.roughnessNode
    const table = new TyrellGlasswareTable(root, groups)
    assert.ok(wood.roughnessNode?.isNode)
    assert.equal(table.node, undefined, 'no reflector or low resolution mirrored highlights')
    const resources = table.contacts.flatMap(mesh => [mesh.geometry, mesh.material])
    let disposed = 0
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed++))
    assert.ok(table.contacts.every(mesh => mesh.visible && !mesh.castShadow))
    table.dispose()
    assert.equal(disposed, resources.length)
    assert.equal(wood.roughnessNode, originalNode)
    assert.deepEqual(root.children, [...groups, slab])
    wood.dispose(); slab.geometry.dispose()
})
