# Fase 6 · Atmósfera y acabado cinematográfico

Fecha: 08/09/2026. Estado: **siete de ocho puntos completados**. El octavo, grano y viñeta, se descarta razonadamente. La fase **no** desbloquea la fase 5, aunque una primera lectura equivocada lo dio por hecho; está rectificado más abajo.

**CAM 01 baja a 0,0905 de error frente a Blender**, el mejor resultado del proyecto, desde 0,0965.

## La pieza que ordena la fase

Hasta ahora el renderizador aplicaba el mapeo tonal él mismo, sobre un destino interno que reserva precisamente porque hay mapeo tonal. Eso dejaba sin sitio a cualquier efecto que tenga que trabajar sobre luz lineal antes de la curva: un bloom aplicado después mapea valores de pantalla, no luz.

Una `RenderPipeline` mete la escena en una pasada explícita, así que los efectos se componen en lineal y la curva se aplica una vez al final. Se deja `outputColorTransform` activo, con lo que la tubería envuelve la salida en el mapeo tonal y el espacio de color del propio renderizador: **el AgX con el aspecto de Blender de la fase 3 sigue aplicándose igual y no hay nada que recalibrar**.

El núcleo cambia lo mínimo: `AppRender` pregunta al proyecto si quiere dibujar el fotograma y, si no, dibuja como siempre.

## Punto 4 · Bloom, con los números de Blender y uno medido

El compositor del maestro usa un destello **Fog Glow con umbral 1,2, fuerza 0,6 y tamaño 0,72**. Umbral y tamaño actúan sobre el mismo render lineal en los dos sitios, así que pasan tal cual.

La fuerza **no pasa**: el destello de Blender mezcla y el bloom de Three suma. Barriéndola en el navegador contra la referencia, el error medio por regiones sale así:

| Fuerza | Error medio en EV |
| ---: | ---: |
| 0 | 1,409 |
| 0,2 | 1,128 |
| **0,3** | **1,097** |
| 0,45 | 1,192 |
| 0,6 | 1,261 |

Se entrega **0,3**. Copiar el 0,6 de Blender habría quedado peor que no poner bloom en varias regiones.

## Puntos 1, 2, 3 y 8 · Las dos atmósferas, separadas

El plan pide separar la profundidad del exterior de la bruma de la sala, y el maestro respalda esa separación: su polvo es una **caja** de 18 × 5,8 × 25,4 m centrada en la sala, con `Principled Volume` de densidad 0,005, color (0,66, 0,61, 0,47) y anisotropía 0,28. No hay volumen fuera. Como las luces de área, esa caja nunca se exportó.

**Dentro de la sala** los haces se trazan con `GodraysNode`, que raymarchea el mapa de sombra del propio sol. Eso da tres cosas de una vez: los haces, la oclusión por las columnas sin código extra, y un efecto acotado al frustum de sombra, que la fase 4 ajustó exactamente a la sala. El color es el de Blender; la densidad va en la escala del raymarcher y se ajusta contra el render. Revisado en pantalla en las tres cámaras: sin bandas ni ruido visible.

**Fuera** se aplica perspectiva aérea por profundidad, con `smoothstep` de 60 a 600 m, que no toca nada del interior porque la sala acaba hacia los 16 m. Esta parte **no está medida contra Blender**, y se dice: aquel render no tiene volumen ahí fuera. Viene de los fotogramas, donde lo lejano se aclara y pierde contraste en vez de recortarse contra el cielo, y el plan da autoridad a la película sobre el acabado.

Su color se midió, no se eligió: es el del cielo del vano en el render de Blender, **(0,186, 0,081, 0,023) lineal**. Apuntar la bruma al propio cielo hace que el cielo apenas cambie y que sólo suba lo oscuro y lejano hacia él, que es lo que hace la perspectiva aérea de verdad. Con un color más oscuro, la primera versión hundía el cielo de 0,82 a 0,49 veces el de Blender.

## Punto 7 · El sol

El disco emisivo de 14 m a 650 m ya no se recorta: el bloom le da un núcleo difuso con halo que invade las nubes, como en los tres fotogramas. No hizo falta tocar el disco ni su material.

## Punto 5 · Cada efecto por separado

Tres casillas nuevas en el visor: **Bruma exterior**, **Haces de luz** y **Bloom**. Apagando cada una y midiendo las mismas regiones:

| Región | Todo | Sin bruma | Sin haces | Sin bloom |
| --- | ---: | ---: | ---: | ---: |
| Cielo del vano | 0,1068 | 0,1096 | 0,1038 | 0,0920 |
| Columna izquierda | 0,00103 | 0,00084 | 0,00096 | 0,00096 |
| Friso superior | 0,0579 | 0,0619 | 0,0565 | 0,0538 |
| Mesa de trabajo | 0,0313 | 0,0364 | 0,0301 | 0,0085 |

