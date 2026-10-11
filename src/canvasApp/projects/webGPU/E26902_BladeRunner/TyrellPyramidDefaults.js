// Reviewed starting values of the v3 building (windows of towers and pyramid faces, elevator lane).
// Plain data so the GUI schema and its tests do not load three.js node modules; gui.initial.json publishes them.

export const TOWER_WINDOWS = Object.freeze({
    intensity: 1.1,        // emission of a lit window (linear, before exposure)
    zoneDark: 0.3,         // darkening of the whole window area (inside the reserves)
    offGlass: 0.55,        // darkening of unlit glass on the concrete
    lit: 0.19,             // share of lit offices
    strips: 0.61,          // share of lit offices that read as one continuous strip
    windowOff: 0.12,       // share of dark windows inside a lit office
    boost: 0.15,           // share of offices brighter than the rest
    boostGain: 1.3,
    warm: 0.59,            // share of warm offices (the rest are cool white)
    colPitch: 0.15,        // metres between window columns
    rowPitch: 0.5,         // metres between floors
    width: 0.34,           // window width / column pitch
    height: 0.07,          // window height / floor pitch
    darkFloors: 20,        // every Nth floor stays dark (0 = none)
    sideMarginU: 1.1, sideMarginV: 0,     // tower side walls: reserve to the edges (across, along) in metres
    zoneMarginU: 0.1, zoneMarginV: 0,     // tower columns and "T" insets; pyramid panels
    seed: 0,
    coolColor: '#c6e5ff', warmColor: '#ffc17a'
})

// The pyramid starts from the tower values with its own adjustments, plus the panel layout:
// columns outward from the elevator lane, cut into sectors along the slope, with air between them.
export const FACE_WINDOWS = Object.freeze({ ...TOWER_WINDOWS,
    intensity: 1.3, zoneDark: 0.52, offGlass: 0.42, lit: 0.18, strips: 0.64, rowPitch: 0.45,
    panelWidth: 4.5,       // column width (m)
    columnGap: 1.7,        // air between columns (m)
    panelHeight: 43,       // sector length along the slope (m)
    sectorGap: 1,          // air between sectors (m)
    laneGap: 1.5,          // air between the elevator lane (or the face centre line) and the first column (m)
    cornerMargin: 2.1,     // reserve to the corner edges of the face (m)
    topMargin: 9.9,        // reserve below the summit and below each terrace (m)
    section0: true, section1: true, section2: true, section3: false
})

// Hex colours are edited as plain 0-1 components (as in the review viewer), not converted to linear.
export const hexToComponents = hex => [0, 2, 4].map(i => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)

export const ELEVATORS = Object.freeze({
    railDark: 0.55, railColor: '#ffffff',
    cabinBase: '#292929', stripIntensity: 0.05, stripWidth: 0.6, stripLength: 0.31, stripColor: '#d59330',
    lampIntensity: 80, lampDistance: 30, lampAngle: 10, lampDecay: 2, lampColor: '#ffe2b7',
    beam: 0.02, beamLength: 3, beamDecay: 6.1,
    strobe: 0.2, strobeSize: 0.35, strobeHardness: 0.67, strobeColor: '#ff0000', strobePeriod: 1.6,
    move: true, speed: 1.3
})
