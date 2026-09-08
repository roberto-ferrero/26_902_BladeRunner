export const TYRELL = {
    asset: 'glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb',
    assetBytes: 56526524,
    referenceAspect: 2.4,
    // Blender renders v3_general.png and v3_detalle.png at this exact size.
    compareSize: { width: 1920, height: 800 },
    compareCameras: ['CAM 01', 'CAM 02', 'CAM 04'],
    initialCamera: 'CAM 01',
    // Blender rendered the references at +0,1 EV, which is this linear factor.
    exposure: 1.0718,
    // "AgX - Medium High Contrast" reproduced inside Three's AgX. Fitted against a measured
    // Blender ramp by tools/calibrar-color.mjs; the fit recovers 1,198 against the 1,2 the OCIO
    // config declares. Residual against Blender: RMS 0,0091, máximo 0,0223.
    look: { contrast: 1.198, pivot: 0.691 },
    quality: 'Media',
    // Resolution budgets, not an inferred GPU ranking. Geometry is unchanged.
    profiles: {
        Baja: { pixelRatio: 0.75, shadowSize: 1024 },
        Media: { pixelRatio: 1, shadowSize: 2048 },
        Alta: { pixelRatio: 1.5, shadowSize: 2048 }
    },
    // The GLB carries KHR_materials_transmission but not KHR_materials_volume, so every
    // transmissive material arrives with thickness 0. A zero thickness gives a zero-length
    // refraction ray: the glass then shows exactly what is behind it, undistorted, and reads as
    // frosted plastic instead of glass. The thickness is taken from the pieces themselves at
    // build time, as the median of their smallest world dimension times this factor, so it stays
    // right if the model changes. Set to 0 to keep the file's own value.
    crystalThicknessFactor: 0.5,

    // The 27 materials of the GLB all arrive double-sided, which is the exporter's habit and not
    // an authoring decision. TyrellSurfaces.js measures whether each surface is closed and culls
    // only where it is safe. The threshold sits between the 0,15 of the most open real geometry
    // and the 1,0 of the sky backdrop and the sun disc, which are single planes.
    backfaceCulling: { enabled: true, closureThreshold: 0.5 },

    // The pavement's planar reflection. See TyrellReflection.js for where it is added and why.
    // The plane and the extent come from the floor sectors, not from numbers typed here.
    //
    // DISABLED. The reflector renders the right image but the presented canvas trails the
    // camera: with CAM 02 selected and its own draw count on screen, the compositor still shows
    // CAM 01. The post-processing pipeline of phase 6 did not change this. docs/phase5 has the
    // evidence. Set to true to reproduce it.
    reflection: {
        enabled: false,
        // Half resolution: the reflection is blurred by the roughness anyway, and this is the
        // one knob that pays for itself. One extra pass for the whole floor, no recursion.
        resolutionScale: 0.5,
        samples: 4,
        // Frames to wait after a resize before the floor samples the reflector again. Changing
        // the drawing buffer destroys the reflector's render target while WebGPU still has
        // submits referring to it, and the browser reports it. Two frames is enough for those
        // to drain; the floor renders without its reflection meanwhile, which is not visible.
        resumeFrames: 2,
        // Schlick F0 for a dielectric stone. Faint head-on, dominant at grazing, which is what
        // draws the long streaks of the reference.
        reflectivity: 0.04,
        // How much the material's own roughness blurs the reflection, in blur units.
        roughnessBlur: 3,
        strength: 1
    },

    // Free walk. The user asked for the film cameras and a free walk, so both ship and neither
    // replaces the other. See TyrellNavigation.js.
    //
    // Eye height is not here on purpose: it is taken at build time from the heights the Blender
    // cameras were placed at, so the walk sees the room from where it was shot. The fallback only
    // applies if the model ever arrives without usable cameras.
    navigation: {
        enabled: true,
        fallbackEyeHeight: 1.62,
        // A room 25 m across; a walking pace crosses it in about eighteen seconds.
        walkSpeed: 1.4, runSpeed: 3.2,
        // The walker as a vertical cylinder: how wide it is and how tall, in metres.
        radius: 0.35, height: 1.8,
        // What counts as a step rather than a wall, and how far down a drop is still ground.
        stepUp: 0.35, stepDown: 0.6,
        lookSensitivity: 0.0022, pitchLimitDeg: 85,
        transitionSeconds: 1.2
    },

    // Post-processing. The bloom numbers are Blender's own compositor glare, read from
    // _Blender/build_tyrell_v3.py and finish_tyrell_v3.py: Fog Glow, threshold 1,2, strength
    // 0,6, size 0,72. They act on the same linear render in both places.
    post: {
        enabled: true,
        // Strength measured, not copied across: see TyrellPost.js. Threshold and radius are
        // Blender's own Fog Glow values.
        bloom: { enabled: true, threshold: 1.2, strength: 0.3, radius: 0.72 },
        // Aerial perspective beyond the room, from the film rather than from Blender, which has
        // no volume out there. Distances in metres: the room ends around 16 m and the pyramid
        // sits at 269 m, so nothing inside the hall is touched.
        aerial: { enabled: true, strength: 0.45, startMetres: 60, fullMetres: 600, color: [0.186, 0.081, 0.023] },
        // The dust in the light shafts. Colour is Blender's Principled Volume, (0,66, 0,61,
        // 0,47). Its density of 0,005 is per metre of a homogeneous medium and does not map onto
        // the raymarcher's own scale, so this one is fitted against the render.
        beams: {
            enabled: true, strength: 1, color: [0.66, 0.61, 0.47],
            density: 0.5, maxDensity: 0.5, distanceAttenuation: 2, steps: 60, resolutionScale: 0.5
        }
    },

    // The lighting rig, read out of BladeRunner_5_6_High_v3.blend by tools/blender/leer_luces.py
    // and converted by tools/verificar-luces.mjs. Both reports are in docs/phase4/.
    //
    // Every colour here is LINEAR, as Blender stores it, so it must be assigned with
    // LinearSRGBColorSpace and never as a hex literal, which Three would read as sRGB.
    // Positions and targets are in glTF axes, metres, Y up.
    //
    // The GLB is not the source for any of this. It carries only the sun, and with stale values:
    // 683 lux (1,0 W/m²) and white, where the master has 2,25 W/m² and a warm amber. The four
    // area fills never left Blender at all.
    lighting: {
        sun: {
            // Blender's sun strength is irradiance in W/m² and Three's DirectionalLight intensity
            // enters the shader as irradiance too, so the number carries across unchanged.
            // The exported lux would be this times 683.
            intensity: 2.25,
            color: [1, 0.69, 0.34],
            // Blender softens the shadow with a 1,15° angular diameter. Three has no such control
            // on a directional light, so the softness comes from the shadow filter radius below.
            angularDiameterDeg: 1.1523
        },
        // Blender's world is a flat colour at strength 0,05. A uniform environment of radiance
        // C·S puts an irradiance of pi·C·S on an open surface, and Three's AmbientLight adds
        // colour times intensity straight into the irradiance, so the pi lives in the intensity.
        // This only feeds the diffuse; the specular half of the environment is the indirect
        // lighting item, still open in this phase.
        world: { color: [0.2, 0.25, 0.23], intensity: 0.15708 },
        // Indirect light. Blender path-traces the bounces and the viewer cannot, so the plan
        // asks to compare the options rather than assume one. `mode` picks the shipped default;
        // the viewer can switch between them for review. See TyrellLighting.js and
        // docs/phase4/indirecta.json for what each one measured.
        indirect: {
            mode: 'escena',
            // The same world as above, but as radiance rather than as an ambient irradiance:
            // an environment is sampled directly, so it carries no pi.
            color: [0.2, 0.25, 0.23], strength: 0.05,
            // Cube capture for the 'escena' mode, taken from the centre of the room. 256 is
            // Three's own default and matches the prefiltered chain it builds.
            captureSize: 256, captureNear: 0.1, captureFar: 2000
        },
        // Blender's lamps are discs carrying total power in watts. A Lambertian emitter of area A
        // has radiance P/(A·pi), which is what a RectAreaLight takes. Three has no disc light, so
        // each one becomes a square of equal area: power and radiance stay right and only the
        // silhouette changes, which a soft fill can afford.
        areaFills: [
            { name: 'L02 | Cielo por ventanal', position: [0, 4.2, -13.8], target: [0, 2.779558, -9.00601], size: 5.3174, intensity: 1.9138, color: [1, 0.72, 0.41], watts: 170 },
            { name: 'L03 | Rebote frontal frio', position: [0, 4.5, 7], target: [0, 3.862391, 2.040821], size: 6.2036, intensity: 0.4963, color: [0.48, 0.59, 0.63], watts: 60 },
            { name: 'L04 | Rebote piedra izquierda', position: [-7.7, 4.3, -3.4], target: [-3.405209, 2.198295, -4.862056], size: 3.5449, intensity: 1.7731, color: [1, 0.67, 0.32], watts: 70 },
            { name: 'L05 | Rebote piedra derecha', position: [7.7, 4.1, -7.2], target: [3.187545, 2.041687, -7.833328], size: 3.5449, intensity: 2.0264, color: [1, 0.7, 0.39], watts: 80 }
        ],
        shadow: {
            // The frustum is fitted to the room in the sun's own space at build time. Fixed
            // margin in metres so a caster right at the edge still projects.
            marginMetres: 0.75,
            // Bias in texels of the fitted map, not in metres: it then survives a change of
            // shadow resolution or of room size without being retuned.
            //
            // Kept small on purpose. Once the closed solids are culled to front faces, Three
            // casts their shadows from the back faces, which is what normally forces a large
            // normal bias, and the bias then only leaks light. Measured by sweeping it in the
            // browser: from 0 to 4 texels the contact at a column base moved from 0,0135 to
            // 0,0141, while the lit floor climbed from 0,6889 to 0,7191 and got noisier. There
            // is nothing to buy with a larger bias here.
            normalBiasTexels: 0.25,
            biasTexels: 0.6,
            // Radius of the percentage-closer filter, in texels.
            radius: 2
        }
    }
}
