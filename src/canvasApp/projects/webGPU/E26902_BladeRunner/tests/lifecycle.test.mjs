import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
const filename = 'src/canvasApp/projects/webGPU/E26902_BladeRunner/TyrellLifecycle.js'
const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
const Lifecycle = module.exports.default
function setup() {
 const win = new EventTarget(), doc = new EventTarget(), calls = []
 doc.hidden = false
 const state = { ready: true, failed: false }
 const lifecycle = new Lifecycle({pauseInput:()=>calls.push('pause'),resetTiming:()=>calls.push('reset'),suspend:()=>calls.push('suspend'),resume:()=>calls.push('resume'),ready:()=>state.ready,failed:()=>state.failed},win,doc)
 return {win,doc,calls,state,lifecycle}
}
test('Hidden tabs suspend rendering; return resets timing and resumes rendering with input paused',()=>{
 const {doc,calls,lifecycle}=setup()
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'))
 assert.deepEqual(calls,['pause','reset','suspend']);calls.length=0
 doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'))
 assert.deepEqual(calls,['pause','reset','resume']);lifecycle.dispose()
})
test('GPU failure never resumes rendering; loading may finish while hidden',()=>{
 const {doc,calls,state,lifecycle}=setup()
 state.ready=false;doc.hidden=true;lifecycle.sync();assert.ok(!calls.includes('suspend'))
 state.ready=true;lifecycle.sync();assert.equal(calls.at(-1),'suspend')
 state.failed=true;doc.hidden=false;lifecycle.sync();assert.equal(calls.at(-1),'suspend');lifecycle.dispose()
})
test('Blur and editable focus release input; disposal removes all owned listeners',()=>{
 const {win,doc,calls,lifecycle}=setup()
 win.dispatchEvent(new Event('blur'));assert.deepEqual(calls,['pause','reset'])
 const e=new Event('focusin');Object.defineProperty(e,'target',{value:{closest:()=>true}})
 calls.length=0;doc.dispatchEvent(e);assert.deepEqual(calls,['pause','reset'])
 lifecycle.dispose();calls.length=0;win.dispatchEvent(new Event('blur'));doc.dispatchEvent(new Event('visibilitychange'));assert.deepEqual(calls,[])
})
