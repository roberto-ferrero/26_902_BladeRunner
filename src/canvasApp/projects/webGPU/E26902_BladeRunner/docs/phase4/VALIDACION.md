# Fase 4 · Iluminación y sombras · puntos 1 a 4

Fecha: 08/09/2026. Estado: **cuatro primeros puntos completados**. Quedan abiertos los cuatro últimos de la fase: iluminación indirecta, fugas y contactos, friso en penumbra y descarte de caras traseras.

El hallazgo que ordena toda la fase es que **el GLB no sirve como fuente de luz**. Lleva el sol y nada más, y con valores desfasados. El `.blend` maestro es la única fuente fiable, y de ahí sale todo lo que se ha calibrado aquí.

## Lo entregado

```powershell
# Leer el equipo real del maestro. Necesita Blender 5.1.
$blender = "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe"
$script  = "src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/blender/leer_luces.py"
& $blender --background --factory-startup "../../_Blender/BladeRunner_5_6_High_v3.blend" `
  --python $script -- "src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase4"

npm run tyrell:lights   # confronta maestro y GLB, y deriva las conversiones
npm run build
npm run tyrell:capture -- --out src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase4 --prefix fase4
npm run tyrell:compare  # mide contra Blender y saca recortes
npm run test:tyrell     # 25 pruebas de las fases 1 a 4
```

## Lo que el GLB dice y lo que el maestro dice

| Dato | GLB | Maestro | Usado |
| --- | --- | --- | --- |
| Intensidad del sol | 683 lux, es decir 1,0 W/m² | 2,25 W/m² | maestro |
| Color del sol | blanco (1, 1, 1) | ámbar (1, 0,69, 0,34) | maestro |
| Dirección del sol | coincide, desvío 0,000° | — | GLB |
| Luces de área | ninguna | cuatro, de 170, 60, 70 y 80 W | maestro |
| Mundo | no viaja en glTF | (0,2, 0,25, 0,23) × 0,05 | maestro |

La exportación se hizo con el sol a 1,0 W/m², antes de que `finish_tyrell_v3.py` lo subiera a 2,25. Lo único que el GLB conserva bien es la transformación, y ésa se respeta.

## Punto 1 · Sol, disco, cielo y contraste

La dirección exportada reproduce la del maestro con **0,000° de desvío**, así que se conserva el nodo del GLB y sólo se sustituyen intensidad y color. El sol rasa a 4,1° sobre el horizonte, que es lo que da el contraluz de la escena.

El **disco solar emisivo**, a 651,6 m, cae a **0,07° de la dirección de la luz**: el sol que se ve y el que ilumina coinciden. Su emisión es 12 y la del cielo 0,6, ambas ya correctas en el GLB porque el maestro pone ese mismo 0,6.

El contraste interior/exterior mejora de forma medible. La pirámide del fondo pasa de 1,76 a **1,02 veces** la luminancia de Blender, y el estuche sobre la mesa de 1,20 a **1,08**. La luminancia media del fotograma de CAM 02 queda en 0,1046 frente a los 0,1052 de Blender.

## Punto 2 · Intensidades comprobadas, no trasladadas

Cada valor se convirtió con su regla, escrita junto al dato en `config.js`:

- **Sol.** La fuerza de un sol en Blender es irradiancia en W/m², y la intensidad de una `DirectionalLight` de Three entra al sombreado también como irradiancia, así que el número pasa igual. El exportador multiplica por 683 para dar lux, de modo que los 683 lux del archivo son 1,0 W/m² y no los 2,25 del maestro.
- **Áreas.** Una lámpara de área de Blender lleva potencia total en vatios. Un emisor lambertiano de área A radiando esa potencia al hemisferio tiene radiancia P/(A·π), y eso es lo que toma una `RectAreaLight`.
- **Mundo.** Un mundo uniforme de color C y fuerza S radia C·S en todas direcciones, lo que pone una irradiancia de π·C·S sobre una superficie despejada. La `AmbientLight` de Three suma color por intensidad directamente a la irradiancia, así que el π vive en la intensidad: 0,15708.

## Punto 3 · Rellenos de área reconstruidos

Las cuatro luces del maestro no viajan en el GLB, así que el visor las reconstruye. Antes existían cuatro rellenos con las posiciones correctas pero intensidades y colores inventados.

| Luz | Potencia | Forma | Área | Lado equivalente | Radiancia | Antes |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| L02 Cielo por ventanal | 170 W | disco de 6 m | 28,27 m² | 5,317 m | 1,9138 | 271 W |
| L03 Rebote frontal frío | 60 W | disco de 7 m | 38,48 m² | 6,204 m | 0,4963 | 108 W |
| L04 Rebote piedra izquierda | 70 W | disco de 4 m | 12,57 m² | 3,545 m | 1,7731 | 55 W |
| L05 Rebote piedra derecha | 80 W | disco de 4 m | 12,57 m² | 3,545 m | 2,0264 | 65 W |

Three no tiene luz de disco, así que cada una se convierte en un cuadrado de la misma área: la potencia y la radiancia quedan bien y sólo cambia la silueta, que en un relleno suave se puede permitir. La orientación sale de la dirección real de cada lámpara, no de un objetivo inventado.

La inicialización para WebGPU se conserva y se documenta: las tablas LTC tienen que existir antes de sombrear la primera luz de área, y se liberan cuando el último proyecto que las usa se cierra.

Los colores del maestro son **lineales**. Se asignan con `LinearSRGBColorSpace` y nunca como literal hexadecimal, que Three leería como sRGB y oscurecería. El relleno hemisférico inventado de la fase 1 desaparece y lo sustituye el mundo del maestro.

## Punto 4 · Sombras solares ajustadas

El frustum ortográfico se ajusta en el espacio del propio sol a lo que de verdad proyecta, en tiempo de construcción y no a mano.

| | Antes | Ahora |
| --- | --- | --- |
| Ancho por alto | 36 × 24 m | **26,89 × 10,37 m** |
| Rango de profundidad | 0,1 a 150 m | **83,1 a 113,3 m** |
| Texel del mapa de 2048 | 17,6 mm | **13,1 mm** |
| Sesgo normal | 25 mm fijos | 19,7 mm, que son 1,5 texels |
| Emisores de sombra | por radio de 50 m | 172, además excluyendo por nombre pirámide, cielo y disco |

El área del frustum baja al 32 % y el rango de profundidad de 149,9 a 30,2 m, lo que también recupera precisión en el mapa. Los sesgos se expresan **en texels del mapa ajustado**, de modo que cambiar de calidad recalcula el ajuste y no hay que volver a afinarlos a mano; una prueba lo comprueba a 2048 y a 1024.

Revisado en pantalla en las tres cámaras: no aparece acné de sombra ni despegue del contacto.

## Resultado medido

Error cuadrático medio del fotograma frente al render de Blender:

| Cámara | Fase 3 | Fase 4 |
| --- | ---: | ---: |
| CAM 01 | 0,1100 | **0,0943** |
| CAM 02 | 0,1133 | **0,0948** |

Por regiones, la razón de luminancia lineal frente a Blender:

| Región | Fase 3 | Fase 4 | Objetivo |
| --- | ---: | ---: | ---: |
| Pirámide del fondo | 1,76 | **1,02** | 1,00 |
| Estuche de instrumental | 1,20 | **1,08** | 1,00 |
| Campo de cuero | 3,13 | **1,65** | 1,00 |
| Licorera de cristal | 2,52 | **1,85** | 1,00 |
| Suelo centro | 1,86 | **1,61** | 1,00 |
| Friso superior | 2,24 | **2,10** | 1,00 |
| Columna izquierda | 0,22 | **0,14** | 1,00 |
| Suelo lateral izquierdo | 0,12 | **0,07** | 1,00 |

Los recortes lado a lado están en [recortes/](recortes), con Blender a la izquierda, la fase 4 en el centro y la fase 3 a la derecha.

## Lo que queda y por qué

El resultado se parte en dos, y las dos partes tienen causa identificada.

**Las zonas en sombra salen demasiado oscuras**, hasta 3,8 EV por debajo de Blender. Es la falta de iluminación indirecta: Blender traza los rebotes y el visor sólo tiene el mundo uniforme del maestro, que además únicamente alimenta el difuso. Es el quinto punto de esta fase, todavía abierto.

**El pavimento y el friso siguen por encima**, 0,69 y 1,07 EV. La causa no es la calibración. Se comprobó en el maestro que las cuatro lámparas tienen `diffuse_factor`, `specular_factor` y `volume_factor` a 1, y todas sus visibilidades activas, así que contribuyen igual que en el visor. Lo que cambia es que **en Blender esos rellenos proyectan sombra y en Three.js una `RectAreaLight` no puede hacerlo**. Su luz llega al pavimento sin que las columnas la corten. El recorte del suelo lo enseña: Blender tiene bandas oscuras entre los haces y el visor sale liso.

A eso se suma que el pavimento todavía no refleja las columnas, que es la fase 5.

## Límites de esta entrega

No se ha tocado la iluminación indirecta, ni las fugas de luz, ni el friso, ni el descarte de caras traseras: son los cuatro puntos restantes de la fase y se han dejado fuera a propósito para que lo medido aquí sea atribuible a la calibración y no a una mezcla.

El sol de Blender tiene 1,15° de diámetro angular, que es lo que ablanda su sombra. Una `DirectionalLight` de Three no tiene ese control, así que la suavidad viene del radio del filtro, fijado en 2 texels. No es la misma penumbra y no se afirma que lo sea.

Los discos se aproximan por cuadrados de igual área. La potencia y la radiancia se conservan; la silueta del reflejo especular no.

**No se ofrece cifra de rendimiento.** Las lecturas de esta sesión fueron de 30,7, 33,5 y 32,7 fotogramas por segundo, dentro de la misma dispersión que la fase 3 documentó para este equipo. Lo que no depende del reloj sí queda registrado: las llamadas de dibujo siguen en 328, 262 y 313, sin cambio respecto a la fase 3, porque el equipo de luces tiene el mismo número de fuentes que antes. La medición formal pertenece a la fase 8.
