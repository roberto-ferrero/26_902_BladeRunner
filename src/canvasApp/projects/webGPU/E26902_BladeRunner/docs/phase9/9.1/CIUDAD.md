# 9.1 · Continuidad urbana

## Corrección de techos claros y torres · 21/09/2026

El usuario rechaza la revisión 017–019: los techos siguen demasiado claros y las torres necesitan oscurecerse mucho más. Se reduce el color de las caras superiores a 0,16 y se aplica un factor adicional de color 0,16 a todas las piezas de las tres torres. Intensidades especular y de entorno a cero; rugosidad 1. Se conservan las fachadas de la ciudad, alturas, posiciones y detalle geométrico.

La bruma y los haces aclaran incluso las superficies con poco albedo. Para conseguir la intención artística sin cambiar el ambiente general, los tres materiales pasan a `MeshPhysicalNodeMaterial` y reciben una corrección local después del sombreado atmosférico, antes del acabado cinematográfico: factor 0,50 en cubiertas y 0,28 en torres. El atributo `tyrellCityTone` delimita estas superficies en las mismas tres mallas y conserva factor 1 en el resto. Es una corrección artística de tono, no una modificación física de la densidad de bruma. Incluye cornisas, plataformas, equipos y el revestimiento local de cubierta. La clase de material conserva el nodo al clonarse para las ventanas de 9.2. La pirámide, los inclinados y la iluminación global conservan sus ajustes.

Validación: tres pruebas de ciudad/luces aprobadas; compilación correcta en 38,9 s con los tres avisos habituales de tamaño. Camera_free, CAM02 y CAM01 revisadas en WebGPU, sin errores de consola; techos con menor contraste luminoso y torres oscuras contra el cielo. Se mantienen 23.574 triángulos y tres mallas. Capturas 020–022, registros `tests-city-r05.log` y `build-city-r05.log`, diagnóstico `diagnostico-city-r05.json`. Propuesta pendiente de valoración artística; se conservan las capturas rechazadas.

## Revisión de cubiertas mates y menor protagonismo · 21/09/2026

El usuario solicita oscurecer algo más la ciudad de 9.1 y reducir mucho la luz reflejada por sus techos para destacar la pirámide y los edificios inclinados. `CITY_FINISH` reduce el multiplicador del color base de 0,68 a 0,50. Las caras orientadas hacia arriba llevan además un factor 0,42 en su color de vértice; incluye cubiertas, cornisas, equipos, plataformas de torres y los dos niveles del revestimiento local. Los laterales conservan el tono general más oscuro y los matices originales.

Los tres materiales pasan a un acabado físico mate: rugosidad 1, metalicidad 0 e intensidad especular 0,06. Así se reduce tanto la respuesta difusa clara de las cubiertas como los brillos especulares; la rugosidad anterior de 0,94 ya era elevada. La intensidad de entorno queda limitada a 0,12 si se asigna un mapa de entorno. Se conservan luces de ventanas, atmósfera y exposición, junto con materiales de la pirámide y edificios inclinados. Esta revisión cambia exclusivamente el acabado de 9.1: geometría, alturas, tres mallas y 23.574 triángulos permanecen iguales.

Validación: las tres pruebas de ciudad/luces pasan; compilación correcta en 51,1 s con los tres avisos habituales de tamaño. Revisado en WebGPU desde Camera_free, CAM02 y CAM01, sin errores de consola. Diagnóstico `diagnostico-city-r04.json`, registros `tests-city-r04.log` y `build-city-r04.log`. Capturas 017–019 archivadas conservando las anteriores; pendiente de valoración artística.

## Revisión de tono y continuidad local · 21/09/2026

Petición del usuario: oscurecer algo los edificios de 9.1 y las torres de futuras llamaradas, y resolver la zona lisa expuesta al bajar las cubiertas. [Referencia marcada](referencia-continuidad-usuario.png). Se aplica un multiplicador de 0,68 al color lineal de los tres materiales de ciudad, conservando matices, texturas, rugosidad e intensidades de las luces existentes.

La zona marcada es una cubierta del GLB al pie derecho de la pirámide, con dos niveles y un lateral entre ellos. `TyrellCityRoof.js` selecciona sus triángulos originales por plano y recorta el revestimiento a la zona local; lo separa solo 2,5 cm para evitar solapamiento de profundidad. Reutiliza la textura y material de terrazas, con UV métricas orientadas según cubierta o lateral. El lateral se reviste por ambas caras, ya que desde Camera_free se ve su cara posterior. Tres remates de servicio de 0,65–0,90 m más cornisa/equipo de cubierta interrumpen la superficie lisa. Sus bases penetran ligeramente en la cubierta para evitar huecos bajo la pendiente. El resto de edificios y torres conserva exactamente sus posiciones y alturas, incluido el descenso anterior de 2,5 m.

