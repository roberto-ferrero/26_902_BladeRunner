# Fase 3 · Materiales y respuesta al color

Fecha: 07/09/2026. Estado: **completada**. Próxima entrega: fase 4, iluminación y sombras.

Esta fase fija la gestión de color antes de tocar las luces, como pedía el plan, y comprueba los materiales del GLB uno a uno. La conclusión principal es que los materiales están bien y que casi todo lo que se ve mal ahora es luz provisional. El objetivo artístico sigue siendo el de [REFERENCIAS.md](../REFERENCIAS.md).

## Lo entregado

```powershell
npm run tyrell:color       # compara el mapeo tonal del visor con el de Blender, medido
npm run tyrell:materials   # audita materiales, texturas y el contenido de cada mapa
npm run tyrell:compare     # compara las capturas con los renders de Blender y saca recortes
npm run test:tyrell        # 18 pruebas de las fases 1 a 3
```

El visor incorpora el aspecto de color con el que se renderizaron las referencias, una casilla para desactivarlo y comparar, y grosor real para la cristalería. La interfaz añade **Look AgX de Blender**, activo por defecto.

## Gestión de color, medida en vez de supuesta

Los renders de referencia se hicieron con la transformada **AgX**, el aspecto **«AgX - Medium High Contrast»** y exposición **+0,1 EV**, según `_Blender/build_tyrell_v3.py` y `finish_tyrell_v3.py`. Three.js r182 implementa AgX base y **ningún aspecto**, así que al visor le faltaba media parte de la curva.

Para no adivinar, [`tools/blender/medir_agx.py`](../../tools/blender/medir_agx.py) hace que el propio Blender 5.1.1 revele su curva: escribe una rampa de 1024 valores lineales conocidos, de −14 a +6 EV, como PNG de 16 bits con la transformada aplicada. [`tools/calibrar-color.mjs`](../../tools/calibrar-color.mjs) la lee y la compara con la implementación de Three.

| Comprobación | Resultado |
| --- | --- |
| Fiabilidad del banco: vista Standard frente a la curva sRGB pura | error cuadrático medio 0,00000, máximo 0,00001 |
| AgX de Three frente a AgX de Blender sin aspecto | error 0,0219, máximo 0,0546 en −3,54 EV |
| Cuánto cambia la imagen el aspecto del render | error 0,0257, máximo 0,0452 |
| Contraste ajustado | **1,198**, frente al 1,2 que declara la configuración OCIO de Blender |
| Pivote ajustado | 0,691 sobre el logaritmo normalizado de Three |
| Residuo frente a Blender con el aspecto puesto | **0,0091**, máximo 0,0223 |
| Residuo sin el aspecto | 0,0322, máximo 0,0830 |

El aspecto es un `GradingPrimaryTransform` de OCIO en estilo logarítmico con saturación 1 y los tres canales al mismo contraste, así que es una curva por canal pura y entra tal cual en la cadena de Three, entre la normalización logarítmica y el sigmoide. Que el ajuste recupere 1,198 contra el 1,2 declarado confirma que el modelo es el correcto y no una curva inventada que casualmente encaja.

Lo que esto arregla, en valores de pantalla para un gris de entrada:

| Entrada | Blender | Three sin aspecto | Three con aspecto |
| ---: | ---: | ---: | ---: |
| −6 EV | 0,070 | 0,115 | 0,051 |
| −4 EV | 0,230 | 0,312 | 0,247 |
| −2 EV | 0,547 | 0,561 | 0,538 |
| 0 EV | 0,814 | 0,792 | 0,812 |
| +2 EV | 0,957 | 0,936 | 0,960 |

Sin el aspecto, el visor abría las sombras un 64 % de más a −6 EV. Ésa era la causa de que la sala se viera lavada y de que el friso superior apareciera iluminado donde la referencia y la película lo dejan en penumbra.

La exposición pasa de 1,07 a **1,0718**, que es 2^0,1 exacto, el mismo +0,1 EV de Blender.

Queda una diferencia de fondo que el aspecto no puede cerrar: Three aproxima el sigmoide de AgX con un polinomio y Blender usa su tabla. Son 0,0219 de error cuadrático medio, con el máximo en las medias sombras. Cerrarla exigiría llevar la tabla de Blender al shader y no se ha hecho.

## Auditoría de materiales

[`tools/auditar-materiales.mjs`](../../tools/auditar-materiales.mjs) recorre los 27 materiales, las 37 texturas y las 25 imágenes del GLB, y además **decodifica cada mapa** para decir qué contiene, no sólo que existe.

| Comprobación del plan | Resultado |
| --- | --- |
| Separar texturas de color y de datos | 13 ranuras en sRGB y 24 de datos; **ninguna imagen alimenta las dos**, así que ninguna se lee en el espacio equivocado |
| Mapas de color, normales y rugosidad | Las 37 texturas piden mipmaps; ninguna queda sin uso; todas son PNG de 1024 × 1024 salvo el cielo, de 1774 × 887 |
| Materiales estándar frente a nodos | 171 mallas resuelven con `MeshStandardMaterial` y sólo las 4 piezas de cristal necesitan `MeshPhysicalMaterial` |
| Recursos compartidos sin clonar | En la escena viva hay 175 mallas con **27 materiales, 157 geometrías y 25 texturas**, exactamente los recursos del archivo |

## El suelo: material correcto, luz provisional

El pavimento usa «PBR | Piedra negra pulida» en sus 21 sectores. Su mapa de color es piedra casi negra: **luminancia lineal media 0,0022**. La rugosidad viene del mapa, entre 0,11 y 0,45, y ahí es donde vive el desgaste. El mapa de normales se mueve entre 0,47 y 0,53 alrededor del plano y el material lo escala a 0,035, así que **no puede producir aspecto de agua**; si acaso, apenas produce relieve.

