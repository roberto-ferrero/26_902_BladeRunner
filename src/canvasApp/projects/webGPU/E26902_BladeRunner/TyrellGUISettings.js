// Paths are the public configuration API; labels bind to the existing UI actions.
export const GUI_BINDINGS = [
    ["viewer.deviceMode", "Modo de dispositivo"],
    ["viewer.quality", "Calidad"],
    ["viewer.referenceFrameEnabled", "Encuadre 2,4:1"],
    ["viewer.renderBudget", "Presupuesto de render"],
    ["camera.transition.durationSeconds", "Duración de transición"],
    ["camera.transition.easing", "Easing de transición"],
    ["camera.mousePan.default.enabled", "Activar paneo"],
    ["camera.mousePan.default.horizontalTravelMeters", "Recorrido horizontal"],
    ["camera.mousePan.default.verticalTravelMeters", "Recorrido vertical"],
    ["camera.mousePan.default.smoothingSeconds", "Suavidad"],
    ["materials.profile", "Acabado"],
    ["materials.exposureCompensationEV", "Compensación de exposición"],
    ["materials.studioLightEnabled", "Luz de estudio"],
    ["materials.blackStoneNormalEnabled", "Normal de piedra negra"],
    ["lighting.profile", "Iluminación"],
    ["lighting.contribution", "Aporte de luz"],
    ["lighting.indirectMode", "Luz indirecta"],
    ["reflections.floor.enabled", "Reflejo del suelo"],
    ["reflections.floor.finish", "Acabado del reflejo"],
    ["reflections.floor.resolutionScale", "Resolución del reflejo"],
    ["reflections.floor.updateMode", "Actualización del reflejo"],
    ["reflections.metalAndGlassEnabled", "Reflejos en metal y vidrio"],
    ["atmosphere.exterior.enabled", "Profundidad exterior"],
    ["atmosphere.exterior.strength", "Intensidad de profundidad exterior"],
    ["atmosphere.interior.enabled", "Bruma interior"],
    ["atmosphere.interior.strength", "Intensidad de bruma interior"],
    ["atmosphere.lightBeams.enabled", "Haces de luz"],
    ["atmosphere.lightBeams.strength", "Intensidad de haces"],
    ["atmosphere.dust.enabled", "Polvo en suspensión"],
    ["atmosphere.dust.motionSpeed", "Movimiento del polvo"],
    ["sky.enabled", "Cielo panorámico"],
    ["sky.heightPercent", "Altura del cielo"],
    ["sky.radialDarkeningPercent", "Oscurecimiento radial"],
    ["postProcessing.bloom.enabled", "Bloom"],
    ["postProcessing.bloom.strength", "Intensidad del bloom"],
    ["postProcessing.bloom.radius", "Radio del bloom"],
    ["postProcessing.bloom.threshold", "Umbral del bloom"],
    ["postProcessing.colorGrading.enabled", "Color cinematográfico"],
    ["postProcessing.colorGrading.strength", "Intensidad del color"],
    ["postProcessing.sunLensFlare.enabled", "Lens flare solar"],
    ["postProcessing.sunLensFlare.intensity", "Intensidad del lens flare"],
    ["postProcessing.sunLensFlare.size", "Tamaño del lens flare"],
    ["city.buildings.enabled", "Edificios bajos"],
    ["city.buildings.color.hueDegrees", "Matiz de edificios de relleno"],
    ["city.buildings.color.saturationPercent", "Saturación de edificios de relleno"],
    ["city.buildings.color.lightnessPercent", "Luminosidad de edificios de relleno"],
    ["city.buildings.orientationColor.cameraDLightnessPercent", "Luminosidad al orientar como Camera_D"],
    ["city.buildings.orientationColor.cam02LightnessPercent", "Luminosidad al orientar como CAM 02"],
    ["city.buildings.orientationColor.rightBuildingLightnessStep", "Variación L por edificio a la derecha"],
    ["city.buildings.orientationColor.leftBuildingLightnessStep", "Variación L por edificio a la izquierda"],
    ["city.buildings.orientationColor.mode", "Color según orientación"],
    ["city.buildings.orientationColor.extraLowQualityEnabled", "Color por orientación en LOD Extra baja"],
    ["city.buildings.orientationColor.lowQualityEnabled", "Color por orientación en LOD Baja"],
    ["city.buildings.orientationColor.mediumQualityEnabled", "Color por orientación en LOD Media"],
    ["city.buildings.orientationColor.highQualityEnabled", "Color por orientación en LOD Alta"],
    ["city.buildings.orientationColor.ultraHighQualityEnabled", "Color por orientación en LOD UltraAlta"],
    ["city.lights.buildingIntensity", "Luces de edificios"],
    ["city.lights.whiteBeaconIntensity", "Balizas blancas"],
    ["city.distantTraffic.densityPercent", "Densidad de tráfico lejano"],
    ["city.nearTraffic.enabled", "Tráfico cercano"],
    ["city.nearTraffic.travelDurationSeconds", "Duración del trayecto cercano"],
    ["city.flames.enabled", "Llamaradas"],
    ["city.flames.intervalSeconds", "Intervalo de llamaradas"],
    ["city.flames.sizeMultiplier", "Tamaño de llamaradas"],
    ["city.flames.verticalGrowthMultiplier", "Crecimiento vertical de llamaradas"],
    ["city.flames.intensity", "Intensidad de llamaradas"],
    ["voightKampff.deployOnArrival", "Desplegar al llegar a p1"],
    ["voightKampff.chassisColor", "Color del chasis"],
    ["voightKampff.reduceReflectionCapturesAtP1", "Reducir capturas de reflejos en p1"]
]