El parche aporta 18 triángulos y los remates 108; el conjunto queda en 23.574 triángulos y mantiene tres mallas, tres materiales y una textura compartida. El revestimiento y remates pertenecen al control «Edificios bajos». El GLB original no se modifica. La comprobación geométrica contra la revisión anterior confirma igualdad de todos los vértices de los edificios existentes y del GLB. Rayos desde los triángulos del revestimiento verifican que siguen superficies existentes a un máximo de 0,025001 m. Informe `city-roof-r03.json`.

Validación: tres pruebas de ciudad/luces aprobadas, con repetición de ciudad tras ampliar el revestimiento, y auditoría geométrica final de ambas caras del lateral. Compilación final correcta en 64,6 s con los tres avisos habituales de tamaño. WebGPU sin errores registrados. Capturas 012–016: antes/después en Camera_free, CAM01, lateral Camera_D y torres izquierdas en CAM02. Diagnóstico `diagnostico-city-r03.json`; pendiente de valoración artística.

## Revisión de altura y torres · 20/09/2026

Propuesta revisada a petición del usuario: los 97 edificios conservan sus bases y bajan sus cubiertas 2,5 m. Se añaden tres torres industriales con basamento escalonado, plataformas de servicio, fustes oscuros y mástiles finos, inspiradas en las referencias de ciudad y llamaradas. Una está a la derecha (360, −460), y dos más lejanas a la izquierda (−680, −700) y (−900, −830), coordenadas X/Z. Las izquierdas se desplazan respecto a las zonas preliminares para evitar la oclusión de una columna en CAM02.

Las torres anticipan únicamente la geometría de 9.5: todavía no hay llamaradas ni luces. Se conserva el acabado y la atmósfera actuales. El conjunto suma ahora **23.448 triángulos**, manteniendo tres mallas, tres materiales y una textura. El mismo control «Edificios bajos» incluye las torres.

La prueba de ciudad comprueba determinismo, recursos compartidos y 451 muestras de paneo CAM01: cada torre más una reserva lateral de 20 m y 25 m sobre la cumbre queda fuera de cuadro. No sustituye la revisión del efecto definitivo en 9.5. Compilación correcta con los tres avisos de tamaño habituales. Capturas de revisión 008–011; propuesta pendiente de valoración artística. La medición de rendimiento y las capturas 001–007 de abajo corresponden a la primera propuesta y no se han sobrescrito.

20-09-2026. Implementado y revisado en WebGPU como **propuesta visual**, pendiente de valoración artística del usuario. Se completa el exterior inferior con edificios escalonados, manteniendo el cielo, iluminación, exposición y efectos existentes. No se adelantan luces de ventanas, tráfico ni llamaradas.

## Construcción e integración

`TyrellCity.js` genera 97 edificios a partir de una semilla fija (902091), agrupados en tres mallas por material. Añade 22.392 triángulos, tres materiales y una textura compartida de 256 × 256. El GLB y sus transformaciones no cambian.

La referencia principal es la organización en terrazas y cubiertas de `_Fuentes/Edificios ciudad/Screenshot_2.jpg`, adaptada libremente a los huecos de la escena. Hay un cinturón cercano de 22 edificios en torno a Z −151/−167, 42 laterales en tres profundidades y 33 edificios de fondo hacia Z −640/−725. La distribución inicial de 9.0 era orientativa: se elevaron las cubiertas tras comprobar que las alturas negativas previstas no tapaban los cortes. Una prueba demasiado alta se redujo para recuperar la silueta de la pirámide. Ninguna de esas pruebas intermedias sustituye la propuesta archivada.

Cada edificio combina terrazas retranqueadas, cornisas, bandas de servicio oscuras, nervios verticales, casetas y equipos de cubierta. Textura procedural propia con juntas de panel y huecos sin emisión; UV a escala métrica para evitar estiramientos, filtrado mipmap y variación moderada de color entre piezas. Materiales rugosos con respuesta a la luz existente y a la atmósfera de la escena. No se añaden focos ni materiales emisivos: corresponden a 9.2.

Las mallas nuevas se integran antes de preparar materiales y atmósfera; quedan fuera del cálculo de colisiones interiores y del mapa de sombras de la sala. Participan en los reflejos. Los recursos se liberan junto al mundo mediante `disposeScene`, con una única liberación de la textura compartida. Al ocultar la ciudad desde la GUI se invalidan tanto el reflejo planar como la captura del entorno especular.

## Fondo entre edificios y cielo

Se ha valorado una textura fotográfica, pero esta entrega usa geometría distante de bajo detalle. Conserva el paralaje y la coherencia con la luz actual sin introducir perspectiva ni iluminación nocturna ya horneadas en una imagen. No se modifica el panorama de cielo. No se ha fabricado ni integrado una textura urbana experimental: la decisión se basa en las referencias, la navegación y la cobertura conseguida con geometría. Puede reevaluarse si una vista posterior exige más extensión del horizonte.

