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
            normalBiasTexels: 1.5,
            biasTexels: 0.6,
            // Radius of the percentage-closer filter, in texels.
            radius: 2
        }
    }
}
