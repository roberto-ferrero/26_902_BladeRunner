import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as TSL from 'three/tsl'
const require=createRequire(import.meta.url)
const code=require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellSky.js',import.meta.url),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
const m={exports:{}};new Function('require','module','exports',code)(key=>key==='three'?THREE:TSL,m,m.exports)
test('Solar gradient preserves CAM01 centre, starts at its horizontal edge and ignores camera display scale',()=>{
    const scene=new THREE.Scene(),original=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial({emissiveMap:new THREE.Texture()}))
    const sky=new m.exports.default(scene,original,new THREE.Texture())
    const camera=new THREE.PerspectiveCamera(30,1),sun=new THREE.Object3D()
    camera.position.set(4,2,10);camera.scale.setScalar(.01)
    sun.position.set(4,2,-900)
    sky.configureRadialDarkening(camera,sun,2)
    const expected=Math.atan(Math.tan(Math.PI/12)*2)
    assert.ok(Math.abs(sky.radialStart.value-expected)<1e-10)
    assert.ok(sky.radialCenter.value.distanceTo(new THREE.Vector3(0,0,-1))<1e-10)
    const brightness=angle=>1-THREE.MathUtils.smoothstep(angle,sky.radialStart.value,sky.radialEnd.value)*sky.radialStrength.value
    assert.equal(brightness(0),1);assert.equal(brightness(expected*.99),1)
    assert.ok(brightness(expected+.1)<1)
    assert.equal(brightness(Math.PI),.25)
    const cam02=camera.clone(false)
    cam02.rotateY(.6)
    sky.configureRadialDarkening(camera,sun,2,cam02)
    const boosted=angle=>brightness(angle)*(1-THREE.MathUtils.smoothstep(angle,sky.radialStart.value,sky.radialBoostEnd.value)*sky.radialBoost.value)
    assert.equal(boosted(0),1)
    assert.ok(Math.abs(boosted(sky.radialBoostEnd.value)/brightness(sky.radialBoostEnd.value)-1/3)<1e-12)
    assert.ok(boosted(expected+.1)<brightness(expected+.1))
    const baseline=sky.radialCenter.value.clone()
    camera.rotateY(.5)
    assert.ok(sky.radialCenter.value.equals(baseline))
    sky.dispose();original.geometry.dispose();original.material.emissiveMap.dispose();original.material.dispose()
})
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