Un albedo de 0,0022 no puede dar por difusión el suelo crema que se veía. La medida lo confirma: apagando los cuatro rellenos de área y el hemisférico, el centro del pavimento cae de **0,429 a 0,0040** de luminancia lineal, un factor de 109. El suelo brilla porque los rellenos provisionales se reflejan en una piedra pulida de rugosidad 0,19, y su color crema es el de esos mismos rellenos. Blender deja esa zona en 0,230, entre los dos.

**Conclusión:** el suelo no necesita ajuste de material. Necesita las luces de la fase 4. La evidencia está en `exp-sinrelleno-cam01-comparacion.png`.

## La cristalería

El material llega bien: `MeshPhysicalMaterial`, transmisión 1, índice de refracción 1,46, rugosidad 0,075, doble cara. Pero el GLB trae `KHR_materials_transmission` **sin** `KHR_materials_volume`, así que el grosor llega a **0**. Con grosor cero el rayo de refracción mide cero: el cristal enseña exactamente lo que tiene detrás, sin desviarlo, y se lee como plástico esmerilado en vez de vidrio.

El visor calcula ahora el grosor de las propias piezas al construir la escena: mediana de su dimensión menor, 116,6 mm, por el factor de `config.js`, lo que da **58,3 mm**. Se escribe una vez en el material compartido por la licorera, su tapón y los dos vasos, sin clonar nada.

El efecto medido es pequeño y desigual: la licorera pasa de 0,94 a 1,01 veces la luminancia de su fondo, acercándose al 1,25 de Blender, y el vaso empeora de 2,33 a 2,42 frente al 1,09 de Blender. El error del fotograma queda igual, 0,1129 frente a 0,1133. **Corrige un defecto real pero su beneficio todavía no se demuestra**, porque con la luz provisional el fondo que atraviesa el cristal ya está mal. Hay que volver a medirlo en la fase 4. El factor se puede poner a 0 en `config.js` para conservar el valor del archivo.

## Comparación con Blender

Con `--recortes` la herramienta escribe una lámina por región en [recortes/](recortes), con Blender a la izquierda, el visor en el centro y el visor sin el aspecto a la derecha.

Luminancia media de pantalla por región, y la razón en luz lineal frente a Blender:

| CAM 01 | Blender | Visor | Razón | EV |
| --- | ---: | ---: | ---: | ---: |
| Suelo centro | 0,514 | 0,682 | 1,86 | +0,90 |
| Suelo lateral izquierdo | 0,035 | 0,004 | 0,12 | −3,03 |
| Columna izquierda | 0,057 | 0,014 | 0,22 | −2,15 |
| Friso superior | 0,165 | 0,253 | 2,24 | +1,16 |
| Cielo del vano | 0,337 | 0,305 | 0,82 | −0,29 |
| Mesa de trabajo | 0,195 | 0,105 | 0,33 | −1,58 |

| CAM 02 | Blender | Visor | Razón | EV |
| --- | ---: | ---: | ---: | ---: |
| Campo de cuero | 0,173 | 0,309 | 3,13 | +1,65 |
| Licorera de cristal | 0,196 | 0,313 | 2,52 | +1,33 |
| Vaso de cristal | 0,182 | 0,476 | 6,96 | +2,80 |
| Respaldo del sillón | 0,043 | 0,014 | 0,31 | −1,67 |
| Pirámide del fondo | 0,084 | 0,118 | 1,76 | +0,82 |

El error cuadrático medio del fotograma frente a Blender pasa de 0,1254 a **0,1133** en CAM 02 gracias al aspecto. En CAM 01 se queda igual, 0,1093 frente a 0,1100, y el detalle explica por qué: el aspecto cierra las sombras como debe, pero la escena no tiene iluminación indirecta, así que las zonas oscuras se pasan de cerradas. La columna izquierda queda 2,15 EV por debajo de Blender y el lateral del suelo 3,03 EV por debajo, mientras las zonas que reciben los rellenos provisionales quedan por encima. Es el patrón esperado de una escena sin rebotes y con rellenos mal calibrados, y es exactamente lo que la fase 4 tiene que resolver.

## Rendimiento

**No se ofrece cifra.** Con la misma compilación, los mismos ajustes y el mismo equipo, las lecturas de esta sesión oscilaron entre 22 y 60 fotogramas por segundo, en las tres cámaras y en ambos sentidos. Se añadió una pasada de calentamiento por las tres cámaras antes de medir y la dispersión siguió. Después de muchas compilaciones y arranques de navegador seguidos, el equipo no está en un estado que permita medir. La medición formal pertenece a la fase 8, sobre el dispositivo acordado y con el equipo en reposo.

Por el mismo motivo se corrige la tabla de la [fase 2](../phase2/VALIDACION.md), que presentaba 44,6, 41,5 y 46,6 fotogramas por segundo como si fueran cifras asentadas.

## Límites de esta entrega

El banco de color mide una rampa gris. Como todas las matrices de la cadena de AgX conservan el gris, eso basta para la curva de tono, pero **no comprueba el comportamiento del color saturado**, donde el aspecto de Blender y la aproximación de Three pueden separarse más.

La comparación por regiones usa rectángulos fijos sobre el fotograma de 1920 × 800. Sirve para seguir la evolución entre fases porque siempre mide lo mismo, pero un rectángulo abarca algo más que la superficie que nombra.

No se ha tocado ningún valor artístico de los materiales del GLB. Los únicos cambios de material son el grosor de la cristalería, que el archivo no trae, y ninguno se ha clonado. No se ha ajustado ninguna luz: hacerlo aquí habría tapado el error de color con un error de luz.