El coste en llamadas de dibujo pasa de 328, 262 y 313 a **341, 275 y 326**: trece más por cámara, que es la pasada y la cadena del bloom. Los haces se trazan a media resolución.

Esa tabla costó un error propio que conviene dejar escrito: durante un rato los haces aportaban **exactamente cero**. La causa era mía, no del motor. La tubería se construía antes de que el perfil de calidad sustituyera el sol por un clon, y los haces se quedaban leyendo el mapa de sombra de una luz que ya no se renderizaba. Ahora la tubería se construye después, y se reconstruye si el sol cambia de identidad. Un segundo fallo del mismo tipo: pasar un `THREE.Color` a `vec3()` no convierte, devuelve cero, lo que convertía la bruma en un fundido a negro y anulaba los haces.

## Punto 6 · Grano, viñeta y desenfoque: descartados

El plan los condiciona a que aporten fidelidad **y no oculten defectos del modelo o la luz**. Ahora mismo el friso sigue a 2,38 veces la luminancia de Blender y la columna izquierda a 0,22. Grano y viñeta reducirían el contraste local y la periferia justo donde están esos dos errores, así que los taparían en vez de corregirlos. Se descartan hasta que esos números estén en su sitio. `DepthOfFieldNode` y `FilmNode` están disponibles en la versión instalada, así que la decisión es reversible.

## Resultado

| Cámara | Fase 4 | Fase 6 |
| --- | ---: | ---: |
| CAM 01 | 0,0965 | **0,0905** |
| CAM 02 | 0,0936 | 0,0954 |

| Región | Fase 4 | Fase 6 | Objetivo |
| --- | ---: | ---: | ---: |
| Mesa de trabajo | 0,26 | **0,97** | 1,00 |
| Cielo del vano | 0,82 | **1,08** | 1,00 |
| Pirámide del fondo | 1,04 | **1,04** | 1,00 |
| Estuche de instrumental | 1,10 | **1,11** | 1,00 |
| Respaldo del sillón | 0,30 | **0,55** | 1,00 |
| Columna izquierda | 0,15 | **0,22** | 1,00 |
| Friso superior | 2,13 | 2,38 | 1,00 |
| Vaso de cristal | 6,08 | 5,98 | 1,00 |

CAM 02 sube un poco porque el bloom levanta la cristalería, que ya sobraba. El friso empeora por lo mismo, y sigue siendo el problema abierto de la fase 4.

## Lo que esto le hace a la fase 5: nada, y hubo que rectificar

La fase 5 se aparcó porque el reflector planar del pavimento no llegaba a la pantalla. La razón que se dio entonces fue el choque con el destino de posprocesado que imponía el mapeo tonal, y la vía de desbloqueo propuesta fue llevar ese mapeo a una pasada propia. Esta fase la construye, así que tocaba comprobarlo.

**No funciona, y la primera lectura de esta comprobación fue equivocada.** Conviene dejar escrito el error y cómo se detectó.

La primera medida pareció buena: los avisos de WebGPU bajaban de 1255 a 8 y las tres capturas salían con firmas distintas. Las dos cosas eran falsas.

- Los 1255 se habían contado como líneas impresas y los 8 como **tipos únicos**, porque entretanto la herramienta pasó a agrupar repeticiones. Contando ocurrencias en ambos casos, siguen siendo unos 1350 por sesión. La tubería no cambia nada ahí.
- Las firmas distintas venían de leer el lienzo justo después de cambiar de cámara: cada lectura cogía el fotograma de la cámara **anterior**, que era distinto cada vez. Eso es exactamente lo que produce un retraso constante, no lo que lo descarta.

Lo que zanjó el asunto fue una captura del compositor, no de la página, añadida a la herramienta como opción `--pantalla`. Con **CAM 02 seleccionada en la interfaz y sus 316 llamadas de dibujo en el contador**, la pantalla mostraba el encuadre de CAM 01. El renderizador dibuja la cámara correcta y la pantalla no la enseña.

La fase 5 sigue bloqueada, con el mismo diagnóstico que ya tenía y una hipótesis menos: no era el destino de posprocesado.

## Límites de esta entrega

La perspectiva aérea del exterior no está medida contra Blender porque allí no hay nada que medir; responde a los fotogramas. La densidad de los haces está ajustada a ojo contra el render, no derivada de los 0,005 del maestro: el raymarcher usa su propia escala y la equivalencia no se ha establecido.

El friso y la cristalería siguen por encima y el bloom los empeora ligeramente. No se ha compensado bajando el bloom, porque su fuerza está fijada por la medida y torcerla para tapar otro error sería cambiar dos cosas a la vez.

**No se ofrece cifra de rendimiento**, por lo mismo que en las fases 3, 4 y 5: este equipo no da lecturas reproducibles. Las llamadas de dibujo sí, y están arriba.
