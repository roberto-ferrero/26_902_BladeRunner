import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import * as TSL from 'three/tsl'
import * as GPU from 'three/webgpu'
const require=createRequire(import.meta.url)
const code=require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellSky.js',import.meta.url),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
const m={exports:{}};new Function('require','module','exports',code)(key=>key==='three'?THREE:key==='three/webgpu'?GPU:TSL,m,m.exports)
const options=()=>({camera:new THREE.PerspectiveCamera(30,2.4),aspect:2.4,texture:'test.png'})
test('Solar gradient preserves CAM01 centre, starts at its horizontal edge and ignores camera display scale',()=>{
    const scene=new THREE.Scene(),original=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial({emissiveMap:new THREE.Texture()}))
    const sky=new m.exports.default(scene,original,new THREE.Texture({width:1774,height:887}),options())
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
    const sky=new m.exports.default(scene,original,panorama,options())
    assert.equal(scene.backgroundNode,previous);assert.equal(scene.environment,environment);assert.equal(original.visible,false)
    assert.equal(sky.mesh.visible,true);assert.equal(sky.mesh.material.side,THREE.BackSide)
    assert.equal(original.geometry,geometry);assert.equal(original.material,material);assert.ok(original.position.equals(position))
    sky.setEnabled(false);assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,true);assert.equal(sky.mesh.visible,false)
    sky.setEnabled(true);sky.setStudio(true);assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,false);assert.equal(sky.mesh.visible,false)
    sky.setStudio(false)
    assert.throws(()=>sky.withOriginalBackground(()=>{assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,true);assert.equal(sky.mesh.visible,false);throw new Error('probe failed')}),/probe failed/)
    assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,false);assert.equal(sky.mesh.visible,true)
    sky.dispose();assert.equal(scene.backgroundNode,previous);assert.equal(original.visible,true);assert.equal(ownedDisposed,1);assert.equal(borrowedDisposed,0)
    material.dispose();geometry.dispose();originalMap.dispose();environment.dispose()
})

test('Real Camera_D and its mirror fit inside the cylinder, with continuous left-to-right UVs',()=>{
    const data=fs.readFileSync(new URL('../../../../../../static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb',import.meta.url))
    const gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString())
    const objects=gltf.nodes.map(node=>{
        const p=node.camera===undefined?null:gltf.cameras[node.camera].perspective
        const o=p?new THREE.PerspectiveCamera(p.yfov*180/Math.PI,p.aspectRatio,p.znear,p.zfar):new THREE.Object3D()
        o.name=node.name||''
        if(node.translation)o.position.fromArray(node.translation)
        if(node.rotation)o.quaternion.fromArray(node.rotation)
        if(node.scale)o.scale.fromArray(node.scale)
        if(node.matrix){o.matrix.fromArray(node.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale)}
        return o
    })
    gltf.nodes.forEach((n,i)=>n.children?.forEach(c=>objects[i].add(objects[c])))
    const source=objects.find(o=>o.name==='Camera_D')
    const settings={camera:source,aspect:2.4,radius:1200,centerY:80,marginDegrees:3}
    const coverage=m.exports.cylinderCoverage(source,settings)
    assert.ok(coverage.arc>Math.PI/2 && coverage.arc<2*Math.PI)
    const scene=new THREE.Scene(),original=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial())
    const sky=new m.exports.default(scene,original,new THREE.Texture({width:1774,height:887}),settings)
    scene.updateMatrixWorld(true)
    const camera=source.clone(false)
    source.getWorldPosition(camera.position);source.getWorldQuaternion(camera.quaternion)
    camera.scale.set(1,1,1);camera.aspect=2.4;camera.updateProjectionMatrix();camera.updateMatrixWorld(true)
    for(const x of [-1,0,1])for(const y of [-1,0,1]) {
        const direction=new THREE.Vector3(x,y,.5).unproject(camera).sub(camera.position).normalize()
        for(const mirror of [1,-1]) {
            const origin=camera.position.clone();origin.x*=mirror
            const ray=direction.clone();ray.x*=mirror
            const hits=new THREE.Raycaster(origin,ray,0,camera.far).intersectObject(sky.mesh)
            assert.ok(hits.length>0,`Uncovered ray ${x},${y}, mirror ${mirror}`)
        }
    }
    const uv=sky.mesh.geometry.attributes.uv,positions=sky.mesh.geometry.attributes.position
    const mid=Math.floor((192+1)/2)
    assert.ok(positions.getX(0)>0);assert.equal(uv.getX(0),1)
    assert.ok(Math.abs(uv.getX(mid)-.5)<1e-6)
    assert.equal(uv.getX(192),0)
    console.log('Cylinder coverage:',coverage.arc*180/Math.PI,'degrees; height:',coverage.height)
    sky.dispose();original.geometry.dispose();original.material.dispose()
})
