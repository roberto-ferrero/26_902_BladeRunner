# Corrección de líneas durante el paneo · 09/09/2026

Las líneas horizontales señaladas aparecían al mirar de canto los huecos entre hiladas: las 23 juntas de 6 mm atravesaban las columnas y dejaban ver luz/fondo. Las dos líneas verticales correspondían a caras de retorno interiores de las columnas traseras 09/18, iluminadas por el sol y proyectadas con aproximadamente un píxel de ancho. El movimiento del ratón hacía visibles estas superficies; su cálculo no necesitaba cambios.

## Cambio aplicado

- `TyrellColumnCores.js` añade un respaldo interior continuo a las 18 columnas. Sigue el perfil de `Columns` de `Plantilla de referencia.blend`, reducido al 97 % en planta alrededor del centro de cada columna. Conserva altura, orientación, siluetas exteriores y juntas rehundidas.
- Los núcleos se agrupan en una sola malla. Comparten un material oscuro `MeshBasicMaterial`, color `0x17120d`, de doble cara: representa el interior en sombra de la cavidad y evita que vuelva a producir una línea brillante.
- Se trasladan 211 triángulos existentes de las caras de retorno de las columnas 09/18 a ese acabado interior. Sus posiciones no cambian. La selección usa orientación y altura de las caras y está limitada a esos dos perfiles; el resto de la piedra conserva materiales, normales, UV y texturas originales.
- Los parámetros del paneo, la iluminación 4.1 y los sesgos de sombra se conservan (`bias = -0.00015`, `normalBias = 0.025`). Los archivos Blender y GLB originales no se guardan ni sobrescriben.

## Coste y reproducción

El GLB activo mantiene 339.381 triángulos. El respaldo añade **7.944 triángulos (+2,34 %)**, una malla y un material, sin texturas ni pasadas de render nuevas. Los 211 triángulos reasignados no aumentan el total. El [diagnóstico real](runtime.json) registra **149 mallas, 347.325 triángulos, 21 materiales y 25 texturas asociadas a materiales**. Las llamadas de dibujo de CAM 01 pasan de 276 a 278 contando las pasadas existentes; estos contadores no equivalen a una medición de tiempo GPU.

El respaldo está generado en `column-cores.json`. Desde la raíz del repositorio:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --factory-startup --disable-autoexec --python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/export-column-cores.py
npm.cmd run test:tyrell
npm.cmd run build
```

El script lee la plantilla, simplifica superficies coplanares y exporta índices en ejes glTF. Un cambio futuro de columnas requiere regenerar el respaldo y revisar la selección de retornos.

## Verificación

- **23/23 pruebas correctas.** Tres nuevas pruebas comprueban 828 rayos en las juntas (18 columnas × 23 alturas × dos lados), conservación de recursos compartidos y aplicación sobre el GLB real. Sólo los índices de los perfiles 09/18 cambian; los atributos de las superficies originales conservan su identidad y el incremento neto es de 7.944 triángulos.
- Producción compilada con Webpack 5.97.1 en 82,093 s: sin errores, tres advertencias de tamaño/recomendaciones de empaquetado.
- Revisión visual en Chrome 152, WebGPU, Three.js r185, adaptador NVIDIA Turing. CAM 01 con ratón desplazado hacia izquierda, derecha y abajo, y comprobación adicional desde CAM 04. Calidad Media, acabado Tyrell v1, luz 4.1, exposición 0 EV.
- Las capturas del navegador tienen 1920 × 900 píxeles, con escena de 1920 × 800. Conservan el paneo real; no usan el botón de captura que restablece la pose de referencia.

| Evidencia | Imagen |
| --- | --- |
| Antes, con controles temporales de diagnóstico | [Original](before-ui.png) |
| Después, vista central | [Centro](after-center-ui.png) |
| Ratón a la derecha | [Derecha](after-pan-right-ui.png) |
| Ratón a la izquierda | [Izquierda](after-pan-left-ui.png) |
| Desplazamiento vertical | [Vertical](after-pan-down-ui.png) |
| Revisión lateral | [CAM 04](after-cam04-ui.png) |

Como comprobación localizada de la línea vertical derecha, en la región x=1640–1729, y=350–449, el máximo de píxeles brillantes alineados en una columna baja de 38 a 2 entre las capturas original y central (umbral máximo RGB > 140). Es evidencia de esa línea concreta, no una evaluación general de fidelidad.

Las juntas de piedra y los brillos anchos de los biseles permanecen visibles. Esta entrega corrige las marcas de la captura del usuario; la calibración de intensidades 4.2 y la revisión global de sombras/contactos 4.4–4.6 siguen pendientes.
