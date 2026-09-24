// Manual settings survive re-exporting the cameras from Blender.
export const CAMERA_STATES = {
    initial: 'initial',
    transition: { duration: 4.5, easing: 'smoothstep' },
    // Optional viewOffset overrides. Exported states otherwise use { x: 0, y: 0 }.
    states: {},
    // Optional directed overrides: 'initial->p1': { duration: 3, easing: 'easeInOutCubic' }
    transitions: {}
}
