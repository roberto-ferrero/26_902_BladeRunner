// Manual settings survive re-exporting the cameras from Blender.
export const CAMERA_STATES = {
    initial: 'initial',
    transition: { duration: 4.5, easing: 'smoothstep' },
    states: {
        initial: { key: '0', viewOffset: { x: 0, y: 0 } },
        p1: { key: '1', viewOffset: { x: 0, y: 0 } }
    },
    // Optional directed overrides: 'initial->p1': { duration: 3, easing: 'easeInOutCubic' }
    transitions: {}
}
