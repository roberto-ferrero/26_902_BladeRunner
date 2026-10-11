import { TOWER_WINDOWS, FACE_WINDOWS, ELEVATORS } from './TyrellPyramidDefaults'

// Shared schema for the "Pirámide Tyrell" GUI panel, gui.initial.json (pyramid.<group>.<key>) and the live building.
// Starting values come from the reviewed settings in the v3 viewer; gui.initial.json publishes them.
const windowControls = prefix => [
    ['intensity', 'Intensidad', 0, 20, .05],
    ['zoneDark', 'Oscurecer zona', 0, 1, .01],
    ['offGlass', 'Vidrio apagado', 0, 1, .01],
    ['lit', 'Oficinas encendidas', 0, 1, .01],
    ['strips', 'Tiras continuas', 0, 1, .01],
    ['windowOff', 'Apagadas en oficina', 0, 1, .01],
    ['boost', 'Más intensas (cuota)', 0, .5, .01],
    ['boostGain', 'Más intensas (ganancia)', 1, 8, .1],
    ['warm', 'Cálidas (cuota)', 0, 1, .01],
    ['colPitch', 'Paso horizontal', .05, 2, .01, 'm'],
    ['rowPitch', 'Paso vertical', .1, 4, .01, 'm'],
    ['width', 'Ancho de ventana', .05, 1, .01],
    ['height', 'Alto de ventana', .02, 1, .01],
    ['darkFloors', 'Planta oscura cada', 0, 40, 1],
    ...prefix,
    ['seed', 'Semilla', 0, 100, 1],
    ['coolColor', 'Color frío', 'color'],
    ['warmColor', 'Color cálido', 'color']
]

const GROUPS = [
    { group: 'towerWindows', title: 'Ventanas de las torres', prefix: 'Ventanas torres', defaults: TOWER_WINDOWS, controls: windowControls([
        ['sideMarginU', 'Laterales: reserva ancho', 0, 3, .05, 'm'],
        ['sideMarginV', 'Laterales: reserva largo', 0, 10, .1, 'm'],
        ['zoneMarginU', 'Frente: reserva ancho', 0, 2, .05, 'm'],
        ['zoneMarginV', 'Frente: reserva largo', 0, 5, .1, 'm']
    ]) },
    { group: 'faceWindows', title: 'Ventanas de la pirámide', prefix: 'Ventanas pirámide', defaults: FACE_WINDOWS, controls: windowControls([
        ['zoneMarginU', 'Paneles: reserva ancho', 0, 2, .05, 'm'],
        ['zoneMarginV', 'Paneles: reserva largo', 0, 5, .1, 'm'],
        ['panelWidth', 'Ancho de columna', .5, 20, .1, 'm'],
        ['columnGap', 'Aire entre columnas', 0, 5, .05, 'm'],
        ['panelHeight', 'Largo de sector', 1, 60, .5, 'm'],
        ['sectorGap', 'Aire entre sectores', 0, 10, .1, 'm'],
        ['laneGap', 'Aire junto al carril', 0, 10, .1, 'm'],
        ['cornerMargin', 'Reserva a las aristas', 0, 10, .1, 'm'],
        ['topMargin', 'Reserva cumbre y terrazas', 0, 20, .1, 'm'],
        ['section0', 'Sección 0 (cumbre)', 'checkbox'],
        ['section1', 'Sección 1', 'checkbox'],
        ['section2', 'Sección 2', 'checkbox'],
        ['section3', 'Sección 3 (base)', 'checkbox']
    ]) },
    { group: 'elevators', title: 'Ascensores y carriles', prefix: 'Ascensores', defaults: ELEVATORS, controls: [
        ['railDark', 'Carriles: oscurecer', 0, 1, .01],
        ['railColor', 'Carriles: color', 'color'],
        ['cabinBase', 'Cabina: color base', 'color'],
        ['stripIntensity', 'Cabina: franja intensidad', 0, 10, .05],
        ['stripWidth', 'Cabina: franja ancho', .02, 1.5, .01, 'm'],
        ['stripLength', 'Cabina: franja largo', .05, 3, .01, 'm'],
        ['stripColor', 'Cabina: color luz', 'color'],
        ['lampIntensity', 'Focos: intensidad', 0, 500, 1, 'cd'],
        ['lampDistance', 'Focos: alcance', 1, 100, 1, 'm'],
        ['lampAngle', 'Focos: apertura', 2, 60, .5, '°'],
        ['lampDecay', 'Focos: decay', 0, 4, .1],
        ['lampColor', 'Focos: color', 'color'],
        ['beam', 'Haz visible: intensidad', 0, 3, .01],
        ['beamLength', 'Haz visible: longitud', 1, 60, .5, 'm'],
        ['beamDecay', 'Haz visible: decay', 0, 8, .1],
        ['strobe', 'Estrobo: intensidad', 0, 20, .05],
        ['strobeSize', 'Estrobo: tamaño', .1, 6, .05, 'm'],
        ['strobeHardness', 'Estrobo: dureza', 0, 1, .01],
        ['strobeColor', 'Estrobo: color', 'color'],
        ['strobePeriod', 'Estrobo: periodo', .3, 5, .05, 's'],
        ['move', 'Mover ascensores', 'checkbox'],
        ['speed', 'Velocidad de ascensores', .1, 20, .1, 'm/s']
    ] }
]

export const PYRAMID_GROUPS = GROUPS.map(({ group, title, prefix, defaults, controls }) => ({
    group, title,
    controls: controls.map(([key, name, typeOrMin, max, step, unit = '']) => {
        const type = typeof typeOrMin === 'string' ? typeOrMin : 'range'
        return { group, key, path: `pyramid.${group}.${key}`, label: `${prefix} · ${name}`, name, type, value: defaults[key],
            ...(type === 'range' ? { min: typeOrMin, max, step, unit } : {}) }
    })
}))
export const PYRAMID_CONTROLS = PYRAMID_GROUPS.flatMap(({ controls }) => controls)
