import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import * as THREE from 'three'
import { loadCameraSource } from './load-camera-source.mjs'
const { portfolioEligible, activeCardIndices, cardBeamOpacity, rectCorners, projectToViewport, dustSamples, easeOut } = loadCameraSource('TyrellPortfolioMath.js')
const require = createRequire(import.meta.url)
const source = fs.readFileSync(new URL('../TyrellPortfolio.js', import.meta.url), 'utf8')
const code = require('@babel/core').transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
const module = { exports: {} }, page = { activeElement: null }
new Function('require', 'module', 'exports', 'document', code)(id => id === 'three' ? THREE : {}, module, module.exports, page)

test('Leaving during entry hides immediately and re-entry restores scroll and expanded media', () => {
    const portfolio = Object.create(module.exports.default.prototype)
    const frame = { src: 'video', dataset: { src: 'video' }, removeAttribute() { this.src = '' } }
    Object.assign(portfolio, { root: { hidden: false, contains: () => false }, scroller: { scrollTop: 1250 }, active: true,
        cards: [{ card: { querySelector: () => true, querySelectorAll: () => [frame] } }], beamCount: 24 })
    portfolio.setActive(false)
    assert.equal(portfolio.root.hidden, true); assert.equal(portfolio.root.inert, true)
    assert.equal(portfolio.savedScroll, 1250); assert.equal(portfolio.beamCount, 0); assert.equal(frame.src, '')
    portfolio.scroller.scrollTop = 0 // hidden browser scroll containers can reset their exposed offset
    portfolio.setActive(true)
    assert.equal(portfolio.scroller.scrollTop, 1250); assert.equal(portfolio.root.hidden, false)
    assert.equal(portfolio.elapsed, 0); assert.equal(portfolio.entryComplete, false); assert.equal(frame.src, 'video')
})
test('Viewport wheel forwards line/page deltas but leaves GUI, zoom and native card scrolling alone', () => {
    const portfolio = Object.create(module.exports.default.prototype)
    Object.assign(portfolio, { active: true, project: { ui: { dialog: { open: false } } }, rect: { height: 800 },
        scroller: { scrollTop: 0, contains: target => target.native } })
    let prevented = 0
    const event = { deltaY: 3, deltaMode: 1, preventDefault: () => prevented++, target: { closest: () => false } }
    portfolio.wheel(event); assert.equal(portfolio.scroller.scrollTop, 60); assert.equal(prevented, 1)
    portfolio.wheel({ ...event, deltaY: 1, deltaMode: 2 }); assert.equal(portfolio.scroller.scrollTop, 860)
    for (const change of [{ ctrlKey: true }, { target: { closest: () => true } }, { target: { native: true, closest: () => false } }]) portfolio.wheel({ ...event, ...change })
    assert.equal(portfolio.scroller.scrollTop, 860); assert.equal(prevented, 2)
})

test('Portfolio waits for arrival and fully open optics, and hides on exit or manual closure', () => {
    const ready = { revealed: true, cameraState: 'p1', transitioning: false, exploring: false, visorState: 'open' }
    assert.equal(portfolioEligible(ready), true)
    for (const change of [{ revealed: false }, { cameraState: 'p2' }, { transitioning: true }, { exploring: true },
        { visorState: 'deploying' }, { visorState: 'retracting' }, { visorState: 'closed' }]) {
        assert.equal(portfolioEligible({ ...ready, ...change }), false)
    }
})
test('Expanded cards retain their beams and no more than immediate neighbours are selected', () => {
    const bounds = [{ top: 38, bottom: 1400 }, { top: 1450, bottom: 2100 }, { top: 2150, bottom: 2800 }, { top: 2850, bottom: 3500 }]
    assert.deepEqual(activeCardIndices(bounds, 400), [0, 1])
    assert.deepEqual(activeCardIndices(bounds, 1300), [0, 1])
    assert.deepEqual(activeCardIndices(bounds, 1800), [0, 1, 2])
    assert.deepEqual(activeCardIndices(bounds, 3200), [2, 3])
    assert.deepEqual(activeCardIndices([], 400), [])
})
test('Offscreen endpoints stay unclamped while fading above and below independently', () => {
    assert.deepEqual(rectCorners({ left: 2200, right: 3000, top: -200, bottom: 150 }, 0, 50), [[2200,-250],[3000,-250],[3000,100],[2200,100]])
    assert.equal(cardBeamOpacity({ top: -600, bottom: 1 }, 800, 200, 400), 1)
    assert.equal(cardBeamOpacity({ top: -600, bottom: -100 }, 800, 200, 400), .5)
    assert.equal(cardBeamOpacity({ top: 1000, bottom: 1600 }, 800, 200, 400), .5)
    assert.equal(cardBeamOpacity({ top: 1200, bottom: 1600 }, 800, 200, 400), 0)
})
test('Optical origin projection includes the actual canvas bars and camera pan', () => {
    const camera = new THREE.PerspectiveCamera(40, 2.4, .03, 100)
    camera.position.set(0,0,5); camera.updateMatrixWorld(true)
    const rect = { left: 40, top: 100, width: 1920, height: 800 }
    const origin = new THREE.Vector3(0,0,0)
    const projected = projectToViewport(origin.clone().project(camera), rect)
    assert.equal(projected.x, 1000); assert.equal(projected.y, 500); assert.equal(projected.visible, true)
    camera.position.x = 1; camera.updateMatrixWorld(true)
    assert.ok(projectToViewport(origin.clone().project(camera), rect).x < projected.x)
    assert.equal(projectToViewport({ x: 0, y: 0, z: 2 }, rect).visible, false)
})
test('Entry is eased out and dust has deterministic independent spatial samples', () => {
    assert.equal(easeOut(-1), 0); assert.equal(easeOut(2), 1); assert.ok(easeOut(.5) > .5)
    assert.deepEqual(dustSamples(1), dustSamples(1)); assert.notDeepEqual(dustSamples(1), dustSamples(2))
    assert.ok(dustSamples(1).every(sample => sample.u >= 0 && sample.u <= 1 && sample.length > 0))
})
test('Local catalog preserves every media dependency and disambiguates duplicate source ids', () => {
    const root = 'static/portfolio'
    const catalogs = ['data', 'experiments'].map(name => JSON.parse(fs.readFileSync(`${root}/assets/${name}.json`, 'utf8').replace(/^\uFEFF/, '')))
    const sizes = JSON.parse(fs.readFileSync(`${root}/media-sizes.json`, 'utf8').replace(/^\uFEFF/, ''))
    const ids = new Set()
    catalogs.forEach((catalog, group) => catalog.projects.forEach(project => {
        const id = `portfolio-${group}-${project.id}`; assert.ok(!ids.has(id)); ids.add(id)
        assert.match(project.color, /^#[0-9a-f]{6}$/i)
        for (const media of [...project.main_media || [], ...project.extra_media || []]) {
            if (!media.path || /^https?:/.test(media.path)) continue
            assert.ok(fs.existsSync(path.join(root, media.path)), media.path)
            assert.ok(sizes[media.path]?.every(size => size > 0), media.path)
        }
    }))
    assert.equal(ids.size, 41)
    assert.equal(catalogs[0].projects[0].id, 'p_bio')
    const bio = fs.readFileSync(`${root}/bio.html`, 'utf8')
    assert.match(bio, /Current stack/); assert.doesNotMatch(bio, /<script/i)
})