## Control y diagnóstico

En la GUI: **Exterior — Fase 9 → Edificios bajos**, activo al arrancar. Al desactivarlo se recupera la geometría exterior anterior para comparar; los recursos permanecen cargados. El diagnóstico y las filas de comparación incluyen `city` con estado y coste geométrico, y el diagnóstico indica fase 9.1.

## Revisión visual

Se conserva el look de amanecer/atardecer: `tyrell-v1`, luz `tyrell-light-v2`, exposición 1,07, calidad Baja optimizada, efectos iniciales activos. Viewport 1920 × 1080; escena 2,4:1 y resolución interna 1440 × 600. PNG de pantalla con cabecera/FPS, sin recortar ni retocar; no son exportaciones nativas 1920 × 800.

| Captura | Resultado revisado |
| --- | --- |
| [001 · CAM01](../../capturas/9.1_001_2026-09-20_CAM01.png) | Cinturón urbano bajo la pirámide; disco solar y siluetas principales conservados |
| [002 · CAM04](../../capturas/9.1_002_2026-09-20_CAM04.png) | Terrazas cubren el remate claro y dan continuidad al extremo derecho |
| [003 · CAM02](../../capturas/9.1_003_2026-09-20_CAM02.png) | El hueco de cielo bajo entre columnas queda ocupado por arquitectura; lectura de detalle de cubiertas |
| [004 · CAM03](../../capturas/9.1_004_2026-09-20_CAM03.png) | Continuidad en la zona inferior de la pendiente y edificios inclinados |
| [005 · Paneo inferior derecho](../../capturas/9.1_005_2026-09-20_CAM01-paneo.png) | Remates expuestos en 9.0 quedan cubiertos por ciudad |
| [006 · Paneo superior izquierdo](../../capturas/9.1_006_2026-09-20_CAM01-paneo.png) | Continuidad con otra oclusión de columnas, sin borde de un plano fotográfico |
| [007 · Camera_free elevada](../../capturas/9.1_007_2026-09-20_Camera-free.png) | Se sustituyen visualmente las grandes cajas expuestas por fachadas y cubiertas detalladas |

`Camera_free` es aquí el preset elevado del GLB, no una prueba de desplazamiento WASD. Las poses son reproducibles y cubren los tipos de carencia de las cinco capturas aportadas, pero no equivalen a sus coordenadas exactas, desconocidas. No se garantiza un decorado completo desde todas las posiciones exteriores ni una coincidencia literal con los edificios de la película. La repetición modular y la altura de las terrazas quedan para valoración artística. Si se rechaza la propuesta, reabrir 9.1 conservando estas capturas.

## Coste y verificaciones

65/65 pruebas del proyecto correctas. Prueba específica repetida después del ajuste final de alturas: determinismo, tres mallas, textura compartida, presupuesto menor de 40.000 triángulos, geometría fuera de la sala, originales intactos, ausencia de emisión y visibilidad reversible. Build final de producción correcto con los tres avisos de tamaño existentes, sin cambios de dependencias. Sin errores de consola en la revisión WebGPU.

[Mediciones A/B](measurements.json), misma sesión de navegador integrado Chrome 153/Windows, NVIDIA Turing, CAM01 centrada, Baja optimizada, `?profile=1`, todos los efectos iniciales activos. Build ya terminado durante las muestras. 60 fotogramas de calentamiento y 120 intervalos RAF por estado.

| Estado | FPS | RAF medio / P95 ms | CPU envío ms | GPU pases ms | Dibujos / triángulos con pasadas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ciudad activada | 31,9 | 31,30 / 61,6 | 8,95 | 26,31 | 376 / 812.149 |
| Ciudad desactivada | 32,3 | 30,94 / 60,3 | 9,21 | 25,20 | 370 / 767.365 |

La diferencia de esta ventana es +0,36 ms RAF y +1,11 ms GPU con ciudad, no un coste garantizado en todos los equipos. Los contadores incluyen pasadas del reflejo: tres mallas nuevas pueden sumar seis dibujos y 44.784 triángulos por fotograma cuando éste se actualiza. Sin esa actualización, suman tres dibujos y 22.392 triángulos. Desactivar no libera memoria: ambos estados retienen 146 geometrías y 56 texturas de renderer. No se ha medido VRAM; Media/Alta y el coste conjunto de la Fase 9 se revisarán en 9.6.

[Diagnóstico final](diagnostico.json), [registro de compilación](build.log) e [índice de capturas](../../capturas/INDEX.md). Siguiente subfase: 9.2, iluminación sutil de edificios actuales y nuevos; no iniciada en esta entrega.

Comprobación adicional de producción: carga correcta del build final en http://127.0.0.1:8082/, CAM01 con ciudad visible, WebGPU r185 y sin errores de consola. El visor queda en Baja, GUI oculta y sin instrumentación de rendimiento; viewport temporal restaurado.
