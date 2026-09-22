import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { loadCameraSource } from './load-camera-source.mjs'
const { default: Motion } = loadCameraSource('TyrellVKMotion.js')
const { default: Arrival } = loadCameraSource('TyrellVKArrival.js')
const { default: Device } = loadCameraSource('TyrellVKDevice.js')
const folder='src/canvasApp/projects/webGPU/E26902_BladeRunner/'
function asset() {
    const bytes=fs.readFileSync('static/glbs/E26902_BladeRunner/VK_Device.glb')
    const length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length))
    const start=28+length
    function accessor(id) {
        const a=g.accessors[id],v=g.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type]
        const bytesPer={5123:2,5125:4,5126:4}[a.componentType],array=new Float32Array(a.count*size)
        const read={5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType]
        for(let i=0;i<a.count;i++)for(let c=0;c<size;c++)array[i*size+c]=bytes[read](start+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*bytesPer)+c*bytesPer)
        return {array,size}
    }
    const nodes=g.nodes.map(n=>{
        let o=new THREE.Group()
        if(n.mesh!==undefined){const p=g.meshes[n.mesh].primitives[0],geo=new THREE.BufferGeometry()
            for(const [name,key] of [['position','POSITION'],['normal','NORMAL']]){const a=accessor(p.attributes[key]);geo.setAttribute(name,new THREE.BufferAttribute(a.array,a.size))}
            if(p.indices!==undefined)geo.setIndex(Array.from(accessor(p.indices).array))
            o=new THREE.Mesh(geo,new THREE.MeshStandardMaterial())
        }
        o.name=n.name;o.userData=n.extras||{}
        if(n.translation)o.position.fromArray(n.translation)
        if(n.rotation)o.quaternion.fromArray(n.rotation)
        if(n.scale)o.scale.fromArray(n.scale)
        return o
    })
    g.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])))
    const root=nodes.find(o=>o.name==='VK_Root');root.updateMatrixWorld(true);return root
}
test('VK placement matches the saved auxiliary and the camera export provenance',()=>{
    const p=JSON.parse(fs.readFileSync(folder+'vkPlacement.generated.json'))
    const c=JSON.parse(fs.readFileSync(folder+'cameraStates.generated.json'))
    assert.equal(p.sourceSha256,c.sourceSha256)
    assert.deepEqual(p.scale,[1,1,1])
    const m=new THREE.Matrix4().fromArray(p.matrix),v=new THREE.Vector3().setFromMatrixPosition(m)
    assert.deepEqual(v.toArray(),p.position)
    const C=new THREE.Matrix4().makeRotationX(-Math.PI/2)
    const source=new THREE.Matrix4().set(...p.blenderMatrix.flat())
    const converted=C.clone().multiply(source).multiply(C.clone().invert())
    assert.ok(converted.elements.every((v,i)=>Math.abs(v-m.elements[i])<1e-7))
})
test('real GLB: deterministic full cycles preserve placement and all rigid edge lengths',()=>{
    const root=asset(),container=new THREE.Group();container.position.set(-.8,.75,-10);container.rotation.y=-2.31;container.add(root)
    const reference=root.getObjectByName('VK_Bellows_Lid'),a=reference.geometry.attributes.position
    const edge=new THREE.Vector3().fromBufferAttribute(a,0).distanceTo(new THREE.Vector3().fromBufferAttribute(a,1))
    const motion=new Motion(root),closed=root.getObjectByName('VK_Camera_Fold').matrixWorld.clone()
    for(let cycle=0;cycle<5;cycle++){
        assert.equal(motion.setOpen(true),true);assert.equal(motion.setOpen(false),false)
        for(let i=0;i<300;i++)motion.update(1/60)
        assert.equal(motion.state,'open');assert.equal(motion.progress,1)
        for(let i=0;i<120;i++)motion.update(1/60)
        assert.ok(motion.compression>=.06&&motion.compression<=.38)
        assert.equal(motion.setOpen(false),true)
        for(let i=0;i<252;i++)motion.update(1/60)
        assert.equal(motion.state,'closed');assert.equal(motion.light,0)
        assert.ok(root.getObjectByName('VK_Camera_Fold').matrixWorld.elements.every((v,i)=>Math.abs(v-closed.elements[i])<1e-9))
    }
    assert.deepEqual(container.position.toArray(),[-.8,.75,-10])
    assert.equal(new THREE.Vector3().fromBufferAttribute(a,0).distanceTo(new THREE.Vector3().fromBufferAttribute(a,1)),edge)
})
test('rest pose reconstructs original flexible meshes and all poses remain finite',()=>{
    const root=asset(),originals=new Map()
    root.traverse(o=>{if(o.isMesh)originals.set(o.name,Array.from(o.geometry.attributes.position.array))})
    const motion=new Motion(root);motion.seek(1)
    // At operational rest, bellows has a small baseline compression. Cables are
    // unaffected by breathing and must reproduce the undeformed asset exactly.
    for(const b of motion.bindings.filter(b=>b.mesh.name.startsWith('VK_Cable')))
        assert.ok(Array.from(b.positions.array).every((v,i)=>Math.abs(v-originals.get(b.mesh.name)[i])<2e-7),b.mesh.name)
    for(const p of [0,.15,.35,.55,.75,1]){
        motion.seek(p)
        for(const b of motion.bindings)assert.ok(Array.from(b.positions.array).every(Number.isFinite))
    }
    const snapshot=motion.diagnostics();motion.update(NaN);motion.update(-1);motion.update(0)
    assert.deepEqual(motion.diagnostics(),snapshot)
})

