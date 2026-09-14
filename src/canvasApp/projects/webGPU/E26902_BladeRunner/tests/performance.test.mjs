import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellPerformance.js'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
const Probe = module.exports.default
const summarize = module.exports.summarize
test('Statistics are bounded and unavailable GPU is null rather than zero', () => {
 const probe=new Probe({backend:{trackTimestamp:false}},true)
 for(let i=0;i<140;i++)probe.frame(2,true)
 assert.deepEqual(probe.report().cpuRender,{samples:120,meanMs:2,p95Ms:2})
 assert.equal(probe.report().gpuRender,null)
 assert.equal(summarize([]),null)
})
test('Late GPU results cannot contaminate a new configuration or disposed probe', async () => {
 let resolve
 const probe=new Probe({backend:{trackTimestamp:true},resolveTimestampsAsync:()=>new Promise(r=>{resolve=r})},true)
 probe.frame(1,true);probe.reset();resolve(5);await new Promise(r=>setImmediate(r))
 assert.equal(probe.report().gpuRender,null)
 probe.frame(1,true);probe.dispose();resolve(5);await new Promise(r=>setImmediate(r))
 assert.equal(probe.report().gpuRender,null)
})
test('Profiling is opt-in, collects asynchronous GPU samples and reports failures', async () => {
 const renderer={backend:{trackTimestamp:true},resolveTimestampsAsync:async()=>3}
 const disabled=new Probe(renderer,false);disabled.frame(2,true);assert.equal(disabled.report().cpuRender,null)
 const probe=new Probe(renderer,true);probe.frame(2,true);await new Promise(r=>setImmediate(r))
 assert.equal(probe.report().gpuRender.meanMs,3)
 renderer.resolveTimestampsAsync=async()=>{throw new Error('lost')};probe.frame(2,true);await new Promise(r=>setImmediate(r))
 assert.equal(probe.report().gpuSupported,false);assert.equal(probe.report().gpuError,'lost')
})
