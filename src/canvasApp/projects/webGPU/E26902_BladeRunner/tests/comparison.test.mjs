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
