# Fase 10 · Primera entrega · 24-09-2026

Estado: selección y presupuestos iniciales implementados; **no se declara alcanzado el objetivo de 60 FPS**. La fase continúa con mediciones sostenidas y optimización en los dispositivos de referencia.

Actualización R02: LOD automático/manual junto a FPS, medición integrada de tres pasadas de 60 s y quince pasadas exploratorias completadas. [Resultados, decisiones y pendientes](R02_PERFORMANCE.md). El contenido siguiente conserva el registro de la primera entrega.

Actualización R03: presupuestos reducidos y ajuste automático por FPS reales. [Estado y parámetros vigentes](R03_AUTO.md); las tablas de R01/R02 siguientes son históricas.

Actualización R04: propuesta activa de más resolución sin bloom/reflejo planar en Baja, Extra baja y móvil. [Valores actuales, prueba y limitaciones](R04_RESOLUCION.md); R03 puede recuperarse en el selector de presupuesto para comparación.

## Comportamiento

El arranque elige calidad por `tyrell-compute-v1`: Extra baja <25 millones, Baja desde 25, Media desde 60, Alta desde 120 y UltraAlta desde 240 millones. Un score no válido usa Baja en escritorio o Extra baja en móvil. La GUI muestra selección, calidad aplicada y recomendada; una elección manual no se sustituye al cambiar el modo de dispositivo. Volver a Automática vuelve a calcular la recomendación.

El modo de dispositivo es independiente: Auto, Escritorio o Móvil. La detección combina indicación móvil del navegador/UA con puntero grueso y capacidad táctil. No utiliza score ni ancho de ventana. Se puede corregir manualmente. No se persiste en localStorage: el JSON define el arranque y los controles conservan sus cambios durante la sesión.

## Presupuestos provisionales

| Calidad | Ratio escritorio / móvil | Sombra escritorio / móvil | Pasos de volumen escritorio / móvil | Reflejo escritorio / móvil |
| --- | --- | --- | --- | --- |
| Extra baja | 0,5 / 0,5 | 512 / 512 | 12 / 8 | 0,125 / 0,125 |
| Baja | 0,75 / 0,6 | 1024 / 1024 | 24 / 12 | 0,25 / 0,125 |
| Media | 0,9 / 0,75 | 2048 / 1024 | 32 / 16 | 0,35 / 0,2 |
| Alta | 1 / 0,9 | 2048 / 1024 | 48 / 24 | 0,5 / 0,25 |
| UltraAlta | 1,5 / 1 | 2048 / 1024 | 64 / 32 | 0,75 / 0,35 |

Los ratios se aplican a píxeles CSS sin multiplicar por DPR nativo. Móvil limita además el render principal a 921.600 píxeles (1280 × 720 de área, conservando proporción); no es resolución dinámica por FPS ni un límite global de VRAM. Bloom usa escala 0,25 en Extra baja/Baja y 0,5 en el resto. Las opciones de referencia/A-B mantienen los presupuestos históricos en los tres niveles originales de escritorio; móvil aplica sus límites también en esos modos.

Baja/Media/Alta de escritorio conservan sus valores anteriores; no se ha supuesto que los 60 FPS comunicados por el usuario correspondiesen al antiguo preset Alta. Se mantiene geometría, efectos y densidad exterior. UltraAlta recupera como punto de partida el presupuesto de la antigua Alta de referencia. Ninguno de los nuevos valores supone una calibración de hardware.

## Correcciones y compatibilidad

- Configuración inicial automática y lectura de configuraciones previas con calidad explícita. Los controles de orientación de color incluyen los cinco niveles.
- Al sustituir una sombra se retira primero el grafo volumétrico que muestrea su textura; se reconstruye con el nuevo mapa. Evita usar una textura destruida al cambiar calidad.
- Los targets del reflejo se redimensionan antes de las pasadas anidadas tras cambiar resolución. Evita copias de textura con dimensiones anteriores.
- Diagnósticos y comparación incluyen score/método, selección, dispositivo y resolución interna/externa. Botones/selectores móviles tienen altura mínima de 44 px y márgenes para áreas seguras.

## Validación y evidencias

Pruebas automatizadas: límites exactos e inmediaciones, los tres scores aportados, valores inválidos, detección de dispositivo, presupuestos, límite de píxeles, compatibilidad de configuración, reconstrucción de atmósfera/volumen y redimensionado de reflejos. **130/130 pruebas correctas** ([registro](tests.log)). Compilación final correcta en 93 s, con tres avisos de tamaño de recursos/entrada y recomendaciones de empaquetado ([registro](build.log)).

Revisión en navegador integrado, Windows, Chrome 153 / Three.js r185 / WebGPU, adaptador NVIDIA Turing. Se han aplicado todos los niveles sin recarga, conservado la calidad manual al cambiar dispositivo y vuelto a selección automática. Se revisaron `initial`, transición a `p1`, tamaños móviles 393 × 852 y 852 × 393 y regreso al tamaño original. Los tamaños móviles son **simulación de viewport sobre GPU de escritorio**, no medición de Redmi.

`startup-desktop.json` registra score 163.840.000 con timestamps GPU y selección Alta. Otras recargas dieron valores aproximados alrededor de 87 millones y selección Media; no se comparan entre métodos ni se atribuye esa variación a potencia real distinta. `quality-switches-fixed.json`, `mobile-fixed-desktop-simulation.json` y `browser-validation.json` registran la repetición final sin errores de consola. Los archivos sin sufijo `fixed` y capturas 10.2_001–003 / 10.6_001–002 son evidencias de la primera revisión, anterior a las correcciones GPU, conservadas como historial. 10.2_004 registra la revisión corregida.

Las muestras breves de FPS observadas y los diagnósticos con `metrics: null` no satisfacen el protocolo de tres pasadas de 60 s. No existe aún una base sostenida controlada antes/después; tampoco una auditoría prolongada de memoria. No se cierra 10.1, 10.2 ni 10.6 globalmente.

## Siguiente entrega

Completar 10.1: fijar condiciones de energía/navegador/resolución, obtener tres pasadas sostenidas por vista y perfil de referencia e identificar costes de GPU/CPU con `?profile=1`. Calibrar Alta en Legion y Baja en ThinkBook antes de atribuir mejoras; medir Extra baja/móvil en Redmi real, incluida sesión térmica de 15 minutos. La resolución muy reducida en vertical necesita valoración de legibilidad. Paneo táctil, recursos móviles específicos, resolución dinámica por FPS y validación Media/UltraAlta permanecen pendientes.
