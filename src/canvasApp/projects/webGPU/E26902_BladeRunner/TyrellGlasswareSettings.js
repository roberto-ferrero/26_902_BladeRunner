// Shared schema for GUI controls, legacy defaults and the live glass material.
// Published starting values are supplied by gui.initial.json.
export const GLASSWARE_CONTROLS = [
    { key: 'color', label: 'Color base del cristal', type: 'color', value: '#f4efdf' },
    { key: 'transmission', label: 'Transparencia del cristal', value: .985, min: 0, max: 1, step: .005 },
    { key: 'roughness', label: 'Rugosidad del cristal', value: .035, min: 0, max: 1, step: .005 },
    { key: 'ior', label: 'Índice de refracción del cristal', value: 1.52, min: 1, max: 2.5, step: .01 },
    { key: 'thicknessScale', label: 'Espesor óptico del cristal', value: 1, min: 0, max: 5, step: .05, unit: '×' },
    { key: 'attenuationColor', label: 'Color de absorción del cristal', type: 'color', value: '#d4c8a6' },
    { key: 'attenuationDistance', label: 'Distancia de absorción del cristal', value: .22, min: .01, max: 2, step: .01, unit: 'm' },
    { key: 'clearcoat', label: 'Capa pulida del cristal', value: .35, min: 0, max: 1, step: .01 },
    { key: 'clearcoatRoughness', label: 'Rugosidad de la capa pulida', value: .035, min: 0, max: 1, step: .005 },
    { key: 'imperfections', label: 'Imperfecciones del cristal', value: 1, min: 0, max: 3, step: .05, unit: '×' },
    { key: 'bottleHeightScale', label: 'Altura de la botella', value: 1.2, min: .5, max: 2, step: .05, unit: '×' }
]

export const GLASSWARE_DEFAULTS = Object.fromEntries(GLASSWARE_CONTROLS.map(({ key, value }) => [key, value]))
