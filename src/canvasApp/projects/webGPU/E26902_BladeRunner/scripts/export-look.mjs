import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require=createRequire(import.meta.url), babel=require('@babel/core')
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
function load(file,imports) {
    const code=babel.transformSync(fs.readFileSync(path.join(project,file),'utf8'),{filename:file,configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
    const m={exports:{}};new Function('require','module','exports',code)(key=>imports[key],m,m.exports);return m.exports
}
const {TYRELL}=load('config.js',{})
const {MATERIAL_LOOK,applyColorReference}=load('TyrellLook.js',{three:THREE,'./config':{TYRELL}})
const out=path.join(project,'docs/phase3/3.2-3.3');fs.mkdirSync(out,{recursive:true})
fs.writeFileSync(path.join(out,'look.json'),JSON.stringify({profile:TYRELL.materialLook,status:'Pending visual WebGPU approval',colorReference:applyColorReference({}),materials:MATERIAL_LOOK},null,2))
console.log('Exported material recipe for reproducible review')
