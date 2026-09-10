import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import * as Bloom from 'three/addons/tsl/display/BloomNode.js'
const require=createRequire(import.meta.url)
function load(file,imports){
    const code=require('@babel/core').transformSync(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{
        configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']
    }).code
    const m={exports:{}}
    new Function('require','module','exports',code)(key=>imports[key],m,m.exports)
    return m.exports
}
const Post=load('TyrellPostProcessing.js',{'three/webgpu':THREE,'three/tsl':TSL,'three/addons/tsl/display/BloomNode.js':Bloom}).default
const {captureReference}=load('TyrellCapture.js',{three:THREE})

test('Nested bloom texture reads render the scene once, while the next capture gets a fresh scene',()=>{
    let sceneRenders=0
    const IsolatedPost=load('TyrellPostProcessing.js',{'three/webgpu':THREE,'three/tsl':{...TSL,pass:(...args)=>{
        const node=TSL.pass(...args);node.updateBefore=()=>sceneRenders++;return node
    }},'three/addons/tsl/display/BloomNode.js':Bloom}).default
    const renderer={toneMapping:THREE.AgXToneMapping,outputColorSpace:THREE.SRGBColorSpace}
    const camera=new THREE.PerspectiveCamera(),post=new IsolatedPost(renderer,new THREE.Scene())
    post.configure({bloom:true});post.initialize(camera)
    post.pipeline.render=()=>{post.scenePass.updateBefore({});post.scenePass.updateBefore({})}
    post.render(camera);assert.equal(sceneRenders,1)
    post.render(camera.clone());assert.equal(sceneRenders,2)
    post.dispose()
})

test('Final processing bypasses R01, follows each camera, excludes disabled bloom and restores renderer on failure',()=>{
    const direct=[],renderer={toneMapping:THREE.AgXToneMapping,outputColorSpace:THREE.SRGBColorSpace,render:(s,c)=>direct.push(c)}
    const scene=new THREE.Scene(),a=new THREE.PerspectiveCamera(),b=a.clone(),post=new Post(renderer,scene)
    post.render(a);assert.deepEqual(direct,[a]);assert.equal(post.pipeline,undefined)
    post.configure({grade:true});post.initialize(a)
    assert.equal(post.bloomInGraph,false)
    assert.equal(post.pipeline.outputColorTransform,true)
    assert.equal(post.scenePass.updateBeforeType,THREE.NodeUpdateType.RENDER)
    assert.equal(post.bloomNode.updateBeforeType,THREE.NodeUpdateType.RENDER)
    let calls=0;post.pipeline.render=()=>calls++
    post.render(b);assert.equal(post.scenePass.camera,b);assert.equal(calls,1)
    post.configure({bloom:true,strength:100,threshold:NaN});assert.equal(post.bloomInGraph,true)
    assert.equal(post.bloomNode.strength.value,.6);assert.equal(post.bloomNode.threshold.value,1.5)
    post.setQuality('Baja');assert.equal(post.bloomNode.getResolutionScale(),.25)
    post.configure({bloom:false});assert.equal(post.bloomInGraph,false)
    post.pipeline.render=()=>{renderer.toneMapping=0;renderer.outputColorSpace='';throw new Error('GPU failure')}
    assert.throws(()=>post.render(a),/GPU failure/)
    assert.equal(renderer.toneMapping,THREE.AgXToneMapping);assert.equal(renderer.outputColorSpace,THREE.SRGBColorSpace)
    post.configure({grade:false});post.render(a);assert.equal(direct.length,2)
    let released=0;post.scenePass.renderTarget.addEventListener('dispose',()=>released++)
    post.dispose();assert.equal(released,1)
})

test('Reference capture routes both resolutions through the final pipeline and restores size on failure',async()=>{
    let size=new THREE.Vector2(893,372),ratio=1.5
    const renderer={getSize:v=>v.copy(size),getPixelRatio:()=>ratio,setPixelRatio:v=>ratio=v,setSize:(x,y)=>size.set(x,y),domElement:{toBlob:cb=>cb(new Blob(['png']))}}
    const camera=new THREE.PerspectiveCamera(30,2.4,.1,2000),calls=[]
    await captureReference(renderer,new THREE.Scene(),camera,c=>calls.push({c,size:size.toArray(),ratio}))
    assert.deepEqual(calls.map(v=>[v.size,v.ratio]),[[[1920,800],1],[[893,372],1.5]])
    assert.notEqual(calls[0].c,camera);assert.equal(calls[1].c,camera)
    await assert.rejects(captureReference(renderer,new THREE.Scene(),camera,c=>{if(c!==camera)throw new Error('capture failed')}),/capture failed/)
    assert.deepEqual(size.toArray(),[893,372]);assert.equal(ratio,1.5)
})
