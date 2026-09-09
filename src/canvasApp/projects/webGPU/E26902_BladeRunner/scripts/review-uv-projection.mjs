// Read-only projection of collapsed-UV triangles; no occlusion test or GPU render.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Vector3, PerspectiveCamera } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const raw=fs.readFileSync(path.resolve(project,'../../../../../static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb'))
globalThis.self=globalThis
globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}})
const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'')
gltf.scene.updateMatrixWorld(true)
const cameras=gltf.cameras.filter(c=>/^CAM_0[124]_/.test(c.name)).map(source=>{
    const c=new PerspectiveCamera(source.fov,2.4,source.near,source.far)
    source.getWorldPosition(c.position);source.getWorldQuaternion(c.quaternion);c.updateMatrixWorld(true);return {name:source.name,c}
})
const results=[]
gltf.scene.traverse(o=>{
    if(!o.isMesh || !o.material.normalMap) return
    const g=o.geometry,uv=g.attributes.uv,p=g.attributes.position,idx=g.index
    if(!uv||!idx)return
    for(let t=0;t<idx.count;t+=3){
        const ids=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)]
        const [a,b,c]=ids.map(i=>[uv.getX(i),uv.getY(i)])
        if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))>=1e-12)continue
        const world=ids.map(i=>new Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld))
        const area=world[1].clone().sub(world[0]).cross(world[2].clone().sub(world[0])).length()/2
        const views=cameras.map(({name,c})=>{
            const q=world.map(v=>v.clone().project(c))
            // Only triangles fully inside the depth range and whose projected bounds overlap the frame.
            const overlaps=q.every(v=>v.z>=-1&&v.z<=1)&&['x','y'].every(k=>Math.min(...q.map(v=>v[k]))<=1&&Math.max(...q.map(v=>v[k]))>=-1)
            const pixels=overlaps?Math.abs((q[1].x-q[0].x)*(q[2].y-q[0].y)-(q[1].y-q[0].y)*(q[2].x-q[0].x))*1920*800/8:0
            return {camera:name,overlapsFrame:overlaps,areaPixels:pixels}
        })
        results.push({object:o.name,material:o.material.name,triangle:t/3,areaM2:area,views})
    }
})
const summary=cameras.map(({name})=>{const values=results.flatMap(r=>r.views.filter(v=>v.camera===name&&v.overlapsFrame));return {camera:name,overlappingTriangles:values.length,maxAreaPixels:Math.max(0,...values.map(v=>v.areaPixels)),trianglesOverOnePixel:values.filter(v=>v.areaPixels>1).length}})
const out=path.join(project,'docs/phase3/3.3-review');fs.mkdirSync(out,{recursive:true})
fs.writeFileSync(path.join(out,'uv-projection.json'),JSON.stringify({scope:'Normal-mapped meshes, scene instances, 1920x800; projected area without clipping or occlusion, not visibility proof',summary,triangles:results},null,2))
console.log(JSON.stringify(summary,null,2))
