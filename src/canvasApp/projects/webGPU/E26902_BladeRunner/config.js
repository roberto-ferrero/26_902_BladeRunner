export const TYRELL = {
    // Revision query prevents a cached, earlier export from being reused after deployment.
    asset: 'glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb?v=1',
    assetBytes: 40552456,
    referenceAspect: 2.4,
    initialCamera: 'CAM 01',
    exposure: 1.07,
    materialLook: 'tyrell-v1', // Reviewed material baseline; lighting/reflections still being calibrated.
    lightingProfile: 'tyrell-light-v1',
    lighting: {
        target: [0, 1, -5], discPosition: [2, 58, -650], shadowDistance: 80,
        discScale: 0.72, sunColor: 0xffd093, sunIntensity: 2.6,
        skyEmissionScale: 1.25, hemisphereIntensity: 0.65,
        areaIntensities: [0.65, 0.22, 0.45, 0.45]
    },
    quality: 'Media',
    pan: { enabled: true, horizontal: 0.25, vertical: 0.12, smoothness: 0.35, targetDistance: 20 },
    // Resolution budgets, not an inferred GPU ranking. Geometry is unchanged.
    profiles: {
        Baja: { pixelRatio: 0.75, shadowSize: 1024 },
        Media: { pixelRatio: 1, shadowSize: 2048 },
        Alta: { pixelRatio: 1.5, shadowSize: 2048 }
    },
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
