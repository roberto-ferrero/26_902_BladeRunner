import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as THREE from 'three'

const require = createRequire(import.meta.url)
const source = fs.readFileSync(new URL('../TyrellCapture.js', import.meta.url), 'utf8')
const { code } = require('@babel/core').transformSync(source, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
})
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(() => THREE, module, module.exports)
const { captureReference } = module.exports

function fixture(fail = false) {
    const sourceCamera = new THREE.PerspectiveCamera(23, 16 / 10, 0.03, 2500)
    sourceCamera.position.set(-2, 1.6, 10)
    sourceCamera.rotation.set(0.1, 0.2, 0)
    sourceCamera.updateMatrixWorld(true)
    const scene = new THREE.Scene(), frames = [], snapshots = []
    const renderer = {
        size: new THREE.Vector2(1000, 625), ratio: 0.75,
        getSize: target => target.copy(renderer.size),
        getPixelRatio: () => renderer.ratio,
        setPixelRatio: ratio => { renderer.ratio = ratio },
        setSize: (width, height, style) => {
            assert.equal(style, false, 'Capture must leave the CSS layout alone')
            renderer.size.set(width, height)
        },
        render: (world, camera) => {
            assert.equal(world, scene)
            if (fail && camera !== sourceCamera) throw new Error('render failed')
            frames.push({ camera, size: renderer.size.toArray(), ratio: renderer.ratio })
        },
        domElement: {
            toBlob: (callback, type) => {
                snapshots.push({ size: renderer.size.toArray(), ratio: renderer.ratio, type })
                queueMicrotask(() => callback(new Blob(['png'], { type })))
            }
        }
    }
    return { renderer, scene, sourceCamera, frames, snapshots }
}

test('Reference capture uses 1920x800 and preserves live camera, layout and quality', async () => {
    const f = fixture(), before = f.sourceCamera.toJSON()
    const blob = await captureReference(f.renderer, f.scene, f.sourceCamera)
    assert.equal(blob.type, 'image/png')
    assert.deepEqual(f.snapshots, [{ size: [1920, 800], ratio: 1, type: 'image/png' }])
    assert.equal(f.frames[0].camera.aspect, 2.4)
    assert.equal(f.frames[0].camera.fov, f.sourceCamera.fov)
    assert.ok(f.frames[0].camera.position.equals(f.sourceCamera.position))
    assert.ok(f.frames[0].camera.quaternion.equals(f.sourceCamera.quaternion))
    assert.deepEqual(f.sourceCamera.toJSON(), before)
    assert.deepEqual(f.renderer.size.toArray(), [1000, 625])
    assert.equal(f.renderer.ratio, 0.75)
    assert.equal(f.frames.at(-1).camera, f.sourceCamera)
})

test('Reference capture restores the viewer when rendering fails', async () => {
    const f = fixture(true)
    await assert.rejects(captureReference(f.renderer, f.scene, f.sourceCamera), /render failed/)
    assert.deepEqual(f.renderer.size.toArray(), [1000, 625])
    assert.equal(f.renderer.ratio, 0.75)
    assert.equal(f.frames.at(-1).camera, f.sourceCamera)
})

test('Reference capture reports an empty PNG without leaving the viewer resized', async () => {
    const f = fixture()
    f.renderer.domElement.toBlob = callback => queueMicrotask(() => callback(null))
    await assert.rejects(captureReference(f.renderer, f.scene, f.sourceCamera), /captura PNG/)
    assert.deepEqual(f.renderer.size.toArray(), [1000, 625])
    assert.equal(f.renderer.ratio, 0.75)
})

test('Repeated reference captures reuse camera identity while updating its pose and lens', async () => {
    const f = fixture()
    await captureReference(f.renderer, f.scene, f.sourceCamera)
    const camera = f.frames[0].camera
    f.sourceCamera.position.x += 2; f.sourceCamera.fov = 31
    f.sourceCamera.updateProjectionMatrix(); f.sourceCamera.updateMatrixWorld(true)
    await captureReference(f.renderer, f.scene, f.sourceCamera)
    assert.equal(f.frames[2].camera, camera)
    assert.equal(camera.fov, 31)
    assert.ok(camera.position.equals(f.sourceCamera.position))
    assert.equal(camera.aspect, 2.4)
})
