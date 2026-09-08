import { RenderPipeline } from 'three/webgpu'
import { pass, uniform, float, vec3, mix, smoothstep } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { godrays } from 'three/addons/tsl/display/GodraysNode.js'
import { TYRELL } from './config'

// The post-processing pipeline.
//
// Until now the renderer applied the tone mapping itself, on an internal target it allocates
// because tone mapping is on. That left nowhere to put an effect that has to work on linear
// light before the curve: a bloom applied after the tone map blooms display values, not light.
//
// A RenderPipeline moves the scene into an explicit pass, so effects compose in linear space and
// the tone map runs once at the end. `outputColorTransform` is left on, which makes the pipeline
// wrap the output in the renderer's own tone mapping and colour space, so the AgX plus Blender
// look of phase 3 keeps applying exactly as before and nothing needs recalibrating.
//
// Every effect can be switched off on its own, so its contribution and its cost can be read
// separately, which is what the plan asks for.

export const EFFECTS = ['bruma', 'haces', 'bloom']

// Blender stores these linearly, so the components go straight into the node. Handing a
// THREE.Color to vec3() does not convert: it yields zero, which silently turns the haze into a
// fade to black and multiplies the beams away to nothing.
function linearColor([r, g, b]) {
    return vec3(float(r), float(g), float(b))
}

export function createPipeline({ renderer, scene, camera, sun }) {
    const scenePass = pass(scene, camera)
    const colour = scenePass.getTextureNode('output')
    const depth = scenePass.getTextureNode('depth')
    // View z is negative in front of the camera, so the distance is its negation.
    const distance = scenePass.getViewZNode().negate()

    // Aerial perspective outside the room. This one is not measured against Blender: that render
    // has no volume out there, its dust box stops at the walls. It comes from the film, where the
    // far pyramids lighten and lose contrast instead of cutting hard against the sky, and the
    // plan gives the film authority over the finish. It only reaches past the room, so the
    // interior is left to the beams below, which is the separation the plan asks for.
    const aerial = TYRELL.post.aerial
    const aerialStrength = uniform(float(aerial.enabled ? aerial.strength : 0))
    const aerialAmount = smoothstep(float(aerial.startMetres), float(aerial.fullMetres), distance).mul(aerialStrength)
    const hazed = mix(colour.rgb, linearColor(aerial.color), aerialAmount)

    // The shafts, and with them the dust inside the room. GodraysNode raymarches the sun's own
    // shadow map, so the columns occlude the beams for free and the effect is bounded by the
    // shadow frustum, which phase 4 fitted to the room. Blender's dust is a box of the same
    // extent, density 0,005 and colour (0,66, 0,61, 0,47); the colour carries over, the density
    // is on the node's own scale and has to be fitted.
    const beams = TYRELL.post.beams
    const beamStrength = uniform(float(beams.enabled ? beams.strength : 0))
    let composed = hazed
    if (sun) {
        const shafts = godrays(depth, camera, sun)
        shafts.density.value = beams.density
        shafts.maxDensity.value = beams.maxDensity
        shafts.distanceAttenuation.value = beams.distanceAttenuation
        shafts.raymarchSteps.value = beams.steps
        shafts.resolutionScale = beams.resolutionScale
        // The node writes vec4(vec3(illumination), depth), so only its colour is composited.
        composed = composed.add(shafts.rgb.mul(linearColor(beams.color)).mul(beamStrength))
    }

    // Blender's compositor uses a Fog Glow glare with threshold 1,2 and size 0,72, and those
    // carry over. Its strength does not: Blender's glare mixes and Three's bloom adds. Sweeping
    // it in the browser against the reference puts the minimum of the mean error at 0,3, where
    // Blender's own 0,6 lands well past it.
    const settings = TYRELL.post.bloom
    const bloomStrength = uniform(float(settings.enabled ? settings.strength : 0))
    const bloomNode = bloom(composed, settings.strength, settings.radius, settings.threshold)
    bloomNode.strength = bloomStrength

    const pipeline = new RenderPipeline(renderer, composed.add(bloomNode))

    return {
        pipeline,
        scenePass,
        settings: {
            bloom: { ...settings }, aerial: { ...aerial }, beams: { ...beams },
            outputColorTransform: pipeline.outputColorTransform
        },
        setEffect(name, enabled) {
            if (name === 'bloom') { bloomStrength.value = enabled ? settings.strength : 0; return true }
            if (name === 'bruma') { aerialStrength.value = enabled ? aerial.strength : 0; return true }
            if (name === 'haces') { beamStrength.value = enabled ? beams.strength : 0; return true }
            return false
        },
        // Exposed so each strength can be swept in the browser and chosen against the reference
        // instead of guessed, the way the bloom one was.
        setBloomStrength(value) { bloomStrength.value = value },
        setBeamStrength(value) { beamStrength.value = value },
        setAerialStrength(value) { aerialStrength.value = value },
        isEnabled(name) {
            if (name === 'bloom') return bloomStrength.value > 0
            if (name === 'bruma') return aerialStrength.value > 0
            if (name === 'haces') return beamStrength.value > 0
            return false
        },
        setCamera(next) {
            // One pass, retargeted, rather than a new pipeline per camera.
            scenePass.camera = next
        },
        render() {
            pipeline.render()
        },
        dispose() {
            pipeline.dispose?.()
        }
    }
}
