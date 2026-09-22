import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import * as THREE from 'three'
const require = createRequire(import.meta.url)
export function loadCameraSource(name) {
    const filename = path.resolve('src/canvasApp/projects/webGPU/E26902_BladeRunner', name)
    if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'))
    const code = require('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(id => id === 'three' ? THREE : loadCameraSource(id + (id.endsWith('.json') ? '' : '.js')), module, module.exports)
    return module.exports
}
