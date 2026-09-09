# 4.2 · Calibración de intensidades

09/09/2026. Perfil `tyrell-light-v2`, **Tyrell · luz 4.2**, con exposición base 1,07, compensación 0 EV y materiales Tyrell v1. La emisión del cielo es la de 4.1; la posición solar se corrigió después según la referencia del usuario (véase la nota final). Se ajusta el balance relativo en el visor; no se deducen valores fotométricos de las imágenes comprimidas de la película ni se convierten directamente vatios de Blender.

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

## Corrección posterior · sol junto al vértice del edificio

Según la indicación visual del usuario, el centro solar queda aproximadamente en el extremo superior izquierdo del edificio inclinado. En el perfil 4.2 se cambia `discPosition` de (2, 58, −650) a **(8, 42,5, −650) m**. El vértice de referencia del GLB está en (2,9263, 15,4421, −214,7697) m. Desde CAM 01, sin paneo, el centro del sol se proyecta 2,44 píxeles a la izquierda y 0,58 píxeles por encima de ese vértice en 1920 × 800.

En esta primera corrección se recalculó la dirección de la luz hacia la nueva posición del disco. Ese vínculo se sustituyó posteriormente por el ajuste descrito a continuación, tras observar la pérdida de sombras y de luz en la pirámide. El perfil 4.1 conserva su composición histórica para comparar. Es una colocación mundial fija: el paralaje cambia al pasar a otra cámara o hacer paneo, como corresponde a distintas distancias. Las capturas anteriores de este informe documentan el balance previo a este ajuste.

Validación: 23/23 pruebas y compilación correcta en 50,488 s, con tres advertencias de empaquetado. [Plano general corregido](cam01-solar-position.png). El halo y la difusión del sol siguen previstos en fase 6.

## Recuperación de sombras y luz de la pirámide

La revisión del usuario mostró dos regresiones al orientar la luz hacia el disco más bajo: pérdida de la cara iluminada de la pirámide y de la proyección visible del mobiliario en el suelo. La solución conserva `discPosition = [8, 42.5, -650]`, pero introduce **`keyPosition = [2, 58, -650]`** como referencia independiente para la dirección de la luz. Recupera la dirección anterior sin mover el disco ni los edificios. Es una separación artística explícita entre posición visual y luz principal, no una alineación física exacta con el sol visible.

Se reducen además las intensidades de las áreas a **0,08 / 0,08 / 0,2 / 0,2** (ventanal, frontal, izquierda, derecha). Ese relleno sin sombras aclaraba la proyección del mobiliario. Sol 2,1, ambiente 0,8, exposición, materiales y sesgos de sombra permanecen iguales. No se añaden luces, geometría, texturas ni pasadas.

[CAM 01 después de recuperar las sombras](cam01-shadow-recovery.png): vuelve la cara inclinada iluminada y la sombra central del mobiliario hacia la cámara, conservando el sol junto al vértice. El pavimento todavía requiere el tratamiento de reflejos y atmósfera previsto en el plan. La captura es la previsualización de 1920 × 800 dentro de una interfaz de 1280 × 720.

Validación: **23/23 pruebas**, incluyendo dirección de la luz y posición del disco independientes, aislamiento y restauración de aportes. Compilación Webpack correcta en 64,298 s, tres advertencias de empaquetado. [Diagnóstico actualizado](runtime-shadow-recovery.json). Siguiente entrega del plan: 4.3.
