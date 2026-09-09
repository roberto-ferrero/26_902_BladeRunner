# Cierre de 3.3 y base de materiales de fase 3

09/09/2026. **Tyrell v1 se conserva como base revisada para comenzar iluminación.** Se han contrastado los acabados importado/Tyrell v1 en CAM 01, 02 y 04 con luz de estudio, calidad Media y 0 EV, y se ha comprobado el retorno a la luz de escena. Este cierre valida la base de materiales a esas distancias; no declara equivalencia final con Blender ni con la película, ni aprobación artística del usuario.

## Revisión visual

Se han consultado de nuevo las tres imágenes del usuario de `docs/reference images`. La piedra mantiene variación mineral ocre, la madera y el cuero conservan su carácter oscuro y los metales delimitan los cantos. Los cambios de Tyrell v1 son contenidos; no se altera la receta en esta revisión.

| Familia | Observación y decisión |
| --- | --- |
| Caliza y aristas | Juntas legibles y textura mineral conservada. Se mantiene el matiz y relieve de v1; la dureza de sombras y los contrastes entre caras deberán calibrarse con las luces. |
| Nogal, raíz y cuero | La comparación de CAM 02 reduce la dureza del grano manteniendo la veta. Se conservan los valores. El campo de cuero de la mesa aparece muy claro bajo luz de escena y oscuro en estudio: revisar respuesta con la calibración de luces antes de oscurecer el albedo. |
| Bronce y latón | Cantos y detalles mantienen brillos localizados. La anchura e intensidad final dependen de luces y entorno; no se añaden capas de material. |
| Cristalería | En CAM 02 con luz de escena se ve transmisión y se reconocen paredes y contornos de botella y vasos. Bajo estudio aparecen zonas negras y reflejos blancos duros. Se conserva el espesor aproximado de 6 mm; no se considera terminada la integración con el entorno de reflexión. |
| Pavimento | Se mantiene la decisión de 3.4: normal pequeña, juntas y desgaste intactos. El brillo central amplio no coincide aún con los reflejos largos de la película. |
| Exterior | Su material se conserva. La silueta casi negra bajo la luz de escena requiere iluminación y profundidad atmosférica. |

Las diferencias pendientes pasan a sus tareas existentes: dirección y contraste en 4.1, intensidades y rellenos en 4.2–4.3, contactos y sombras en 4.4–4.6, reflejos del suelo y entorno de cristal/metales en 5.1–5.5, bruma, halo y acabado en fase 6. Revisar de nuevo la lectura del cuero de mesa y del cristal al calibrar 4.2 y 5.5.

## UV colapsadas: decisión acotada

La auditoría de 3.1 encontró 236 triángulos únicos con UV colapsadas en 29 primitivas, de superficie local total aproximada 0,00305 m². Se añade [uv-projection.json](uv-projection.json), que localiza las caras de materiales con normal map y proyecta las instancias desde las cámaras de referencia a 1920 × 800.

| Cámara | Mayor área proyectada de una cara afectada | Caras de más de 1 píxel² |
| --- | ---: | ---: |
| CAM 01 | 0,907 píxel² | 0 |
| CAM 02 | 4,042 píxeles² | 1 |
| CAM 04 | 1,570 píxeles² | 1 |

Los dos casos mayores son `Table_Slab`, triángulo 190, material raíz de nogal (CAM 02), y `Wall_Side_L`, triángulo 273, caliza (CAM 04). No se identifica una mancha de textura dominante en las capturas revisadas que justifique un remapeado general. Se conservan las UV y el GLB. **El defecto numérico sigue existiendo**: deberá revisarse al permitir aproximaciones en recorrido libre, sobre todo el borde de mesa y pared lateral.

La proyección mide área, no longitud de una arista ni visibilidad: no calcula oclusión, y acepta triángulos cuyos límites proyectados solapan el encuadre sin recortarlos. No prueba ausencia de artefactos subpíxel o en otras cámaras. El suelo no tiene UV colapsadas, según 3.4.

Reproducción desde la raíz del repositorio:

```powershell
node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/review-uv-projection.mjs
```

## Evidencias

Las imágenes siguientes son **capturas de interfaz a 1280 × 720 que muestran el render de referencia reducido**; no son los PNG originales 1920 × 800. El análisis geométrico anterior sí usa proyección a 1920 × 800. Se conserva el encuadre fijo sin paneo, normal del suelo activada y exposición 0 EV.

| Cámara | Estudio importado | Estudio Tyrell v1 | Escena Tyrell v1 |
| --- | --- | --- | --- |
| CAM 01 | [Imagen](cam01-importado-estudio-ui.png) | [Imagen](cam01-tyrell-estudio-ui.png) | [Imagen](cam01-tyrell-escena-ui.png) |
| CAM 02 | [Imagen](cam02-importado-estudio-ui.png) | [Imagen](cam02-tyrell-estudio-ui.png) | [Imagen](cam02-tyrell-escena-ui.png) |
| CAM 04 | [Imagen](cam04-importado-estudio-ui.png) | [Imagen](cam04-tyrell-estudio-ui.png) | [Imagen](cam04-tyrell-escena-ui.png) |

[runtime.json](runtime.json) registra WebGPU, Three r185, Chrome 152 y NVIDIA Turing, 20 materiales y 25 texturas sin incidencias de conexiones. Se obtuvo antes de actualizar la etiqueta de estado de v1. La consola no registró errores; aparece el aviso de deprecación de THREE.Clock. No se realiza un benchmark de rendimiento.

Validación final de este cierre: **19/19 pruebas correctas** y **compilación de producción correcta**, con tres advertencias de tamaño/rendimiento (registro local: tyrell-build-phase3-close.log). Se actualizan las etiquetas de revisión; los parámetros artísticos, fuentes Blender, texturas y geometría no cambian.

**Siguiente entrega: 4.1**, igualar dirección del sol, disco, cielo y contraste interior/exterior con las referencias.
