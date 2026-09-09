import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url), babel = require('@babel/core')
const base = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/'
function load(file, imports) {
    const code = babel.transformSync(fs.readFileSync(base+file,'utf8'), { filename:file, configFile:false, babelrc:false, plugins:['@babel/plugin-transform-modules-commonjs'] }).code
    const module = { exports:{} }; new Function('require','module','exports',code)(key=>imports[key],module,module.exports); return module.exports
}
const { TYRELL } = load('config.js', {})
const { default: Look, applyColorReference } = load('TyrellLook.js', { three:THREE, './config':{TYRELL} })

test('Color reference uses linear working space, sRGB output, AgX and bounded EV compensation', () => {
    const renderer = {}
    const baseline = applyColorReference(renderer)
    assert.equal(renderer.toneMapping, THREE.AgXToneMapping)
    assert.equal(renderer.outputColorSpace, THREE.SRGBColorSpace)
    assert.equal(THREE.ColorManagement.workingColorSpace, THREE.LinearSRGBColorSpace)
    assert.equal(baseline.exposure, TYRELL.exposure)
    assert.equal(applyColorReference(renderer,1).exposure, 2*baseline.exposure)
    assert.equal(applyColorReference(renderer,100).compensationEV,2)
    assert.equal(applyColorReference(renderer,NaN).exposure,baseline.exposure)
})
test('Material comparison restores exact imported values, preserves shared maps and does not accumulate tint', () => {
    const root = new THREE.Group(), geometry = new THREE.BoxGeometry(), texture = new THREE.Texture()
    const stone = new THREE.MeshStandardMaterial({ color:0xaa8833, map:texture, roughnessMap:texture, normalMap:texture })
    stone.name='PBR | Caliza ocre envejecida'; stone.normalScale.set(.48,-.48)
    for(let i=0;i<4;i++) root.add(new THREE.Mesh(geometry,stone))
    const glass = new THREE.MeshPhysicalMaterial({ color:0xccdddd, roughness:.075, transmission:1 })
    glass.name='Crystal'; root.add(new THREE.Mesh(geometry,glass))
    const color=stone.color.clone(), normal=stone.normalScale.clone(), glassColor=glass.color.clone(), version=texture.version
    const look = new Look(root)
    look.apply('tyrell-v1'); const adjusted=stone.color.clone()
    assert.equal(look.diagnostics().materialCount,2)
    assert.equal(stone.normalScale.y,-.28); assert.equal(glass.thickness,.006)
    look.apply('tyrell-v1'); assert.ok(stone.color.equals(adjusted))
    look.apply('imported')
    assert.ok(stone.color.equals(color)); assert.ok(stone.normalScale.equals(normal)); assert.ok(glass.color.equals(glassColor))
    assert.equal(glass.roughness,.075); assert.equal(glass.thickness,0)
    assert.equal(texture.version,version); assert.equal(stone.map,texture); assert.equal(stone.roughnessMap,texture)
    assert.ok(root.children.slice(0,4).every(o=>o.material===stone))
    geometry.dispose(); stone.dispose(); glass.dispose(); texture.dispose()
})
