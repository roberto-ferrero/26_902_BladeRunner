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
    sunIntensity: 2.25,
    hemisphereIntensity: 0.35,
    // Provisional fills in glTF coordinates (metres, Y up). Calibrate in phase 4.
    areaFills: [
        { position: [0, 4.2, -13.8], target: [0, 1, -3], color: 0xffc184, intensity: 2.4, size: 6 },
        { position: [0, 4.5, 7], target: [0, 2.7, -7], color: 0x91a7ac, intensity: 0.7, size: 7 },
        { position: [-7.7, 4.3, -3.4], target: [-3, 2, -5], color: 0xeeb476, intensity: 1.1, size: 4 },
        { position: [7.7, 4.1, -7.2], target: [2, 1.5, -8], color: 0xffc58e, intensity: 1.3, size: 4 }
    ]
}
