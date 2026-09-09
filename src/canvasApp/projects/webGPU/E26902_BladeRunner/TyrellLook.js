import { AgXToneMapping, SRGBColorSpace, LinearSRGBColorSpace, ColorManagement } from 'three'
import { TYRELL } from './config'

// Linear multipliers on the imported base color. Texture images and their color spaces stay intact.
export const MATERIAL_LOOK = {
    'PBR | Caliza ocre envejecida': { tint: [.96, 1, .92], normal: .28 },
    'PBR | Caliza aristas claras': { tint: [.98, 1, .94], normal: .26 },
    'PBR | Piedra negra pulida': { tint: [.94, .98, .94], normal: .025 },
    'PBR | Nogal oscuro': { tint: [1.05, 1.03, 1], normal: .16 },
    'Walnut | quarter sawn': { tint: [1.05, 1.03, 1], normal: .22 },
    'PBR | Raiz de nogal': { tint: [1, 1.02, 1], normal: .16 },
    'Burl walnut | table rim': { tint: [1, 1.02, 1], normal: .22 },
    'PBR | Cuero oscuro': { tint: [.94, .98, 1], normal: .22 },
    'Leather | oxblood': { tint: [.94, .98, 1], normal: .32 },
    'PBR | Bronce patinado': { tint: [.96, 1, .94], normal: .18, metalness: .72 },
    'Bronze | patinated': { tint: [.96, 1, .94], normal: .28, metalness: .72 },
    'PBR | Laton envejecido': { tint: [.96, 1, .94], roughness: .34, metalness: .8 },
    'Brass | polished highlights': { tint: [.96, 1, .94], roughness: .28, metalness: .82 },
    'Crystal': { color: [1, 1, 1], roughness: .035, transmission: 1, thickness: .006 }
}

export function applyColorReference(renderer, compensationEV = 0) {
    const ev = Number.isFinite(compensationEV) ? Math.max(-2, Math.min(2, compensationEV)) : 0
    ColorManagement.enabled = true
    ColorManagement.workingColorSpace = LinearSRGBColorSpace
    renderer.toneMapping = AgXToneMapping
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMappingExposure = TYRELL.exposure * 2 ** ev
    return { workingColorSpace: LinearSRGBColorSpace, outputColorSpace: SRGBColorSpace,
        toneMapping: 'AgX', baseExposure: TYRELL.exposure, compensationEV: ev, exposure: renderer.toneMappingExposure }
}

export default class TyrellLook {
    constructor(root) {
        this.original = new Map()
        root.traverse(object => {
            if (!object.isMesh) return
            for (const mat of [].concat(object.material || [])) if (!this.original.has(mat)) {
                this.original.set(mat, { color: mat.color?.clone(), normalScale: mat.normalScale?.clone(),
                    roughness: mat.roughness, metalness: mat.metalness, transmission: mat.transmission, thickness: mat.thickness })
            }
        })
    }
    apply(profile = 'imported') {
        if (!['imported', 'tyrell-v1'].includes(profile)) return
        this.profile = profile
        for (const [mat, source] of this.original) {
            mat.needsUpdate = true
            if (source.color) mat.color.copy(source.color)
            if (source.normalScale) mat.normalScale.copy(source.normalScale)
            for (const key of ['roughness', 'metalness', 'transmission', 'thickness']) {
                if (source[key] !== undefined) mat[key] = source[key]
            }
            const change = profile === 'tyrell-v1' && MATERIAL_LOOK[mat.name]
            if (!change) continue
            if (change.tint) mat.color.setRGB(source.color.r*change.tint[0], source.color.g*change.tint[1], source.color.b*change.tint[2], LinearSRGBColorSpace)
            if (change.color) mat.color.setRGB(...change.color, LinearSRGBColorSpace)
            if (change.normal !== undefined && source.normalScale) {
                mat.normalScale.set(Math.sign(source.normalScale.x)*change.normal, Math.sign(source.normalScale.y)*change.normal)
            }
            for (const key of ['roughness', 'metalness', 'transmission', 'thickness']) {
                if (change[key] !== undefined && source[key] !== undefined) mat[key] = change[key]
            }
        }
    }
    diagnostics() {
        return { profile: this.profile, status: 'v1 pending visual WebGPU approval', materialCount: this.original.size,
            adjusted: this.profile === 'tyrell-v1' ? [...this.original.keys()].filter(m => MATERIAL_LOOK[m.name]).map(m => m.name) : [] }
    }
}
