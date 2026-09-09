import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
const require=createRequire(import.meta.url), base='src/canvasApp/projects/webGPU/E26902_BladeRunner/'
const profiles=JSON.parse(fs.readFileSync(base+'column-cores.json','utf8'))
const code=require('@babel/core').transformSync(fs.readFileSync(base+'TyrellColumnCores.js','utf8'),{
    filename:'TyrellColumnCores.js',configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']
}).code
const m={exports:{}}
new Function('require','module','exports',code)(key=>key==='three'?THREE:profiles,m,m.exports)

test('Recessed column cores block every horizontal course gap from both sides without modifying the authored mesh',()=>{
    const root=new THREE.Group(), original=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial())
    root.add(original); const vertices=original.geometry.attributes.position.array.slice()
    const core=m.exports.addColumnCores(root);root.updateMatrixWorld(true)
    assert.equal(profiles.cores.length,18);assert.ok(profiles.indices.length/3<8500)
    const centers=[]
    for(const sx of [-1,1])for(const [x,ys] of [[3,[-8.1015,0,5.4,13.2]],[9,[-8.1015,-2.7015,2.6985,8.1015,13.2]]])for(const y of ys)centers.push([sx*x,-y])
    const ray=new THREE.Raycaster()
    for(const [x,z] of centers)for(let course=1;course<=23;course++)for(const side of [-1,1]){
        ray.set(new THREE.Vector3(x,course*.245,z+side*2),new THREE.Vector3(0,0,-side))
        ray.far=4
        assert.ok(ray.intersectObject(core).length>0,`Open joint at ${x},${z}, course ${course}`)
    }
    assert.deepEqual(original.geometry.attributes.position.array,vertices)
    assert.equal(root.children.length,2);assert.equal(core.castShadow,true)
    original.geometry.dispose();original.material.dispose();core.geometry.dispose();core.material.dispose()
})

test('Column repair preserves shared textures and the authored wall/column materials',()=>{
    const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture()
    const material=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide})
    const wall=new THREE.Mesh(geometry,material);root.add(wall)
    const columns=[new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material)]
    columns.forEach((column,i)=>{column.name=`Columna_${i+1}`;root.add(column)})
    const core=m.exports.addColumnCores(root)
    assert.equal(wall.material,material);assert.equal(wall.material.side,THREE.DoubleSide)
    assert.equal(columns[0].material,columns[1].material);assert.equal(columns[0].material,material)
    assert.equal(columns[0].material.map,texture);assert.equal(columns[0].geometry,geometry)
    geometry.dispose();material.dispose();columns[0].material.dispose();texture.dispose();core.geometry.dispose();core.material.dispose()
})

test('Real model only reassigns the rear corner returns; all original positions and materials remain intact',async()=>{
    const oldSelf=globalThis.self,oldBitmap=globalThis.createImageBitmap
    globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}})
    try {
        const b=fs.readFileSync('static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb')
        const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
        const before=[];scene.traverse(o=>{if(o.isMesh)before.push({o,g:o.geometry,m:o.material,count:o.geometry.index.count})})
        const core=m.exports.addColumnCores(scene)
        let transferred=0
        for(const {o,g,m:material,count} of before){
            assert.equal(o.material,material);assert.equal(o.geometry.attributes.position,g.attributes.position)
            assert.equal(o.geometry.attributes.normal,g.attributes.normal)
            assert.equal(o.geometry.attributes.uv,g.attributes.uv)
            if(o.geometry!==g){assert.match(o.name,/^Columna_(09|18)_/);transferred+=(count-o.geometry.index.count)/3}
        }
        assert.ok(transferred>0&&transferred<1000)
        assert.equal(core.userData.columnRepair.darkReturnTriangles,transferred)
        const oldTriangles=before.reduce((n,s)=>n+s.count/3,0)
        const newTriangles=before.reduce((n,s)=>n+s.o.geometry.index.count/3,0)+core.geometry.index.count/3
        assert.equal(newTriangles-oldTriangles,profiles.indices.length/3)
        console.log('Column repair:',core.userData.columnRepair)
    } finally {
        if(oldSelf===undefined)delete globalThis.self;else globalThis.self=oldSelf
        if(oldBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldBitmap
    }
})
