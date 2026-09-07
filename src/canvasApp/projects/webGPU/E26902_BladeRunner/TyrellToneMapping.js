import { Fn, vec3, mat3, float, max, log2, clamp, pow, mul, sub, uniform } from 'three/tsl'
import { TYRELL } from './config'

// Uniforms, not constants, so the look can be switched off for an A/B without recompiling any
// shader. Contrast 1 makes the look the identity, which is exactly stock AgX.
export const lookContrast = uniform(TYRELL.look.contrast)
export const lookPivot = uniform(TYRELL.look.pivot)
export function setLookEnabled(enabled) {
    lookContrast.value = enabled ? TYRELL.look.contrast : 1
    lookPivot.value = TYRELL.look.pivot
}

// AgX with the look the reference renders were made with.
//
// Blender rendered v3_general.png and v3_detalle.png with view transform AgX and the look
// "AgX - Medium High Contrast" (see _Blender/build_tyrell_v3.py). Three.js r182 ships AgX base
// only, with no look, which lifts the shadows badly: measured against Blender at -6 EV, Three
// reports 0.115 where Blender reports 0.070.
//
// The look is an OCIO GradingPrimaryTransform in log style, contrast 1.2, saturation 1. Because
// saturation is 1 and the three channel contrasts are equal, it is a pure per-channel curve on
// the normalised log value, so it drops straight into Three's chain between the log
// normalisation and the sigmoid. The constants live in config.js and were fitted against a
// measured Blender ramp by tools/calibrar-color.mjs, which also reports the residual.
//
// The body below mirrors agxToneMapping from three/src/nodes/display/ToneMappingFunctions.js at
// r182; agxDefaultContrastApprox is not exported, so it is inlined.

const LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
    vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187))
const LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
    vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956))

const agxDefaultContrastApprox = Fn(([x_immutable]) => {
    const x = vec3(x_immutable).toVar()
    const x2 = vec3(x.mul(x)).toVar()
    const x4 = vec3(x2.mul(x2)).toVar()
    return float(15.5).mul(x4.mul(x2)).sub(mul(40.14, x4.mul(x))).add(mul(31.96, x4)
        .sub(mul(6.868, x2.mul(x))).add(mul(0.4298, x2).add(mul(0.1191, x).sub(0.00232))))
})

export const agxLookToneMapping = Fn(([color, exposure]) => {
    const colortone = vec3(color).toVar()
    const AgXInsetMatrix = mat3(
        vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
        vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
        vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859))
    const AgXOutsetMatrix = mat3(
        vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
        vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
        vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405))
    const AgxMinEv = float(-12.47393)
    const AgxMaxEv = float(4.026069)
    colortone.mulAssign(exposure)
    colortone.assign(LINEAR_SRGB_TO_LINEAR_REC2020.mul(colortone))
    colortone.assign(AgXInsetMatrix.mul(colortone))
    colortone.assign(max(colortone, 1e-10))
    colortone.assign(log2(colortone))
    colortone.assign(colortone.sub(AgxMinEv).div(AgxMaxEv.sub(AgxMinEv)))
    colortone.assign(clamp(colortone, 0.0, 1.0))
    // The look. Everything above and below is stock AgX.
    colortone.assign(clamp(sub(colortone, lookPivot).mul(lookContrast).add(lookPivot), 0.0, 1.0))
    colortone.assign(agxDefaultContrastApprox(colortone))
    colortone.assign(AgXOutsetMatrix.mul(colortone))
    colortone.assign(pow(max(vec3(0.0), colortone), vec3(2.2)))
    colortone.assign(LINEAR_REC2020_TO_LINEAR_SRGB.mul(colortone))
    colortone.assign(clamp(colortone, 0.0, 1.0))
    return colortone
}).setLayout({
    name: 'agxLookToneMapping',
    type: 'vec3',
    inputs: [{ name: 'color', type: 'vec3' }, { name: 'exposure', type: 'float' }]
})

// Same maths in plain JavaScript, so the shader can be checked without a GPU. Every matrix in
// the chain preserves grey, so a grey input collapses to this scalar form.
export function agxLookScalar(linear, exposure = 1, look = TYRELL.look) {
    const clamp01 = v => Math.min(1, Math.max(0, v))
    const value = Math.max(linear * exposure, 1e-10)
    let t = clamp01((Math.log2(value) + 12.47393) / (4.026069 + 12.47393))
    t = clamp01((t - look.pivot) * look.contrast + look.pivot)
    const t2 = t * t, t4 = t2 * t2
    const shaped = 15.5 * t4 * t2 - 40.14 * t4 * t + 31.96 * t4 - 6.868 * t2 * t + 0.4298 * t2 + 0.1191 * t - 0.00232
    return clamp01(Math.pow(Math.max(0, shaped), 2.2))
}
