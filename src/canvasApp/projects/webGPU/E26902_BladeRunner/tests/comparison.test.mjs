import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const code=require('@babel/core').transformSync(fs.readFileSync(new URL('../TyrellComparison.js',import.meta.url),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
const m={exports:{}};new Function('module','exports',code)(m,m.exports)
test('Comparison rejects short windows, snapshots settings and bounds history without recursive diagnostics',()=>{
    const history=new m.exports.default(),report={metrics:{samples:30,resolution:[893,372]},atmosphere:{interior:true},comparison:['older']}
    assert.throws(()=>history.add(report),/muestras/)
    report.metrics.samples=120
    const row=history.add(report)
    report.atmosphere.interior=false;report.metrics.resolution[0]=1920
    assert.equal(row.atmosphere.interior,true);assert.equal(row.metrics.resolution[0],893)
    assert.equal(row.effects,'Bruma');assert.equal(row.comparison,undefined)
    for(let i=0;i<15;i++)history.add(report)
    assert.equal(history.rows.length,12);assert.equal(history.rows.at(-1).id,16)
    history.clear();assert.equal(history.rows.length,0)
})

test('Comparison records VK state and reflection cadence without retaining mutable references',()=>{
    const history=new m.exports.default()
    const report={metrics:{samples:120},voightKampff:{state:'open',progress:1},specularEnvironment:{minimumCaptureInterval:.5}}
    const row=history.add(report)
    report.voightKampff.state='closed'
    assert.equal(row.voightKampff.state,'open')
    assert.match(row.effects,/VK operativo/)
    assert.match(row.effects,/Reflejos a 2 Hz/)
})

test('Sustained low-FPS results are kept even when 60 seconds contain fewer than 120 frames', () => {
    const history = new m.exports.default()
    const row = history.add({ metrics: { samples: 90 }, measurement: { type: 'sustained', elapsedMs: 60001, pass: 1 }, specularEnvironment: { minimumCaptureInterval: .25 } })
    assert.equal(row.measurement.elapsedMs, 60001)
    assert.match(row.effects, /4 Hz/)
})
