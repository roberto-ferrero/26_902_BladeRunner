import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as TSL from 'three/tsl'
const require=createRequire(import.meta.url)
const code=require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellLensFlare.js',import.meta.url),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
const m={exports:{}};new Function('require','module','exports',code)(key=>key==='three'?THREE:TSL,m,m.exports)
test('Solar optics follow each camera and disable behind camera, offscreen, hidden sun and studio',()=>{
 const disc=new THREE.Mesh(new THREE.CircleGeometry(2,32),new THREE.MeshBasicMaterial());disc.position.set(0,0,-100)
 let active=true;const flare=new m.exports.default(disc,()=>active)
 const camera=new THREE.PerspectiveCamera(40,2.4,.1,2000)
 flare.update(camera);assert.deepEqual(flare.center.value.toArray(),[.5,.5]);assert.equal(flare.energy.value,.18)
 const wideRadius=flare.radius.value.x;camera.aspect=1;camera.updateProjectionMatrix();flare.update(camera);assert.ok(flare.radius.value.x>wideRadius)
 camera.position.x=2;flare.update(camera);assert.ok(flare.center.value.x<.5)
 const clone=camera.clone();flare.update(clone);const reference=flare.center.value.toArray();flare.update(camera);assert.deepEqual(flare.center.value.toArray(),reference)
 disc.visible=false;flare.update(camera);assert.equal(flare.energy.value,0);disc.visible=true
 active=false;flare.update(camera);assert.equal(flare.energy.value,0);active=true
 disc.position.z=100;flare.update(camera);assert.equal(flare.energy.value,0)
 disc.position.set(1000,0,-100);flare.update(camera);assert.equal(flare.energy.value,0)
 disc.position.set(0,0,-100);flare.configure({enabled:false});flare.update(camera);assert.equal(flare.energy.value,0)
 flare.configure({enabled:true,intensity:Infinity,size:100});assert.equal(flare.settings.intensity,.18);assert.equal(flare.settings.size,2)
 disc.geometry.dispose();disc.material.dispose()
})
