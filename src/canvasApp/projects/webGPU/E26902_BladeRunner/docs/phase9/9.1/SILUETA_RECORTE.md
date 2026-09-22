# Revisión de silueta y recorte — 2026-09-21

## Control HSL — 2026-09-22

GUI: Exterior — Fase 9 → Matiz, Saturación y Luminosidad de edificios de relleno. La referencia central es HSL `31,4 / 38,9 / 18,8`. Se actualizan uniformes compartidos por los materiales y sus copias de ventanas, sin reconstruir geometría ni recompilar materiales. La emisión de ventanas queda fuera del ajuste.

- El giro horizontal (yaw, alrededor del eje Y) interpola suavemente la luminosidad entre la dirección hacia la pirámide (18,8), Camera_D (14) y CAM 02 (14,6). El cabeceo no interviene. Se toma como cero fijo la dirección horizontal desde la posición original de CAM 01 al centro de la pirámide. Camera_D queda a +62,2235° y CAM 02 a −21,5779° respecto de esa referencia. La interpolación es continua también al cruzar ±180°.
- A esa base se restan 0,3 puntos porcentuales de L por edificio a la derecha y 1,3 a la izquierda. Ambas pendientes son configurables. Se cuenta por módulos de cada fila (27, 30 o 40 m), tomando el centro de cada edificio; sus piezas comparten el mismo color. L se limita al intervalo 0–100. Las dos chimeneas izquierdas reciben después +2 puntos de L para reducir su oscuridad, sin modificar la chimenea derecha. Esta regla sustituye las antiguas rampas de colores y el límite de cuatro bloques.
- El GUI permite ajustar H/S/L base, las dos referencias de luminosidad, ambas pendientes y el modo angular (siempre, desactivado o según LOD). Los niveles Baja/Media/Alta tienen interruptores independientes, inicialmente activos. Desactivar el ajuste angular mantiene la base y las rampas espaciales.
- La conversión HSL se hace por vértice; el giro solo actualiza un uniforme de luminosidad. Se mantiene el atributo vec2 de rampas, sin superar los ocho buffers de vértices permitidos por defecto en WebGPU.
- Salida local tras niebla con variación direccional del 7% y aporte acotado de iluminación del 8%, antes de AgX y del etalonado global. Los hexadecimales son referencias de material, no una garantía de píxel idéntico con cualquier exposición.
- Emisión de ventanas conservada por separado al clonar los materiales de ciudad.
- Cuerpo de cada edificio de relleno limitado a 18 m bajo el arranque de las terrazas (unos 22–24 m hasta la cubierta). Se recorta por debajo, manteniendo azoteas, distribución y semilla. No se recorta la arquitectura original del GLB ni las torres de fuego.
- Eliminados cinco nervios menores por edificio: 485 cajas y 5.820 triángulos menos. Acortar una caja por sí solo no reduce sus polígonos.
- Pruebas generales: 93 aprobadas, incluyendo referencias angulares reales, independencia del cabeceo, cambio por LOD, pendientes y límite de atributos WebGPU.
- Revisión visual en navegador WebGPU: CAM01 y Camera_E, calidad Baja. Pendiente comparar el corte desde el encuadre libre exacto del croquis; estas cámaras comprueban la lectura desde la sala.

## Rendimiento del color angular — 2026-09-22

Medición local WebGPU con `?profile=1`. Botón «Medir coste del color angular». Orden ABBA: desactivado, activo, activo, desactivado; 45 fotogramas de calentamiento y 120 registrados por etapa (240 por modo). Cámara y animaciones congeladas, barrido angular sintético y reflejo actualizado en ambos modos para representar el trabajo de una cámara que gira. Misma geometría, shader y rampas espaciales. El informe completo queda en los diagnósticos; el GUI muestra las medias.

| Encuadre / calidad | Resolución | CPU color OFF → ON | GPU OFF → ON | Fotograma OFF → ON |
| --- | --- | --- | --- | --- |
| CAM 02 / Baja | 1119 × 466 | 0,00375 → 0,02583 ms | 7,22952 → 7,16410 ms | 16,69917 → 16,70667 ms |
| Camera_D / Alta | 1492 × 622 | 0,00500 → 0,02042 ms | 15,24390 → 15,21113 ms | 18,35042 → 18,47125 ms |

Muestras GPU: 204/206 en Baja y 58/58 en Alta (lectura asíncrona). Incremento CPU del cálculo: 0,02208 ms y 0,01542 ms por fotograma. Las diferencias GPU son pequeñas y no demuestran una mejora ni una penalización; el tiempo de fotograma también incluye variación del navegador y límite de sincronización vertical. GPU registra los pases de render, no cómputo ni presentación. Es una comparación local del ajuste angular, no un benchmark de la escena anterior ni de todo el shader HSL. Por su coste observado se mantiene activo en todos los LOD, dejando la política configurable.
