import { SRGBColorSpace, NoColorSpace } from 'three'

// Read-only diagnostics. GLTFLoader owns color-space assignment; never retag shared maps here.
const roles = {
    map: [SRGBColorSpace, 'RGB'], emissiveMap: [SRGBColorSpace, 'RGB'],
    normalMap: [NoColorSpace, 'RGB'], roughnessMap: [NoColorSpace, 'G'],
    metalnessMap: [NoColorSpace, 'B'], aoMap: [NoColorSpace, 'R'],
    transmissionMap: [NoColorSpace, 'R'], thicknessMap: [NoColorSpace, 'G']
}
export function auditMaterialMaps(root) {
    const materials = new Map(), textures = new Map(), issues = []
    root.traverse(object => {
        if (!object.isMesh) return
        for (const material of [].concat(object.material || [])) {
            if (!materials.has(material)) materials.set(material, { name: material.name, instances: 0, maps: [],
                roughness: material.roughness, metalness: material.metalness, normalScale: material.normalScale?.toArray() })
            const entry = materials.get(material); entry.instances++
            for (const [slot, [expected, channel]] of Object.entries(roles)) {
                const texture = material[slot]
                if (!texture) continue
                const uv = texture.channel === 0 ? 'uv' : `uv${texture.channel}`
                if (!object.geometry.hasAttribute(uv)) issues.push(`${object.name}: ${slot} missing ${uv}`)
                if (entry.instances > 1) continue
                const data = texture.source?.data
                const row = { slot, name: texture.name, colorSpace: texture.colorSpace || 'NoColorSpace',
                    expectedColorSpace: expected || 'NoColorSpace', channel, uv: texture.channel,
                    size: [data?.width || 0, data?.height || 0], flipY: texture.flipY,
                    repeat: texture.repeat.toArray(), offset: texture.offset.toArray() }
                entry.maps.push(row)
                if (texture.colorSpace !== expected) issues.push(`${material.name}: ${slot} color space mismatch`)
                if (!row.size[0] || !row.size[1]) issues.push(`${material.name}: ${slot} image unavailable`)
                if (texture.flipY) issues.push(`${material.name}: ${slot} unexpected glTF flipY`)
                if (!textures.has(texture)) textures.set(texture, new Set())
                textures.get(texture).add(expected)
            }
        }
    })
    for (const [texture, spaces] of textures) if (spaces.size > 1) issues.push(`${texture.name}: texture shared across color and data roles`)
    return { scope: '3.1 · Loaded material map bindings; read-only',
        materialCount: materials.size, textureCount: textures.size, issues: [...new Set(issues)], materials: [...materials.values()] }
}