export function flattenSettings(value, prefix = '', result = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Objeto de configuración inválido: ${prefix || 'raíz'}`)
    for (const [key, entry] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key
        if (entry !== null && typeof entry === 'object') flattenSettings(entry, path, result)
        else result[path] = entry
    }
    return result
}

// Validate every setting before changing any control or scene component.
export function prepareGUISettings(root, settings, cameraStates) {
    const values = flattenSettings(settings)
    // Optional additions to schema 1 preserve previously saved configurations.
    if (!('viewer.deviceMode' in values)) values['viewer.deviceMode'] = 'auto'
    for (const [added, original] of [['extraLowQualityEnabled', 'lowQualityEnabled'], ['ultraHighQualityEnabled', 'highQualityEnabled']]) {
        const key = `city.buildings.orientationColor.${added}`
        if (!(key in values)) values[key] = values[`city.buildings.orientationColor.${original}`]
    }
    if (values.schemaVersion !== 1) throw new Error('schemaVersion debe ser 1')
    if (!cameraStates.some(state => state.cameraStateId === values['camera.initialState'])) throw new Error('camera.initialState no existe en los estados de cámara')
    const known = new Set(['schemaVersion', 'camera.initialState', ...GUI_BINDINGS.map(([path]) => path)])
    const stateKeys = settings.camera?.stateKeys
    applyCameraStateKeys(cameraStates, stateKeys)
    for (const id of Object.keys(stateKeys)) known.add(`camera.stateKeys.${id}`)
    const overrides = []
    for (const [id, pan] of Object.entries(settings.camera.mousePan.states || {})) {
        if (!cameraStates.some(state => state.cameraStateId === id)) throw new Error(`Paneo de estado desconocido: ${id}`)
        if (!pan || typeof pan !== 'object' || Array.isArray(pan)) throw new Error(`Paneo inválido: ${id}`)
        for (const key of Object.keys(pan)) {
            const path = `camera.mousePan.states.${id}.${key}`
            const binding = GUI_BINDINGS.find(([name]) => name === `camera.mousePan.default.${key}`)
            if (!binding) throw new Error(`Parámetro desconocido: ${path}`)
            known.add(path)
            overrides.push([path, binding[1]])
        }
    }
    for (const path of Object.keys(values)) if (!known.has(path)) throw new Error(`Parámetro desconocido: ${path}`)
    const validated = [...GUI_BINDINGS, ...overrides].map(([path, label]) => {
        const control = root.querySelector(`[aria-label="${label}"]`)
        if (!control) throw new Error(`No existe el control de ${path}`)
        const value = values[path]
        const checkbox = control.type === 'checkbox'
        const numeric = ['range', 'number'].includes(control.type)
        const expected = checkbox ? 'boolean' : numeric ? 'number' : 'string'
        if (typeof value !== expected || (numeric && !Number.isFinite(value))) throw new Error(`${path}: se esperaba ${expected}`)
        if (control.type === 'color' && !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${path}: se esperaba un color hexadecimal #RRGGBB`)
        if (numeric && ((control.min !== '' && value < Number(control.min)) || (control.max !== '' && value > Number(control.max)))) throw new Error(`${path}: fuera del intervalo ${control.min}–${control.max}`)
        if (numeric && control.step && control.step !== 'any') {
            const steps = (value - Number(control.min || 0)) / Number(control.step)
            if (Math.abs(steps - Math.round(steps)) > 1e-7) throw new Error(`${path}: debe respetar el paso ${control.step}`)
        }
        if (control.tagName === 'SELECT' && !Array.from(control.options).some(option => option.value === value)) throw new Error(`${path}: opción inválida ${value}`)
        return { control, value, checkbox }
    })
    // Validate all defaults/overrides first; initialize the controls with the selected state's values.
    const pan = cameraStatePan(settings.camera.mousePan, settings.camera.initialState)
    return validated.slice(0, GUI_BINDINGS.length).map((entry, i) => {
        const path = GUI_BINDINGS[i][0]
        return path.startsWith('camera.mousePan.default.')
            ? { ...entry, value: pan[PAN_SETTING_KEYS[path.split('.').at(-1)]] } : entry
    })
}

export function applyGUISettings(prepared) {
    for (const { control, value, checkbox } of prepared) {
        if (checkbox) control.checked = value
        else control.value = String(value)
        // Reuse the same update pipeline as user edits, including output labels.
        const handler = control.oninput || control.onchange
        if (!handler) throw new Error('Control configurable sin acción')
        handler.call(control, { target: control })
    }
}
import { PAN_SETTING_KEYS, cameraStatePan, applyCameraStateKeys } from './TyrellCameraStates'
