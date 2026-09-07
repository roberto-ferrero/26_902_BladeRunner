# Fase 4 · Iluminación y sombras

Fecha: 08/09/2026. Estado: **siete de ocho puntos completados**. Queda abierto el friso en penumbra, diagnosticado pero no resuelto.

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

Nota: esa tabla y la anterior corresponden al cierre de los cuatro primeros puntos. Los puntos 5 a 8 los mueven de nuevo y sus cifras finales están más abajo.

## Punto 5 · Iluminación indirecta, comparada antes de elegir

Blender traza los rebotes y el visor no puede. El plan pide comparar las opciones en vez de suponer una, así que se implementaron cuatro y se midieron todas con las mismas cámaras y regiones. La casilla **Indirecta** del visor permite cambiar entre ellas.

| Modo | Qué es |
| --- | --- |
| Ninguna | Sólo el sol y los cuatro rellenos. Es el suelo de la comparación. |
| Ambiente | El mundo de Blender como luz ambiente. Alimenta el difuso y nada más; es lo que llevaban los cuatro primeros puntos. |
| Mundo | El mundo de Blender como entorno uniforme de verdad. La misma irradiancia en el difuso, más la mitad especular que una ambiente no puede dar. |
| Escena | El entorno capturado desde la propia sala, cubo de 256 desde su centro, con las luces directas ya puestas. Un rebote. |

El error del fotograma **no sirve para elegir**: los cuatro caen entre 0,0942 y 0,0956, dentro del ruido. Ese número lo domina el pavimento, que está de más por otra razón. El criterio que corresponde al propósito es cuánto levantan las regiones que viven de la luz rebotada:

| Modo | Distancia media a Blender | Peor región |
| --- | ---: | ---: |
| Ninguna | −2,42 EV | −3,79 EV |
| Ambiente | −2,36 EV | −3,78 EV |
| Mundo | −2,23 EV | −3,35 EV |
| **Escena** | **−1,89 EV** | **−2,76 EV** |

**Escena gana con claridad** y es la que se entrega. Cierra 0,53 EV de la distancia media y 1,03 EV de la peor. El mundo de Blender por sí solo aporta 0,06 EV sobre no tener nada, porque su radiancia es 0,01: la luz que llena las sombras del render no viene del mundo, viene de la piedra iluminada.

**El horneado se descarta, con su coste medido.** Un mapa de luz necesita un segundo juego de coordenadas de textura y **sólo 10 de las 157 primitivas del GLB lo traen**. Habría que generarlo en Blender para las otras 147, hornear, reexportar el modelo y romper la comprobación de integridad por SHA-256 que sostiene la fase 1. El plan lo condiciona a que mejore la comparación y su coste esté justificado; con 147 primitivas por rehacer y el modelo reexportado, no lo está todavía.

## Punto 8 · Descarte de caras traseras, decidido midiendo

Los 27 materiales llegan a dos caras, que es costumbre del exportador y no una decisión de autor. La prueba no consulta el archivo, mide la geometría: en una superficie cerrada las normales ponderadas por área se cancelan, así que el módulo de su suma dividido por la suma de sus módulos tiende a cero; en una cartela plana todas apuntan igual y vale uno. Cuesta una pasada por los triángulos, no necesita soldar vértices y separa este modelo sin ambigüedad.

| Superficie | Cierre medido |
| --- | ---: |
| Cielo de fondo y disco solar | 1,000 |
| Pirámide exterior | 0,154 |
| Columnas | 0,05 a 0,09 |
| Todo lo demás | por debajo de 0,015 |

Con el umbral en 0,5 se descartan **24 de 27 materiales** en 65 ms de carga. Se conservan tres: el cielo y el disco solar por abiertos, y **la cristalería por transmisión**.

Esa última no se dedujo, se midió. Al descartarla también, lo único que cambió en todo el fotograma fue el cristal, y a peor: el vaso pasó de 1,72e-1 a 1,88e-1 de luminancia lineal contra los 2,83e-2 de Blender. Three aproxima el volumen dibujando primero las caras traseras y luego las delanteras, así que quitarle las traseras le cuesta la refracción. Estar cerrado no basta: hay que dejar pasar la luz.

## Punto 6 · Fugas, contactos y detalle en sombra

El descarte cambia además cómo se proyectan las sombras: Three pasa a trazarlas desde las caras traseras de los sólidos, que es justo lo que normalmente obliga a un sesgo normal grande. Con eso ya puesto, se barrió el sesgo en el navegador midiendo el contacto en la base de una columna, el ruido del pavimento iluminado y una sombra larga.

| Sesgo normal | Contacto | Pavimento iluminado | Desviación del pavimento |
| ---: | ---: | ---: | ---: |
| 0 texels | 0,0135 | 0,6889 | 0,0398 |
| 1 texel | 0,0135 | 0,7006 | 0,0569 |
| 1,5 texels | 0,0135 | 0,7040 | 0,0603 |
| 4 texels | 0,0141 | 0,7191 | 0,0742 |

