// The regions every comparison measures, in pixels of the 1920 x 800 comparison frame. They are
// shared so that two tools cannot drift apart and quietly compare different things.
//
// Each rectangle is chosen to sit inside one surface. A rectangle still covers a little more than
// the surface it names, so the numbers track change between phases rather than certify a match.

export const BLENDER = '../../_Blender/v3_renders'

export const REGIONS = {
    'CAM 01': {
        reference: `${BLENDER}/v3_general.png`,
        regions: {
            'suelo centro': { x: 780, y: 600, width: 380, height: 170 },
            'suelo lateral izquierdo': { x: 210, y: 650, width: 240, height: 130 },
            'columna izquierda': { x: 300, y: 160, width: 110, height: 340 },
            'friso superior': { x: 820, y: 20, width: 380, height: 55 },
            'cielo del vano': { x: 1010, y: 130, width: 140, height: 90 },
            'mesa de trabajo': { x: 800, y: 455, width: 280, height: 35 },
            'mueble derecho': { x: 1760, y: 340, width: 140, height: 110 }
        }
    },
    'CAM 02': {
        reference: `${BLENDER}/v3_detalle.png`,
        regions: {
            'campo de cuero': { x: 700, y: 470, width: 380, height: 110 },
            'licorera de cristal': { x: 1600, y: 430, width: 90, height: 180 },
            'vaso de cristal': { x: 1415, y: 545, width: 70, height: 80 },
            'respaldo del sillon': { x: 1230, y: 200, width: 200, height: 220 },
            'piramide del fondo': { x: 650, y: 120, width: 280, height: 230 },
            'estuche de instrumental': { x: 1120, y: 450, width: 240, height: 80 }
        }
    }
}

// Regions that live in shadow or rely on bounced light. These are the ones an indirect-lighting
// option has to lift, and the ones a wrong one will blow out.
export const SHADOWED = new Set([
    'suelo lateral izquierdo', 'columna izquierda', 'mesa de trabajo', 'mueble derecho',
    'respaldo del sillon'
])
