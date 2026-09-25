# R05 · Score GPU y comprobación única en p1

2026-09-25. Petición: mejorar la disponibilidad del score y comprobarlo una segunda vez al terminar de llegar a p1 con el visor desplegado, sin comprobaciones ni reajustes continuos. Se interpreta «cpu score» como el GPU Score existente que selecciona el LOD.

## Medición

Los parámetros se centralizan en `config.js`, bloque `TYRELL.gpuCapacity`: `timeoutMs: 10000`, `warmupRuns: 3`, `sampleRuns: 12` y `settleMs: 1000`. Los consumen tanto el benchmark inicial como la comprobación única de p1. Este traslado al config se realiza sin ejecutar pruebas, por petición del usuario; la validación registrada abajo corresponde a la entrega anterior.

El límite anterior de 1,5 s incluía preparación y calentamiento: podía agotarse antes de recoger muestras útiles. Se elimina ese corte y se conserva un watchdog total de 10 s. Cada método realiza tres pasadas de calentamiento y doce muestras. `tyrell-compute-v1`, sus unidades y los umbrales de calidad permanecen iguales.

Se prefieren timestamps GPU. Si no están disponibles, fallan o no producen tiempos positivos, se prueba el mismo cálculo mediante tiempo de envío/completado de cola. Esta alternativa se muestra como aproximada. Antes se vacía la cola para excluir trabajo previo. Si vence el watchdog se conservan las muestras válidas completadas, con su fiabilidad real; si no hay ninguna, el score sigue siendo `null`. Los recursos se liberan cuando terminan las lecturas pendientes, evitando destruir buffers en uso. No se inventa un score cuando el dispositivo no puede medirse.

## Dos oportunidades por carga de página

1. Medición inicial, antes de cargar el escenario, para elegir el primer LOD automático.
2. Una comprobación cuando p1 está seleccionado, ha terminado el travelling y el Voight-Kampff está completamente abierto durante un segundo. Espera si hay navegación libre, controles de desarrollo, pestaña oculta, captura o medición técnica en curso.

Durante la segunda comprobación se mantiene el último fotograma y se pausa el trabajo del escenario para no competir con el benchmark. Al terminar se reinician las estadísticas FPS. Si el usuario abandona la vista durante la medición, se descarta el resultado; el intento ya está consumido y no se repite.

El segundo resultado sustituye al inicial si es válido y de confianza igual o superior: timestamps fiables, timestamps parciales/inestables, y finalmente tiempo de cola. Un fallo o una medición de menor confianza conserva el score anterior. La selección manual de calidad siempre se respeta.

**Después no se mide ni se adapta por FPS.** Volver a p1, reabrir el visor o cambiar entre Automática y manual no reinicia la comprobación. Recargar la página inicia un ciclo nuevo. Esto sustituye el comportamiento continuo R03; su controlador y pruebas se conservan como código histórico sin uso en el escenario. El objetivo de ~60 FPS sigue dependiendo de calibrar los presupuestos por hardware; dos scores sintéticos no garantizan esa tasa.

El diagnóstico y las comparaciones exportan `capacityChecks`: estado, número de segundos intentos (máximo uno), resultado inicial, segundo resultado y procedencia del efectivo. `automaticQuality.enabled` y `qualitySelection.dynamicResolution` son `false`.

## Validación

Pruebas de calentamiento lento, timestamps vacíos/fallidos, alternativa de cola, timeout con muestras parciales, limpieza diferida, cancelación, estabilidad de p1, un único intento, conservación del resultado anterior y respeto de calidad manual. Suite completa: 159 pruebas correctas. Compilación correcta, con tres avisos de tamaño de recursos/entrada y empaquetado. No constituye calibración de los equipos de referencia.

Revisión en navegador integrado, WebGPU/NVIDIA Turing, viewport 1492 × 1432. Arranque: 124.121.212, doce muestras por timestamps, fiable. Segunda comprobación con p1 sin transición y visor abierto: 151.703.704, doce muestras, variabilidad 25,93 %, no fiable; se conserva el primer score y Alta. Después de salir y volver a p1, replegar y desplegar, el diagnóstico mantiene `secondAttempts: 1`, `state: complete` y el mismo score. Sin errores de consola. El arranque coincidió con compilación; esta prueba es funcional, no una comparación de rendimiento. [Diagnósticos](r05-browser.json), [compilación](r05-build.log) y captura 10.1_001 en el [índice](../capturas/INDEX.md).
