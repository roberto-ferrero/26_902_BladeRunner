# 4.3 · Rellenos rectangulares WebGPU

## Resolución de la revisión · base R01 conservada

09/09/2026. Al retomar el plan se revisa R01 desde CAM 01/02/04 y se resuelve el punto conservando las cuatro áreas originales y el balance registrado como referencia. Se descarta la reducción de dimensiones del experimento 4.3. No se cambian intensidades, exposición, materiales ni sombras de R01. El perfil activo conserva el identificador `tyrell-light-v2` (luz 4.2 en el GUI); `tyrell-light-v3` queda descartado como base y se conserva para comparar. El archivo de R01 permanece intacto.

Capturas cronológicas: [004 · general](../../capturas/4.3_004_2026-09-09_CAM01.png), [005 · mesa](../../capturas/4.3_005_2026-09-09_CAM02.png), [006 · lateral](../../capturas/4.3_006_2026-09-09_CAM04.png). Todas muestran el encuadre fijo 1920 × 800 reducido en una interfaz 1294 × 912, Media, 0 EV, sin paneo, composición completa. El suelo conserva más relleno que en la propuesta rechazada, y se mantienen la cara iluminada de la pirámide y la proyección del mobiliario. En la mesa siguen visibles sombras demasiado opacas de la cristalería; el lateral sigue necesitando el tratamiento posterior de reflejos e iluminación indirecta. No se declara equivalencia final con la película ni aprobación del usuario de estas nuevas vistas.

Este cierre selecciona la base para continuar; no da por corregidos los efectos pendientes. Siguiente: **4.4**, cobertura, resolución, sesgos y revisión de las sombras de la cristalería. Las notas siguientes son el histórico de propuestas y revisión.

## Revisión de contraste solicitada · 09/09/2026

Sobre la base restaurada de 4.2, se aumenta el ambiente hemisférico de **0,8 a 0,86 (+7,5 %)** y la luz principal de **2,1 a 2,5 (+19 %)**. El objetivo es abrir ligeramente las penumbras y reforzar más las caras iluminadas. Exposición 1,07 / 0 EV, áreas, posición del disco, dirección artística solar y materiales permanecen iguales. `calibratedLighting` es compartido por los perfiles 4.2 y 4.3: ambos reciben estas intensidades; el perfil inicial sigue siendo 4.2, con los rellenos anteriores. Las capturas históricas conservan el estado previo.

El 4.3 continúa abierto para revisión visual: este ajuste no implica aprobación del resultado ni cierre de los reflejos pendientes.

Captura [4.3_003](../../capturas/4.3_003_2026-09-09_CAM01.png), comparada con 002 al mismo tamaño de ventana y encuadre. La piedra en penumbra gana lectura y las superficies iluminadas suben de brillo. En la región del reflejo x=530–626, y=615–684 del pantallazo, no aparecen píxeles con los tres canales ≥250; la media RGB pasa de 121,15 a 127,06. Es una comprobación localizada sobre la imagen sRGB, no una medición fotométrica ni garantía de ausencia de recorte en toda la escena. Compilación correcta en 30,132 s, tres advertencias de empaquetado; verificación visual en WebGPU. Sólo se cambian dos intensidades, sin añadir geometría ni recursos.

**Estado: REABIERTO.** El usuario rechaza el resultado: demasiado oscuro, pavimento sin lectura suficiente de reflejos y sombras poco contrastadas respecto a la película. La validación técnica descrita abajo no constituye aprobación visual. Se restaura el perfil 4.2 corregido como base provisional; 4.3 permanece disponible sólo para comparación. Antes de avanzar a 4.4 hay que revisar este equilibrio. Las nuevas capturas se registran cronológicamente en `docs/capturas/INDEX.md`.

09/09/2026. Perfil `tyrell-light-v3`, **Tyrell · luz 4.3**. Conserva el disco junto al vértice, la dirección artística de luz que recupera la pirámide y las sombras, y las intensidades corregidas de 4.2. La modificación afecta a tamaño y orientación de los cuatro rellenos existentes.

## Integración

El proyecto ya inicializaba `RectAreaLightTexturesLib.init()` y registraba sus tablas mediante `RectAreaLightNode.setLTC()` antes del primer render. Se conserva esa integración: el código instalado de Three.js r185 selecciona las tablas float/half según capacidad del backend y actualiza ancho, alto y orientación por render, también para la cámara de captura. No hace falta sustituir los materiales PBR ni añadir shaders.

