import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import { loadGeometry, base } from './audit-contacts.mjs'
const require = createRequire(import.meta.url)
const code = require('@babel/core').transformSync(fs.readFileSync(base+'TyrellCollision.js','utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
const m={exports:{}};new Function('require','module','exports',code)(()=>THREE,m,m.exports)
const scene=await loadGeometry(), collision=new m.exports.default(scene), results=[]
scene.traverse(o=>{
 if (!['Table_Slab','Wall_Side_L'].includes(o.name)||!o.isMesh) return
 const g=o.geometry, uv=g.attributes.uv, index=g.index
 for(let t=0;t<index.count;t+=3){
  const ids=[index.getX(t),index.getX(t+1),index.getX(t+2)]
  const [a,b,c]=ids.map(i=>new THREE.Vector2().fromBufferAttribute(uv,i))
  if(Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>=1e-12)continue
  const vertices=ids.map(i=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(o.matrixWorld))
  const center=vertices.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).multiplyScalar(1/3)
  const camera=new THREE.PerspectiveCamera(40,2.4,.03,2500)
  camera.position.copy(center);collision.settle(camera.position,1.65);camera.lookAt(center);camera.updateMatrixWorld(true)
  const v=vertices.map(p=>p.clone().project(camera))
  const pixels=Math.abs((v[1].x-v[0].x)*(v[2].y-v[0].y)-(v[1].y-v[0].y)*(v[2].x-v[0].x))*1920*800/8
  results.push({object:o.name,triangle:t/3,center:center.toArray(),eye:camera.position.toArray(),distance:camera.position.distanceTo(center),areaPixels: pixels})
 }
})
const out=base+'docs/phase7/7.3';fs.mkdirSync(out,{recursive:true})
fs.writeFileSync(out+'/navigation-audit.json',JSON.stringify({collision:collision.diagnostics(),scope:'Collapsed UVs retained; closest valid XZ standing position at 1.65 m; fov 40 at 1920x800, area without occlusion or clipping. Not proof of visible artifacts.',results},null,2))
console.log(JSON.stringify({obstacles:collision.boxes.length,summary:['Table_Slab','Wall_Side_L'].map(object=>({object,triangles:results.filter(r=>r.object===object).length,maxAreaPixels:Math.max(...results.filter(r=>r.object===object).map(r=>r.areaPixels))}))}))
