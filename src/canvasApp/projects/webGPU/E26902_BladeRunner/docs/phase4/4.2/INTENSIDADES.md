# 4.2 · Calibración de intensidades

09/09/2026. Perfil `tyrell-light-v2`, **Tyrell · luz 4.2**, con exposición base 1,07, compensación 0 EV y materiales Tyrell v1. La composición solar y la emisión del cielo son las de 4.1. Se ajusta el balance relativo en el visor; no se deducen valores fotométricos de las imágenes comprimidas de la película ni se convierten directamente vatios de Blender.

## Parámetros

| Aporte | 4.1 | 4.2 |
| --- | ---: | ---: |
| Sol | 2,6 | 2,1 |
| Ambiente hemisférico | 0,65 | 0,8 |
| Área ventanal | 0,65 | 0,32 |
| Área frontal | 0,22 | 0,12 |
| Área izquierda | 0,45 | 0,3 |
| Área derecha | 0,45 | 0,3 |

Se reduce la aportación directa y especular de las áreas, especialmente la del ventanal, y se compensa moderadamente la lectura difusa con ambiente. El objetivo es mantener piedra legible, madera y cuero oscuros, y brillos localizados, siguiendo las tres [referencias del usuario](<../../reference images/README.md>). El ambiente hemisférico es una aproximación; la iluminación indirecta se revisará en 4.5.

Los valores corresponden a `intensity` de cada tipo de luz de Three.js r185 y no se suman como magnitudes equivalentes. El código instalado de `RectAreaLight` expresa su intensidad en nits y calcula potencia como intensidad × ancho × alto × π. Se conservan tamaños, colores y posiciones de las cuatro áreas, así como dirección solar, sesgos de sombra, geometría y texturas. No hay nuevas luces ni pasadas.

## Comparación reproducible

En **Color y materiales → Iluminación**, alternar 4.1 y 4.2. El perfil provisional también permanece disponible. **Aporte de luz** permite aislar sol, ambiente, conjunto de áreas o cada área por separado; seleccionar **Composición completa** al terminar. El cielo y disco emisivos permanecen visibles en estos modos, pero no iluminan la sala por sí mismos.

Usar CAM 01/02/04, Media, 0 EV, luz de estudio desactivada. El modo de estudio sigue siendo independiente: al salir recupera el perfil y el aporte elegidos. El diagnóstico registra `lighting.contribution`; el nombre de captura incorpora ese identificador. Las capturas de referencia restablecen temporalmente el paneo para hacer comparaciones estables.

## Validación técnica

Producción compilada con Webpack 5.97.1 en 55,554 s, sin errores y con tres advertencias de tamaño/empaquetado. Navegador Chrome 152, WebGPU, Three.js r185, NVIDIA Turing. Verificados cambios de perfil, captura, aislamiento de sol/ambiente/áreas, regreso de estudio a escena y cambio Baja → Media. [Diagnóstico final](runtime.json): 149 mallas, 347.325 triángulos, 21 materiales y 25 texturas de materiales; sin incremento respecto a la corrección del paneo. Las métricas RAF no son un benchmark de GPU.

## Revisión visual y evidencias

Capturas de interfaz a 1280 × 720 que muestran la imagen de referencia 1920 × 800 reducida en el diálogo; no son los PNG originales a resolución completa.

| Comparación | Evidencias |
| --- | --- |
| CAM 01, composición completa | [4.1](cam01-41.png) / [4.2](cam01-42.png) |
| CAM 01, aportes separados en 4.2 | [Sol](cam01-sun.png) / [áreas](cam01-areas.png) / [ambiente](cam01-ambient.png) |
| CAM 02, mesa y cuero | [4.1](cam02-41.png) / [4.2](cam02-42.png) |
| CAM 04, lateral | [4.2](cam04-42.png) |

La comparación de fuentes separa dos problemas: el sol produce la franja intensa del pavimento; las áreas, la mancha amplia central. Reducir intensidades contiene ambas, pero no modifica su forma. El ambiente recupera la textura de la piedra sin añadir reflejo especular al suelo. CAM 02 conserva el borde cálido del tablero y reduce la claridad del cuero; la superficie derecha del tablero todavía presenta un brillo extenso. CAM 04 mantiene separación entre columnas y exterior. La revisión de las áreas en 4.3 debe abordar esa distribución, sin compensarla con exposición o aclarando materiales.

23/23 pruebas correctas, ampliando la prueba de iluminación con todos los modos de aislamiento, restauración exacta de intensidades tras alternar perfiles y conservación de posición/emisión del cielo. Código: `config.js`, `TyrellLighting.js`, `TyrellUI.js` y entrada del proyecto. Los archivos Blender y GLB siguen intactos y se mantiene la corrección de juntas del paneo.

```powershell
npm.cmd run test:tyrell
npm.cmd run build
```

El cierre de este punto fija una base relativa de intensidades. Los reflejos alargados, la difusión atmosférica del sol y la equivalencia final con los fotogramas pertenecen a fases posteriores.
