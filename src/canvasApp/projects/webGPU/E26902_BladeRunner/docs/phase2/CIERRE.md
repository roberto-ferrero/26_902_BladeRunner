# Fase 2 · Cámaras y fidelidad del modelo

07/09/2026. **Fase completada.** Se conserva la composición del modelo, se revisan las superficies y se activa una copia de ejecución con índices corregidos. La fase 3 comienza con materiales y gestión de color; luz, reflejos y atmósfera siguen siendo provisionales.

## Recurso activo y corrección

`config.js` carga `BladeRunner_5_6_High_v3_phase2.glb?v=1` desde `static/glbs/E26902_BladeRunner/`.

| Recurso | Bytes | SHA-256 |
| --- | ---: | --- |
| Export de entrada `_edited.glb`, intacto | 40.549.528 | `7b860e4fa93da9380d7cdc3f38116d6905f5907d68086c1fd36c6ba895ba334c` |
| Copia de ejecución `_phase2.glb` | 40.552.456 | `bf2108bbe13d32df23bfa34e598c1d98085e2322e859fbf62354240f7e6b8fa2` |

La auditoría encontró caras degeneradas y caras cuyo orden de vértices se oponía a la normal media exportada. `scripts/prepare-phase2.mjs` elimina **5.396 triángulos únicos** con área ≤ 10⁻¹⁰ m² en coordenadas locales, calculada en float64 o float32. Invierte el orden de **10.813 triángulos únicos** cuando el producto escalar normalizado entre cara y normal media es menor que −0,1. Este criterio presupone que las normales del export expresan la orientación deseada; no pretende reconstruir automáticamente sólidos arbitrarios.

Sólo cambian índices y sus metadatos. Las pruebas comparan byte a byte posiciones, normales, UV y texturas, y comprueban igualdad de materiales, nodos, transformaciones y cámaras. Ninguna cara nueva se introduce; las caras eliminadas tienen área insignificante. Primitivas que compartían índices pero necesitan distinto sentido reciben un accessor propio. El binario conserva espacio no utilizado: esta entrega no es una compresión del GLB.

La escena pasa de **346.025 a 339.381 triángulos contando instancias** (−6.644; aproximadamente −1,92 %), con 148 meshes en ejecución, 107 recursos mesh, 25 imágenes y 10 cámaras. Se conservan los archivos `.blend` y el export de entrada. Informe por primitiva: [cleanup.json](surfaces/cleanup.json).

## Comprobaciones geométricas

La auditoría se repitió sobre la copia activa: [geometry.json](model-audit/clean/geometry.json). Las 18 columnas conservan 24 hiladas y 23 juntas de unos 6 mm; los 432 perfiles de control siguen coincidiendo con la plantilla dentro de 0,1154 mm. Se mantienen las inversiones 02/03/11/12, los cuatro sillones con una malla compartida, los 11 grupos de celosías y el exterior tridimensional. El cálculo de paralaje de la entrega anterior aísla una traslación horizontal; no es una medición de flujo óptico ni de oclusión. La evidencia anterior se conserva en [FIDELIDAD_MODELO.md](FIDELIDAD_MODELO.md).

| Inspección del recurso activo | Resultado |
| --- | --- |
| Posiciones/normales no finitas | 0 |
| Normales ausentes o longitud fuera de 1 ± 0,01 | 0 |
| Caras degeneradas según umbral de la auditoría | 0 |
| Caras opuestas a su normal media según umbral −0,1 | 0 |
| Escalas nulas o determinantes negativos en objetos mesh | 0 |
| Primitivas con normal map sin UV | 0 |
| Primitivas con normal map sin tangentes almacenadas | 113; usan el cálculo por derivadas de Three.js r182 |
| Intersecciones de superficies entre cada silla y el tablero | 0 pares de triángulos |

Las tangentes no están exportadas, pero las UV y normales sí. Se comprobó el código instalado `node_modules/three/src/nodes/accessors/Tangent.js` y `TangentUtils.js`: en el fragment shader, la ausencia del atributo tangent usa una base calculada a partir de derivadas de posición/UV. No se añade geometría ni se recalculan las normales artísticas. La calidad visual de cada normal map corresponde a fase 3.

Contactos medidos mediante rayos desde vértices inferiores hacia el pavimento o el tablero, incluyendo el campo de cuero: sillones a unos **0,079 mm** del suelo, botella y vasos a **0 mm** del cuero, folio a **0,36 mm** y maletín a **3,60 mm**. Se conserva esa pequeña holgura de origen del maletín, sin penetración visible desde las cámaras revisadas; no equivale a contacto físico exacto. Esto revisa el mobiliario visible y no sustituye las colisiones simplificadas del futuro recorrido libre. Datos: [inspection.json](surfaces/clean/inspection.json).