El contacto **no se mueve**: no hay despegue que recuperar. Lo que sí se mueve es el pavimento, que se aclara y se ensucia según sube el sesgo, que es la definición de fuga de luz. No hay nada que comprar con un sesgo grande, así que baja de 1,5 a **0,25 texels**, con margen por si alguna superficie no se beneficia del descarte. Revisado en pantalla: sin acné.

Empeora ligeramente las regiones en sombra, porque cerrar la fuga las oscurece y ahí ya faltaba luz. El déficit es de rebotes, no de fuga.

Los contactos del mobiliario ya estaban medidos uno a uno en la [fase 2](../phase2/VALIDACION.md): catorce de quince conjuntos apoyan dentro de 5 mm y **la consola sigue flotando 40 mm sobre el podio**, que es un defecto del modelo y no de la luz.

## Punto 7 · El friso, diagnosticado y sin resolver

**No se ha conseguido y no se disimula.** El friso sale a 2,13 veces la luminancia de Blender, y el recorte lo enseña sin lugar a dudas: en la referencia el relieve apenas se distingue y en el visor se lee entero.

Lo que sí se ha establecido, midiendo dentro de la página apagando cada fuente por turnos:

- **L02, el relleno del ventanal, aporta el 99,3 % de la luz del friso.** Apagándolo pasa de 5,17e-2 a 3,54e-4. El sol no aporta nada medible y los otros tres rellenos menos del 3 % entre todos. Ese mismo relleno aporta el 99 % del pavimento central.
- **El friso no está ocluido de L02.** Es el sofito del dintel, entre y 5,47 y 5,80 y z −13,7 a −12,91; L02 está en (0, 4,2, −13,8) apuntando a (0, −0,284, 0,959). La superficie cae unos 5° dentro del hemisferio emisor, en incidencia rasante. **Por tanto las sombras de luz de área no lo arreglarían**, y ésa era la explicación de reserva que traía el cierre de los cuatro primeros puntos.

Queda como hipótesis, no como hallazgo, que la integración de luces de área de Three sea imprecisa en ese rasante. Comprobarlo exige contrastar su irradiancia contra la solución analítica de un disco lambertiano fuera de eje, y no se ha hecho.

Lo que **no** se ha hecho, y por qué: bajar la potencia de L02 falsearía un valor verificado contra el maestro y apagaría también el pavimento; excluir el friso por capas de luz sería dirección artística disfrazada de física; sustituir L02 por un foco con sombras no cambiaría nada, porque el friso no está ocluido. La casilla queda abierta.

## Resultado al cerrar la fase

| Cámara | Fase 3 | Puntos 1 a 4 | Fase 4 completa |
| --- | ---: | ---: | ---: |
| CAM 01 | 0,1100 | 0,0943 | 0,0967 |
| CAM 02 | 0,1133 | 0,0948 | **0,0928** |

| Región | Fase 3 | Fase 4 | Objetivo |
| --- | ---: | ---: | ---: |
| Pirámide del fondo | 1,76 | **1,05** | 1,00 |
| Estuche de instrumental | 1,20 | **1,10** | 1,00 |
| Suelo lateral izquierdo | 0,12 | **0,32** | 1,00 |
| Campo de cuero | 3,13 | **1,70** | 1,00 |
| Suelo centro | 1,86 | **1,61** | 1,00 |
| Friso superior | 2,24 | **2,13** | 1,00 |
| Columna izquierda | 0,22 | **0,13** | 1,00 |

La luminancia media del fotograma de CAM 02 queda en 0,1054 frente a los 0,1052 de Blender. CAM 01 sube un poco su error respecto a los cuatro primeros puntos porque la indirecta también levanta lo que ya sobraba; el balance por regiones es claramente mejor.

## Límites de esta entrega

El friso queda sin resolver, con su diagnóstico escrito arriba.

La sonda de la opción escena se toma desde un único punto, el centro de la sala. Un rebote que varía con el sitio no cabe en una sola sonda, y es además un solo rebote. Los −1,89 EV que quedan en las zonas de sombra son eso.

El sol de Blender tiene 1,15° de diámetro angular, que es lo que ablanda su sombra. Una `DirectionalLight` de Three no tiene ese control, así que la suavidad viene del radio del filtro, fijado en 2 texels. No es la misma penumbra y no se afirma que lo sea.

Los discos se aproximan por cuadrados de igual área. La potencia y la radiancia se conservan; la silueta del reflejo especular no.

**No se ofrece cifra de rendimiento.** Las lecturas de esta sesión fueron de 24 a 60 fotogramas por segundo para la misma compilación, dentro de la dispersión que la fase 3 documentó para este equipo. Lo que no depende del reloj sí queda registrado: las llamadas de dibujo siguen en 328, 262 y 313, porque el equipo tiene el mismo número de fuentes. El descarte de caras traseras reduce el relleno sin tocar ese recuento, y la sonda de entorno cuesta una captura de cubo en la carga, no por fotograma. La medición formal pertenece a la fase 8.
