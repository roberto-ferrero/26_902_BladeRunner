# Cristalería · recipientes vacíos y acabado mate de mesa

La escena utiliza las mallas `Licorera`, `Tapon` y `Vaso` de `_Fuentes/Vaso y licorera/licorera_vaso_v2.blend`, a escala base 1,5 desde el apoyo sobre la mesa. La botella y su tapón tienen además un factor vertical 1,2: altura final 41,44 cm; los vasos conservan sus 12,78 cm. El ancho, el apoyo, el archivo fuente y los vértices importados se conservan.

## Controles de material

GUI → Cristalería permite editar en directo el material común de botella, tapón y vasos. Los valores iniciales están en `static/config/E26902_BladeRunner/gui.initial.json`, bloque `glassware`; basta editar y recargar. Los cambios de GUI duran la sesión. Cambiar el acabado general de la escena no restablece estos ajustes.

- `color`: color base hexadecimal; `transmission`: paso de luz de 0 (opaco) a 1 (máximo), manteniendo reflejos y refracción física.
- `roughness`: rugosidad de 0 a 1; `ior`: índice de refracción de 1 a 2,5.
- `thicknessScale`: multiplicador del espesor óptico (0–5), sin cambiar la malla ni su silueta.
- `attenuationColor`: color de absorción hexadecimal; `attenuationDistance`: distancia en metros (0,01–2). Menor distancia, tinte más intenso.
- `clearcoat` y `clearcoatRoughness`: intensidad y rugosidad de la capa pulida (0–1).
- `imperfections`: intensidad de las ondulaciones filtradas (0–3); 0 deja el cristal liso.
- `bottleHeightScale`: factor vertical de botella y tapón sobre la escala base (0,5–2), inicialmente 1,2. No cambia los vasos.

## Revisión actual

- Botella y vasos vacíos. Se ha eliminado la geometría del whisky del GLB y su material de ejecución.
- La botella vuelve al vidrio físico estándar, sin la captura de fondo especial que permitía mostrar el líquido anidado.
- Se elimina el plano de reflexión añadido sobre la mesa. Permanecen únicamente las sombras suaves de contacto.
- La madera de `Table_Slab` conserva sus mapas, con rugosidad mínima 0,46 para evitar el brillo estrecho de una superficie pulida. Los metales y el pavimento conservan su acabado.
- El vidrio conserva ondulaciones suaves de molde, filtradas según el tamaño del píxel. Se han retirado el ruido muy fino y las inclusiones que creaban centelleos de menos de un píxel.
- La sonda local de los reflejos del vidrio aumenta a 512 px por cara. Sus paneles cálidos sólo aparecen en esa sonda, nunca en la imagen de la mesa.
- En escritorio, «Alta» pasa de ratio de píxel 0,75 a 1 (resolución CSS completa) y «UltraAlta» de 1 a 1,5 (supermuestreo). El modo «Anterior» conserva los presupuestos previos. El antialiasing del motor permanece activo. En selección automática todavía se puede reducir resolución o LOD para sostener rendimiento; seleccionar «Alta» manual fija su resolución.

`TyrellGlassware.js` define colocación/materiales. `TyrellGlasswareTable.js` sólo controla contacto y rugosidad de la mesa, sin pasadas de espejo. `TyrellSpecularEnvironment.js` administra las sondas y restaura visibilidad/materiales incluso ante errores de captura.

## Reproducir

Desde la raíz del repositorio:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' -b --python 'src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/export-glassware.py'
npm run test:tyrell
npm run build
```

El exportador produce `static/glbs/E26902_BladeRunner/Glassware.glb` con sólo tres mallas, y `glassware-source.json` con hashes, dimensiones y procedencia. No incluye mesa, luces, cámara ni líquido.

Vista de revisión: `http://localhost:8080/?glasswareReview=1`. La URL normal conserva las cámaras habituales. Las pruebas comprueban fidelidad de malla, escala y apoyos, ausencia de líquido, recursos compartidos, restauración del material de mesa y presupuestos de resolución.
