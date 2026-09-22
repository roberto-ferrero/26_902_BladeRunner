# Sincronización selectiva desde Blender auxiliar

Primera aplicación: 22/09/2026. Fuente guardada: `_Blender/20260914_BladeRunner_AUXILIAR.blend`.
Se actualizan únicamente `Sillon 01 | frente` y `Sillon 02 | fondo` en el GLB activo `BladeRunner_5_6_High_v3_phase2.glb`.

| Objeto | Posición Blender anterior (X, Y, Z), m | Posición Blender nueva, m | Giro Z nuevo |
| --- | --- | --- | --- |
| Sillon 01 · frente | 0,150; 8,550; 0 | 1,413035; 8,471920; 0 | −131,613688° |
| Sillon 02 · fondo | 0,150; 11,720; 0 | −0,235885; 11,720; 0 | 0° |

Escala 0,74 en ambos, dentro de la precisión de coma flotante. El primer sillón gira aproximadamente +48,3863° respecto a su orientación anterior (−180°). El segundo mantiene la orientación.

## Conservación y verificaciones

- Coincidencia de los conjuntos de vértices locales entre auxiliar, maestro del 13/09 y GLB importado: mismos orígenes y geometría para los objetos seleccionados.
- Conversión explícita Blender Z-up → glTF Y-up mediante matrices. Se lee la matriz real; no se supone que el objeto use rotaciones Euler.
- Solo cambian los campos de transformación de los nodos 67 y 68. Todos los demás datos JSON permanecen iguales; los bloques binarios permanecen idénticos byte a byte, incluidos índices corregidos, vértices, normales, UV e imágenes.
- GLB anterior SHA-256: `bf2108bbe13d32df23bfa34e598c1d98085e2322e859fbf62354240f7e6b8fa2`.
- GLB actualizado SHA-256: `6f610bf7939cd0838a46ca6c044d82789415bae734a444fa0255994b039dd31d`; 40.552.536 bytes; revisión de caché `v=2`.
- Copia anterior en `_Blender/transform_sync/backups/20260922T090009402937Z_BladeRunner_5_6_High_v3_phase2.glb`, relativa a la raíz del espacio de trabajo.
- Segunda ejecución en modo de lectura: `changed: false`, mismo hash; no se acumulan desplazamientos.
- 93/93 pruebas correctas. Se actualizan las expectativas del hash, las dos poses y los obstáculos de navegación; las demás transformaciones siguen comparándose con el export anterior.
- Compilación correcta con las tres advertencias de tamaño de Webpack.
- Visor WebGPU comprobado en CAM 01 y CAM 02. Contactos muestreados con suelo: aproximadamente 0,079 mm de separación, como corresponde al extremo inferior de la geometría; ver `contacts.json`. Este muestreo no certifica ausencia de todas las intersecciones entre superficies.
- Los archivos `.blend` no se guardan ni modifican.

## Repetir la operación

Desde la raíz del repositorio `_Repo/26_902_BladeRunner`, ejecutar primero sin `--apply` para obtener un informe:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/sync-aux-transforms.py -- --objects 'Sillon 01 | frente' 'Sillon 02 | fondo'
```

Añadir `--apply` para escribir las transformaciones y crear una copia previa. El script no reexporta geometrías. Lee el archivo guardado en disco; guardar los cambios en Blender antes de pedir otra actualización.

Después de una modificación, actualizar `assetBytes`, la revisión de caché de `config.js` y las expectativas de las pruebas que documentan las poses/hash revisados; ejecutar pruebas y compilación. Revisar el visor. Los informes JSON fechados documentan los valores antes/después.

Esta primera herramienta admite mallas estáticas sin padres, hijos, modificadores, constraints ni animación, con geometría local coincidente y escala positiva. Si una optimización cambia la geometría local, o se altera el origen/jerarquía, se detiene para exigir una correspondencia calibrada. No sustituye esa correspondencia por una suposición.

Para revertir esta prueba, restaurar la copia anterior del GLB, `v=1`, `assetBytes: 40552456` y las expectativas previas de las tres pruebas modificadas; volver a compilar.

## Segunda aplicación · elementos sobre la mesa y eliminación selectiva

Aplicada el 22/09/2026 desde el auxiliar con SHA-256 `b69e8498c2b483d7db9587a3d05ee4fba81a94b4b9df6754ebbde0619d407eaf`.

Se sincronizan las matrices guardadas de `Paper on folio`, `Leather folio`, `Crystal tumbler`, `Cut crystal decanter`, `Crystal stopper`, `Crystal tumbler.001` y `Sillon 01 | frente`. Las geometrías locales coinciden con el GLB y no se reexportan.

Se retiran por selección expresa `Instrument case`, `Instrument lid`, `Instrument clasp`, `Instrument clasp.001`, `Foot_3` y `Base_3`. Las cuatro piezas `Instrument…` estaban ocultas en el auxiliar; `Foot_3` y `Base_3` aún figuraban visibles, pero la lista explícita de eliminación gobierna esta operación.

La limpieza elimina 6 nodos, 6 mallas exclusivas, 24 accesores y 24 buffer views. El bloque binario pasa de 40.425.000 a 40.380.776 bytes. Se conservan los 20 materiales, 37 texturas y 25 imágenes porque continúan referenciados por otros elementos. El GLB pasa de 40.552.536 a 40.502.716 bytes.

- SHA-256 activo: `a9afa2abb0bde11e6e307ef5e71749b8cc54924385a7755febe212d9221af4dc`; revisión de caché `v=3`.
- Copia previa: `_Blender/transform_sync/backups/20260922T121504104853Z_BladeRunner_5_6_High_v3_phase2.glb`.
- Informe completo: `20260922T121504104853Z-applied.json`.
- Segunda ejecución: `changed: false`; no acumula transformaciones ni vuelve a compactar datos.
- GLTFLoader carga 115 nodos y 101 mallas. Los seis nombres no existen ni en el JSON ni en la escena Three.js.
- 100/100 pruebas correctas y compilación correcta con las tres advertencias de tamaño conocidas.
- El decantador y ambos vasos apoyan sobre la mesa dentro de la precisión numérica del raycast. El folio de cuero queda a 0,36 mm de la superficie, acorde con el espesor y la superposición de papel; consultar `contacts-v3.json`.
- El visor WebGPU se carga y renderiza correctamente. Los `.blend` permanecen sin modificaciones.

Para futuras sincronizaciones que incluyan eliminaciones, usar `sync-aux-scene.py`. `--objects` transfiere matrices y `--remove` retira los nodos seleccionados y compacta únicamente los recursos que quedan huérfanos. Ejecutar primero sin `--apply` para revisar el informe.

### Flujo rápido para próximas modificaciones

Cuando la petición sea únicamente de posición, rotación o escala, el script abre una sola vez el Blender auxiliar, lee las matrices de los nombres solicitados y actualiza directamente sus nodos en el GLB. No importa el GLB en Blender, no inspecciona geometrías y no comprueba visibilidad ni renderabilidad. Si un nombre no existe en el auxiliar o en el GLB, no modifica nada para ese nombre y lo incluye al final en `skippedTransforms`.

Para estas actualizaciones rutinarias basta una validación estructural enfocada e idempotencia. Las pruebas completas, la compilación y la revisión visual se reservan para eliminaciones, cambios de estructura o cuando se soliciten expresamente.
