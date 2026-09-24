import { TYRELL } from './config'

export const PAN_SETTING_KEYS = {
    enabled: 'enabled', horizontalTravelMeters: 'horizontal',
    verticalTravelMeters: 'vertical', smoothingSeconds: 'smoothness'
}

export function cameraStatePan(configuration, cameraStateId) {
    const values = { ...configuration?.default, ...configuration?.states?.[cameraStateId] }
    const pan = { ...TYRELL.pan }
    for (const [key, value] of Object.entries(values)) {
        if (!Object.hasOwn(PAN_SETTING_KEYS, key) || (key === 'enabled' ? typeof value !== 'boolean' :
            !Number.isFinite(value) || value < 0 || value > 2)) throw new Error(`Paneo inválido: ${cameraStateId}.${key}`)
        pan[PAN_SETTING_KEYS[key]] = value
    }
    return pan
}

export const CAMERA_EASINGS = {
    linear: t => t,
    smoothstep: t => t * t * (3 - 2 * t),
    easeInOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function cameraTransition(defaults, override = {}) {
    const transition = { ...defaults, ...override }
    if (!Number.isFinite(transition.duration) || transition.duration < 0 || !Object.hasOwn(CAMERA_EASINGS, transition.easing)) {
        throw new Error('Transición de cámara inválida: revisa duration y easing.')
    }
    return transition
}

export function createCameraStates(document, settings) {
    if (document.version !== 1 || !Array.isArray(document.cameraStates) || !document.cameraStates.length) {
        throw new Error('Exportación de cameraStates vacía o incompatible.')
    }
    const ids = new Set()
    cameraTransition(settings.transition)
    const states = document.cameraStates.map(source => {
        const id = source.cameraStateId
        if (typeof id !== 'string' || !id || ids.has(id.toLowerCase())) throw new Error(`cameraStateId duplicado o vacío: ${id}`)
        ids.add(id.toLowerCase())
        for (const name of ['position', 'target']) {
            if (!Array.isArray(source[name]) || source[name].length !== 3 || !source[name].every(Number.isFinite)) throw new Error(`${id}: ${name} inválido`)
        }
        if (source.position.every((v, i) => v === source.target[i]) || !Number.isFinite(source.fov) || source.fov <= 0 || source.fov >= 180 ||
            !Number.isFinite(source.near) || source.near <= 0 || !Number.isFinite(source.far) || source.far <= source.near) throw new Error(`${id}: lente o target inválidos`)
        const manual = Object.hasOwn(settings.states || {}, id) ? settings.states[id] : {}
        if (Object.hasOwn(manual, 'key')) throw new Error(`${id}: configura la tecla en camera.stateKeys de gui.initial.json`)
        const viewOffset = { x: 0, y: 0, ...manual.viewOffset }
        if (![viewOffset.x, viewOffset.y].every(Number.isFinite)) throw new Error(`${id}: viewOffset inválido`)
        return { ...source, key: null, viewOffset, mousePan: cameraStatePan(null, id) }
    })
    if (!states.some(state => state.cameraStateId === settings.initial)) throw new Error(`Falta cameraState inicial: ${settings.initial}`)
    for (const [route, override] of Object.entries(settings.transitions || {})) {
        if (route.split('->').length !== 2 || !route.split('->').every(id => states.some(state => state.cameraStateId === id))) throw new Error(`Transición desconocida: ${route}`)
        cameraTransition(settings.transition, override)
    }
    return states
}

export function applyCameraStateKeys(states, bindings) {
    if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) {
        throw new Error('camera.stateKeys debe ser un objeto de IDs y teclas numéricas')
    }
    const ids = new Set(states.map(state => state.cameraStateId))
    const keys = new Set()
    for (const [id, key] of Object.entries(bindings)) {
        if (!ids.has(id)) throw new Error(`camera.stateKeys: estado desconocido ${id}`)
        if (typeof key !== 'string' || !/^[0-9]$/.test(key)) throw new Error(`camera.stateKeys.${id}: se esperaba una tecla numérica de 0 a 9`)
        if (keys.has(key)) throw new Error(`camera.stateKeys: tecla ${key} duplicada`)
        keys.add(key)
    }
    return states.map(state => ({ ...state, key: Object.hasOwn(bindings, state.cameraStateId) ? bindings[state.cameraStateId] : null }))
}

export function cameraStateForKey(states, key) {
    return states?.find(state => state.key != null && state.key === key?.toLowerCase())
}
