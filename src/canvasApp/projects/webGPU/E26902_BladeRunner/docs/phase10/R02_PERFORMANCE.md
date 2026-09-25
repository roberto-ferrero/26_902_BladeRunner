# Fase 10 · R02 · LOD visible y medidas sostenidas · 24-09-2026

La fila de FPS muestra ahora `LOD auto: <nivel>`, incluso con la GUI oculta. Al elegir manualmente otro perfil añade `LOD manual: <nivel>` para distinguir recomendación y calidad aplicada. Los umbrales y los presupuestos de R01 se mantienen: esta exploración todavía no valida 60 FPS ni permite calibrar todos los dispositivos.

## Herramientas de medida

En **Revisión técnica → Comparar efectos y coste → Medir 3 × 60 s**, cada pasada descarta 5 s de calentamiento y registra todos los intervalos RAF durante al menos 60 s. FPS, media, p95, máximo y número de muestras pertenecen a la pasada completa; los fotogramas lentos no se recortan. Cambiar ajustes, cámara, tamaño o visibilidad cancela el tramo pendiente; las pasadas completas permanecen exportables. Se conserva también la medida breve de 120 fotogramas.

La exportación identifica duración, calentamiento y número de pasada. CPU de envío, GPU de pases, dibujos y triángulos conservan las ventanas cortas/instantáneas del diagnóstico: no son estadísticas de los 60 s. Los tiempos GPU no incluyen presentación. `?profile=1` habilita esa instrumentación. La GUI permite comparar la sonda de metal/vidrio sin límite de cadencia, a 4 Hz o a 2 Hz. El valor inicial sigue sin límite; la reducción ya existente en detalle `p1` continúa funcionando. El límite agrupa invalidaciones pendientes, no fuerza capturas si nada cambió.

## Condiciones y límites

Navegador integrado, Windows, Chrome 153, Three.js r185 y WebGPU. Adaptador expuesto: NVIDIA Turing; modelo exacto y energía no confirmados, por lo que no se atribuye esta sesión formalmente al Legion/GTX 1650. Score de la sesión: **128.000.000**, `tyrell-compute-v1`, `gpu-timestamp`, fiable según su comprobación interna. Todas las pasadas pertenecen a la misma carga de página.

Vista fija `initial`, paneo centrado, marco 2,4:1, luz `tyrell-light-v2`, exposición 1,07, Voight-Kampff cerrado y efectos/animaciones exteriores activos. Viewport 1920 × 1080 salvo C/D; DPR nativo 1. GUI abierta durante las medidas. No se ejecutaron compilaciones ni tests simultáneos; carga externa, alimentación, temperatura y frecuencia de pantalla no controladas. Las animaciones avanzan entre casos y no se sincronizaron al mismo instante. Estos resultados sirven para priorizar costes, no para certificar hardware ni todas las vistas.

## Resultados: tres pasadas por caso

| Caso / filas de exportación | Píxeles internos | FPS por pasada | P95 ms por pasada |
| --- | --- | --- | --- |
| A · Alta actual / 1–3 | 1920 × 800 | 33,66 / 33,21 / 33,28 | 47,3 / 48,3 / 48,2 |
| B · A con sonda a 4 Hz / 4–6 | 1920 × 800 | 34,63 / 34,22 / 34,74 | 51,1 / 50,8 / 51,0 |
| C · Alta, viewport 1440 × 1080 / 7–9 | 1440 × 600 | 53,13 / 51,88 / 51,91 | 30,8 / 32,0 / 32,3 |
| D · C con sonda a 2 Hz / 10–12 | 1440 × 600 | 54,92 / 55,13 / 54,83 | 30,8 / 30,3 / 30,9 |
| E · Presupuesto Baja anterior / 13–15 | 1440 × 600 | 57,66 / 58,14 / 58,64 | 28,3 / 27,5 / 27,1 |

A–D usan sombras 2048, volumen 48, suelo 0,5 y bloom 0,5. C/D reducen píxeles **cambiando viewport**, conservan ratio 1 y relación de aspecto; falta reproducir ese resultado con un ratio de preset a viewport fijo. E vuelve a viewport 1920 × 1080, ratio 0,75, sombras 1024, volumen 24, suelo 0,25 y bloom 0,25; sonda sin límite. Es el presupuesto del perfil de arranque anterior a la fase 10, no una prueba de Baja en la Radeon 660M. E cambia varios presupuestos: no permite atribuir el beneficio a un efecto concreto.

## Decisiones

- La cantidad de píxeles merece prioridad en la calibración de Alta. Limitar la sonda a 4 Hz apenas mejora la media y empeora p95; no se adopta como ajuste global.
- El presupuesto de arranque anterior es un candidato razonable para reconstruir la referencia de Alta solicitada. Su resultado cercano a 58 FPS no prueba que fuese exactamente la configuración usada por el usuario al observar 60 FPS.
- Ningún caso cumple simultáneamente media ≥55 FPS y p95 ≤20 ms. No se cambia la tabla de presets basándose solo en la media, ni se declara cerrado 10.3.
- Siguiente trabajo: aislar costes/picos restantes en viewport fijo, repetir `p1`, `p2` y transiciones, y calibrar en los equipos reales. ThinkBook y Redmi siguen sin medir; tampoco quedan validados Media, UltraAlta o Extra baja por probarlos en esta GPU.

[Datos completos de las 15 pasadas](r02-measurements.json), [diagnóstico y revisión de consola](r02-browser.json) y capturas 10.3_001–002 del [índice](../capturas/INDEX.md). Las dos capturas comparan A y E, con instantes de animación distintos. Los FPS de una captura son una ventana breve, no sustituyen la tabla.

Validación: **134/134 pruebas correctas**, compilación final correcta en 44,9 s con tres avisos de tamaño/empaquetado; registros [tests](r02-tests.log) y [build](r02-build.log). La prueba automatizada cubre calentamiento, tres pasadas, inclusión de bloqueos largos, cancelación por pestaña oculta y exportación en dispositivos muy lentos. La revisión interactiva comprueba LOD automático/manual y cancelación por cambio de ajustes. Se corrigió el solapamiento del botón Abrir GUI con métricas de varias líneas mediante un contenedor vertical; verificación a 393 × 852 con modo móvil manual, sin atribuir sus FPS al Redmi. [Revisión final sin errores de consola](r02-ui-validation.json), capturas 10.2_005 y 10.6_003. Al finalizar se restauraron viewport y selección automática.
