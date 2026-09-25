import { Box3, Group, Vector3 } from 'three'
import { MeshPhysicalNodeMaterial } from 'three/webgpu'
import { bumpMap, materialRoughness, mx_noise_float, positionGeometry, uniform, vec3 } from 'three/tsl'
import { GLASSWARE_DEFAULTS } from './TyrellGlasswareSettings.js'

export const GLASSWARE_ASSET = 'glbs/E26902_BladeRunner/Glassware.glb?v=3'
export const GLASSWARE_SCALE = 1.5

function finishGlass(material, detail) {
    // Object-space detail keeps the original mesh/UVs intact and moves with it.
    // Band-limit mould waviness to the pixel footprint, avoiding sparkling dots.
    const waviness = mx_noise_float(positionGeometry.mul(vec3(170, 75, 170)))
    const visibleDetail = positionGeometry.fwidth().length().mul(170).smoothstep(.25, .85).oneMinus()
    material.normalNode = bumpMap(waviness, detail.mul(.000025).mul(visibleDetail))
    material.roughnessNode = materialRoughness.add(waviness.mul(.008).mul(visibleDetail).mul(detail)).clamp(0, 1)
    material.userData.tyrellGlass = true
    material.userData.glassEnvironmentIntensity = 1.15
    material.userData.glassShadowOpacity = .38
    return material
}

function glassMaterial(name, thickness, detail, thicknessScale) {
    const material = new MeshPhysicalNodeMaterial({ color: '#f4efdf', roughness: .025,
        metalness: 0, transmission: .985, thickness: thickness * GLASSWARE_SCALE, ior: 1.52,
        attenuationColor: '#d4c8a6', attenuationDistance: .22,
        clearcoat: .35, clearcoatRoughness: .035 })
    material.name = name
    finishGlass(material, detail)
    // The tumbler's heavy bottom absorbs/distorts more than its thin walls.
    if (thickness < .01) material.thicknessNode = positionGeometry.y.smoothstep(.006, .020).mix(.022, .006).mul(GLASSWARE_SCALE).mul(thicknessScale)
    return material
}

export function addGlassware(root, imported) {
    const models = Object.fromEntries(['Licorera', 'Tapon', 'Vaso'].map(name => [name, imported?.getObjectByName(name)]))
    for (const [name, model] of Object.entries(models)) {
        if (!model?.isMesh) throw new Error(`Falta la malla ${name} en Glassware.glb`)
    }
    const names = ['Cut_crystal_decanter', 'Crystal_tumbler', 'Crystal_tumbler001']
    const sources = names.map(name => root.getObjectByName(name))
    if (sources.some(source => !source?.isMesh)) throw new Error('No se encuentran los apoyos de la cristalería original')
    root.updateMatrixWorld(true)
    const previousMaterials = new Set(Object.values(models).flatMap(mesh => [].concat(mesh.material)))
    const detail = uniform(GLASSWARE_DEFAULTS.imperfections), thicknessScale = uniform(GLASSWARE_DEFAULTS.thicknessScale)
    models.Licorera.material = glassMaterial('Crystal / imported empty decanter', .008, detail, thicknessScale)
    models.Tapon.material = glassMaterial('Crystal / imported stopper', .05, detail, thicknessScale)
    models.Vaso.material = glassMaterial('Crystal / imported empty tumbler', .006, detail, thicknessScale)
    for (const material of previousMaterials) material.dispose()
    models.Licorera.renderOrder = 2
    models.Tapon.renderOrder = 2
    models.Vaso.renderOrder = 2
    const groups = []
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i]
        const bounds = new Box3().setFromObject(source)
        const centre = bounds.getCenter(new Vector3())
        const group = new Group()
        group.name = `${source.name} / imported glassware`
        group.position.copy(root.worldToLocal(new Vector3(centre.x, bounds.min.y, centre.z)))
        group.scale.setScalar(GLASSWARE_SCALE)
        if (i === 0) group.add(models.Licorera, models.Tapon)
        else group.add(i === 1 ? models.Vaso : models.Vaso.clone())
        source.visible = false
        root.add(group)
        groups.push(group)
    }
    const oldStopper = root.getObjectByName('Crystal_stopper')
    if (oldStopper) oldStopper.visible = false
    const settings = { ...GLASSWARE_DEFAULTS }
    const materials = Object.values(models).map(mesh => mesh.material)
    const baseThickness = materials.map(material => material.thickness)
    const configure = values => {
        Object.assign(settings, values)
        detail.value = settings.imperfections
        thicknessScale.value = settings.thicknessScale
        // The imported origin is the table contact; width/depth and feet stay fixed.
        groups[0].scale.y = GLASSWARE_SCALE * settings.bottleHeightScale
        materials.forEach((material, index) => {
            const recompile = (material.transmission > 0) !== (settings.transmission > 0)
                || (material.clearcoat > 0) !== (settings.clearcoat > 0)
            material.color.set(settings.color)
            material.attenuationColor.set(settings.attenuationColor)
            for (const key of ['transmission', 'roughness', 'ior', 'attenuationDistance', 'clearcoat', 'clearcoatRoughness']) material[key] = settings[key]
            material.thickness = baseThickness[index] * settings.thicknessScale
            if (recompile) material.needsUpdate = true
        })
    }
    configure(settings)
    return { vessels: 3, groups, materials, settings, configure, scale: GLASSWARE_SCALE, empty: true, source: 'licorera_vaso_v2.blend' }
}

