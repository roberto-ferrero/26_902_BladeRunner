# 5.1 · Ensayo de reflector planar compartido

09/09/2026. Prototipo WebGPU disponible en **Color y materiales → Reflejo del suelo · ensayo 5.1**. Arranca desactivado para conservar R01. El reflejo muestra columnas, mobiliario y exterior desde la cámara reflejada, pero todavía es demasiado nítido y uniforme para considerarlo un acabado final. Su integración con rugosidad, normales, Fresnel y juntas corresponde a 5.2.

## Implementación y alcance

`TyrellFloorReflection.js` usa el `reflector()` de la versión instalada, Three.js 0.185.1, con plano Y=0 y normal +Y. Los 21 sectores de pavimento comparten un material de nodos y un reflector. Se conservan geometría, mapas y propiedades PBR del suelo; las demás superficies de piedra negra mantienen su material. No se añade un plano superpuesto que pueda producir z-fighting.

El ensayo suma el color reflejado con ganancia constante **0,18**, sólo en caras cuya normal geométrica apunta hacia arriba. Es una composición aditiva provisional: no es una BRDF físicamente integrada, no atenúa correctamente la reflexión según la rugosidad y puede aclarar sombras. Los brillos PBR existentes permanecen. No se cambia exposición, sol, rellenos, sombras, R01 archivado ni el GLB.

Resolución del reflector **0,5 por eje**, sin MSAA ni mipmaps y sin rebotes recursivos. El nodo actualiza por render para que una captura de cámara fija dentro del mismo fotograma no reutilice el reflejo del paneo. El material compartido se excluye de su propia pasada mediante el comportamiento del ReflectorNode instalado.

La cámara de referencia del paneo y la cámara de captura ahora conservan su identidad al cambiar de pose o repetir capturas. Esto evita crear render targets nuevos indefinidamente. En la revisión se observan tres targets: visor, cámara de captura y restauración de cámara de referencia. Al desactivar el ensayo se elimina su nodo del material y cesa la pasada, pero sus targets quedan disponibles hasta destruir el proyecto. La liberación restaura materiales originales y libera material de nodos y targets, sin destruir los mapas compartidos. La optimización de frecuencia/resolución sigue en 5.4.

## Comparación visual

CAM 01 incorpora las siluetas reflejadas al eje central del suelo, conservando los brillos existentes. CAM 04 permite reconocer la continuidad de las columnas y el mobiliario reflejados. CAM 02 conserva la mesa y cristalería; ofrece menos superficie de suelo para valorar el efecto. No se declara validada toda la navegación ni la estabilidad a todas las calidades.

Respecto al fotograma, el ensayo recupera información que faltaba en el pavimento, pero necesita romper la nitidez de espejo y modular la reflexión. Se mantiene como opción de comparación; no se crea una referencia R02 ni se sustituye R01 por defecto.

## Coste observado

CAM 01, Media, 1294 × 539, 120 muestras RAF después del calentamiento. [Base](../../capturas/5.1_001_2026-09-09_CAM01.json) y [ensayo](../../capturas/5.1_002_2026-09-09_CAM01.json). Mediciones de la primera compilación, antes de estabilizar también la identidad de la cámara de referencia entre presets; misma imagen y parámetros del reflector.

| Medida | Desactivado | Activado |
| --- | --- | --- |
| FPS observados | 59,8 | 46,5 |
| Intervalo RAF medio | 16,72 ms | 21,51 ms |
| Llamadas de dibujo | 277 | 358 |
| Triángulos contando pasadas | 603.323 | 763.389 |
| Geometrías del renderer | 131 | 131 |
| Texturas del renderer | 34 | 47 |

No son tiempos GPU ni un objetivo garantizado de rendimiento. Los contadores incluyen recursos auxiliares de las pasadas y no representan memoria en bytes. Tras capturar, los targets observados son 647 × 270, 960 × 400 y 647 × 270; la captura nativa se renderiza a 1920 × 800, con reflejo a media resolución.

## Validación

**29/29 pruebas correctas**: material único, conservación de geometrías/mapas, restauración y liberación, cámara de captura reutilizada con pose/lente actualizadas e identidad estable al cambiar presets. También pasan las comprobaciones previas de contactos, sombras y paneo.

Compilación final Webpack 5.97.1 correcta en **54,132 s**, con las tres advertencias de empaquetado existentes. Revisión visual en WebGPU y capturas cronológicas en el [registro](../../capturas/INDEX.md). El diagnóstico incluye `floorReflection`, y el nombre de descarga indica `reflejoon` o `reflejooff`.

La compilación final conserva tres targets después de capturas en CAM 04, CAM 02 y CAM 01. Desactivar devuelve las llamadas a 277 ([006](../../capturas/5.1_006_2026-09-09_CAM01.json)); reactivar y capturar de nuevo mantiene los tres targets ([007](../../capturas/5.1_007_2026-09-09_CAM01.json)). El visor de revisión queda con el ensayo activado en CAM 01; recargar arranca con R01 sin reflejo planar. Siete pantallazos guardados sin sobrescribir el histórico.

Fuentes técnicas contrastadas directamente en `node_modules/three/src/nodes/utils/ReflectorNode.js` y `node_modules/three/src/materials/nodes/MeshStandardNodeMaterial.js`; sin actualizar dependencias.

Siguiente punto: **5.2 · Integración del reflejo con el material del pavimento**.