## Revisión visual

Las cuatro cámaras se revisan con material gris, iluminación de estudio y cavity de Workbench, además del visor WebGPU. En las vistas neutras se ocultan cielo/disco solar y se representa el cristal opaco para comprobar su superficie. Las sombras de Workbench se desactivan: su volumen de sombras con el exterior lejano producía diagonales que no eran huecos del modelo. Las sombras de ejecución se revisan en las capturas WebGPU.

| Vista | Geometría neutra | WebGPU, Media, 1920 × 800 |
| --- | --- | --- |
| CAM 01 · general | [PNG](surfaces/clean/neutral-cam01.png) | [PNG](surfaces/clean/cam01.png) · [diagnóstico](surfaces/clean/cam01.json) |
| CAM 02 · mesa | [PNG](surfaces/clean/neutral-cam02.png) | [PNG](surfaces/clean/cam02.png) · [diagnóstico](surfaces/clean/cam02.json) |
| CAM 03 · invertidas | [PNG](surfaces/clean/neutral-cam03.png) | [PNG](surfaces/clean/cam03.png) · [diagnóstico](surfaces/clean/cam03.json) |
| CAM 04 · lateral | [PNG](surfaces/clean/neutral-cam04.png) | [PNG](surfaces/clean/cam04.png) · [diagnóstico](surfaces/clean/cam04.json) |

No se observan nuevas pérdidas de superficie o cambios de silueta en estas cámaras. Se mantienen los materiales a doble cara del export; esta revisión no afirma que todas las mallas sean sólidos cerrados. El cristal conserva `KHR_materials_transmission = 1`, IOR 1,46 y rugosidad 0,075. Su respuesta de color/reflejo precisa la calibración de materiales y entorno de las fases siguientes.

La captura de mesa aún muestra la cristalería blanquecina; el exterior queda muy negro a contraluz con una zona clara en su borde inferior, y el suelo presenta brillos excesivos. Son diferencias visuales pendientes de investigar y calibrar en materiales/iluminación/reflejos, no resultados artísticos aprobados por este cierre. Las vistas neutras permiten comprobar la geometría que el contraste oculta. Esta entrega conserva las cámaras de Blender; no afirma haber igualado todavía los fotogramas de la película.

Medición final con 120 muestras por vista, Media, 757 × 315:

| Cámara | FPS | Media RAF ms | P95 ms | Dibujos | Triángulos con pasadas |
| --- | ---: | ---: | ---: | ---: | ---: |
| CAM 01 | 59,8 | 16,72 | 18,9 | 276 | 587.889 |
| CAM 02 | 59,9 | 16,71 | 18,5 | 219 | 416.710 |
| CAM 03 | 59,9 | 16,69 | 18,1 | 251 | 515.862 |
| CAM 04 | 60,0 | 16,65 | 21,6 | 264 | 529.641 |

El visor se deja en CAM 01, calidad Media. El [registro del navegador](surfaces/clean/browser-logs.json) conserva los mensajes de la sesión: no se registraron errores ni advertencias durante la carga y revisión del bundle final `eadbc2f0cf430eab`.

## Validación y reproducción

- `npm run test:tyrell`: **11/11 pruebas correctas**. Incluyen integridad del recurso, preservación de atributos/recursos y topología significativa, cámaras, captura/restauración, errores de carga y liberación de recursos.
- `npm run build`: **correcto**, Webpack 5.97.1, 83,354 s, tres advertencias de tamaño/rendimiento; sin errores. Registro local ignorado por Git: `tyrell-build-phase2.log`.
- Las dos auditorías de Blender finalizaron correctamente. El aviso de caché de extensiones sin permiso de escritura no impidió importar, inspeccionar o generar PNG; no se guardó ningún `.blend`.
- Producción local: Chrome 152/Windows, WebGPU, adaptador NVIDIA Turing. Las capturas son 1920 × 800; los diagnósticos de fluidez corresponden al visor **757 × 315**, calidad Media. No extrapolar sus FPS a 1920 × 800 ni a la futura atmósfera; son intervalos RAF, no tiempo GPU.

Desde la raíz del repositorio, usando la versión local de Blender:

```powershell
node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/prepare-phase2.mjs
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --factory-startup --disable-autoexec --python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-model.py -- --processed
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --factory-startup --disable-autoexec --python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/inspect-surfaces.py -- --processed
npm run test:tyrell
npm run build
```

Sin `--processed`, las auditorías inspeccionan `_edited.glb` y escriben en la carpeta histórica correspondiente; con el argumento, escriben en `clean/`. Para un nuevo export se deben revisar los informes y actualizar las expectativas intencionadamente. La siguiente entrega recomendada es **fase 3: validar mapas de color/datos y fijar la referencia de gestión de color y exposición**.
