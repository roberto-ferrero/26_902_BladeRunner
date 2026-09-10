import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as TSL from 'three/tsl'
const require=createRequire(import.meta.url)
const code=require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellSky.js',import.meta.url),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
const m={exports:{}};new Function('require','module','exports',code)(key=>key==='three'?THREE:TSL,m,m.exports)
test('Single panorama hides and restores original sky and scene lighting, restores background and owns only its new texture',()=>{
    const scene=new THREE.Scene(),previous=TSL.vec4(.1,.1,.1,1),environment=new THREE.Texture()
    scene.backgroundNode=previous;scene.environment=environment
    const originalMap=new THREE.Texture(),material=new THREE.MeshStandardMaterial({emissive:0xaaaaaa,emissiveMap:originalMap})
    const original=new THREE.Mesh(new THREE.PlaneGeometry(1000,500),material)
    original.position.set(0,10,-900);scene.add(original)
    const position=original.position.clone(),geometry=original.geometry,panorama=new THREE.Texture({width:1774,height:887})
    let borrowedDisposed=0,ownedDisposed=0
    originalMap.addEventListener('dispose',()=>borrowedDisposed++);panorama.addEventListener('dispose',()=>ownedDisposed++)
    const sky=new m.exports.default(scene,original,panorama)
    assert.equal(scene.backgroundNode,sky.node);assert.equal(scene.environment,environment);assert.equal(original.visible,false)
    assert.equal(original.geometry,geometry);assert.equal(original.material,material);assert.ok(original.position.equals(position))
    sky.setEnabled(false);assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,true)
    sky.setEnabled(true);sky.setStudio(true);assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,false)
    sky.setStudio(false)
    assert.throws(()=>sky.withOriginalBackground(()=>{assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,true);throw new Error('probe failed')}),/probe failed/)
    assert.equal(scene.backgroundNode,sky.node);assert.equal(original.visible,false)
    sky.dispose();assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,true);assert.equal(ownedDisposed,1);assert.equal(borrowedDisposed,0)
    material.dispose();geometry.dispose();originalMap.dispose();environment.dispose()
})