test('arrival waits for confirmed p1, cancels pending dwell and respects manual intervention',()=>{
    const arrival=new Arrival()
    for(let i=0;i<600;i++)assert.equal(arrival.update(1/60,false),false)
    for(let i=0;i<12;i++)assert.equal(arrival.update(1/60,true),false)
    arrival.update(1/60,false)
    for(let i=0;i<17;i++)assert.equal(arrival.update(1/60,true),false)
    assert.equal(arrival.update(1/60,true),true)
    for(let i=0;i<60;i++)assert.equal(arrival.update(1/60,true),false)
    const manual=new Arrival();manual.manual();assert.equal(manual.update(1,true),false)
    const disabled=new Arrival();disabled.enabled=false;assert.equal(disabled.update(1,true),false)
    disabled.enabled=true;assert.equal(disabled.update(NaN,true),false)
    assert.equal(disabled.elapsed,0)
})

test('retraction smoothly settles the breathing phase and ends with optics off',()=>{
    const motion=new Motion(asset());motion.seek(1)
    for(let i=0;i<57;i++)motion.update(1/60)
    const compression=motion.compression
    motion.setOpen(false);motion.update(1/60)
    assert.ok(Math.abs(compression-motion.compression)<.002)
    for(let i=0;i<300;i++)motion.update(1/60)
    assert.equal(motion.compression,1);assert.equal(motion.light,0)
})

test('device applies authoritative placement, anchors optics and limits mirror invalidation',()=>{
    const source=asset(),device=new Device(source)
    const expected=JSON.parse(fs.readFileSync(folder+'vkPlacement.generated.json'))
    assert.deepEqual(device.group.position.toArray(),expected.position)
    assert.deepEqual(device.group.scale.toArray(),[1,1,1])
    assert.equal(device.optics.parent.name,'VK_Lens_Pivot')
    assert.equal(device.optics.visible,false)
    device.motion.seek(1);device.updateOptics()
    assert.equal(device.optics.visible,true);assert.equal(device.coreMaterial.emissiveIntensity,8)
    assert.equal(device.haloMaterial.depthTest,true)
    let invalidations=0
    for(let i=0;i<60;i++){device.update(1/60,false);if(device.reflectionNeedsRefresh)invalidations++}
    assert.ok(invalidations<=10 && invalidations>=8)
    device.toggle()
    for(let i=0;i<260;i++)device.update(1/60,false)
    assert.equal(device.optics.visible,false)
    assert.equal(device.arrival.consumed,true)
})
test('30 and 60 FPS have equivalent mechanical progress',()=>{
    const a=new Motion(asset()),b=new Motion(asset());a.setOpen(true);b.setOpen(true)
    for(let i=0;i<60;i++)a.update(1/30)
    for(let i=0;i<120;i++)b.update(1/60)
    assert.ok(Math.abs(a.progress-b.progress)<1e-12)
})