Estas áreas no proyectan sombras. Se usan como relleno moderado; la luz principal mantiene las sombras del mobiliario. Reducir el tamaño limita su aportación amplia al pavimento, pero no simula oclusión por paredes. La luz indirecta y los contactos seguirán en 4.5–4.6.

## Geometría de las fuentes

Coordenadas mundiales glTF en metros, Y arriba. La cara emisora apunta por su eje local −Z hacia el objetivo. El perfil anterior usaba cuadrados de 6/7/4/4 m de lado.

| Área | Posición | Objetivo | Ancho × alto | Intensidad |
| --- | --- | --- | --- | ---: |
| Ventanal | (0; 3,8; −13,8) | (0; 3,4; −3) | 6 × 1,8 m | 0,08 |
| Frontal | (0; 4,5; 7) | (0; 3,4; −7) | 5 × 2 m | 0,08 |
| Izquierda | (−7,7; 3,8; −3,4) | (−3; 3,4; −5) | 2 × 3 m | 0,2 |
| Derecha | (7,7; 3,8; −7,2) | (2; 3,2; −8) | 2 × 3 m | 0,2 |

La intensidad corresponde a luminancia de `RectAreaLight`; al reducir superficie también disminuye potencia total. No se compensa ese descenso aumentando intensidad, porque se busca contener la mancha clara y dirigir el relleno hacia volúmenes verticales. Los brillos de luz directa permanecen; no se modifica rugosidad para ocultarlos.

## Reversibilidad y comprobación

`config.js` contiene `shapedAreaFills`. `TyrellLighting.js` conserva posición, orientación y dimensiones originales para restaurarlas al seleccionar 4.2, 4.1 o provisional. Cambiar perfiles reutiliza las mismas cuatro luces. **Aporte de luz** permite aislar cada una; el diagnóstico registra posición mundial, dirección emisora, dimensiones, intensidad y potencia.

Las pruebas comprueban orientación y posición con padres transformados, tres ciclos de restauración de las cuatro fuentes, aislamiento, conservación de la dirección principal y de la posición del disco. Sin luces, mallas, materiales, texturas ni pasadas adicionales.

```powershell
npm.cmd run test:tyrell
npm.cmd run build
```

La comparación usa las tres referencias del usuario, CAM 01/02/04, Tyrell v1, 0 EV y Media. La iluminación volumétrica y los reflejos alargados del fotograma siguen en las fases 5–6. Siguiente punto: 4.4, cobertura y calidad de las sombras solares.

## Resultado y evidencia

CAM 01: disminuye el relleno amplio central y se distingue mejor la sombra del mobiliario; se conserva la cara iluminada de la pirámide. CAM 02: el tablero y la caja mantienen zonas oscuras más definidas; persiste el brillo solar de la derecha. La cristalería proyecta sombras excesivamente opacas y duras, ahora más evidentes: queda para revisión de sombras. CAM 04 conserva la lectura de la piedra, con el suelo en sombra más profundo. No se declara igualada la atmósfera de la película.

| Comparación | Evidencia |
| --- | --- |
| CAM 01 completa | [4.2 corregido](cam01-42.png) / [4.3](cam01-43.png) |
| Sólo áreas en CAM 01 | [4.2](areas-42.png) / [4.3](areas-43.png) |
| Mesa | [4.2](cam02-42.png) / [4.3](cam02-43.png) |
| Lateral | [CAM 04](cam04-43.png) |
| Estado del visor | [Diagnóstico](runtime.json) |

Imágenes de interfaz 1280 × 720 mostrando la captura fija 1920 × 800 reducida en el diálogo; no son los PNG originales a resolución completa. Captura sin paneo, luz de estudio desactivada y composición completa salvo las dos imágenes de áreas aisladas.

**23/23 pruebas correctas**, con ampliación de las comprobaciones de iluminación. Compilación Webpack 5.97.1 en **58,562 s**, sin errores y con tres advertencias de empaquetado. Revisado en Chrome 152, WebGPU, Three.js r185, NVIDIA Turing. Selector 4.2/4.3, aislamiento de áreas, captura y vuelta de estudio a escena comprobados. Se mantienen 149 mallas, 347.325 triángulos, 21 materiales y 25 texturas de materiales; no se presenta esta comprobación como benchmark de rendimiento.

Nota de esta entrega: no cambia el render ni sus controles; se conserva la compilación existente verificada en navegador. Se intentó renombrar los perfiles en el GUI, pero dos compilaciones quedaron sin progreso y se cancelaron; se retiró ese cambio de etiquetas. La identificación de R01 y de la propuesta descartada queda en esta documentación.
