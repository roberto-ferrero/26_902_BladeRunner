# Fase 10 · R03 · Selección orientada a 60 FPS

El caso comunicado de **132.000.000 puntos a unos 30 FPS** confirma que seleccionar el antiguo presupuesto Alta por score no era suficiente. Se conserva el mapa de scores acordado, pero se reducen los presupuestos y se añade realimentación del rendimiento durante la ejecución. Un score determina la calidad inicial; el LOD automático efectivo puede bajar si no alcanza el objetivo.

## Presupuestos actuales

| Perfil inicial | Score | Ratio CSS | Sombras | Volumen | Suelo | Bloom |
| --- | --- | --- | --- | --- | --- | --- |
| Extra baja | 0 < score <25 M | 0,4 | 512 | 8 | 0,125 | 0,25 |
| Baja | 25–<60 M | 0,5 | 512 | 12 | 0,125 | 0,25 |
| Media | 60–<120 M | 0,625 | 1024 | 16 | 0,2 | 0,25 |
| Alta | 120–<240 M | 0,75 | 1024 | 24 | 0,25 | 0,25 |
| UltraAlta | ≥240 M | 1 | 2048 | 48 | 0,5 | 0,5 |

Alta toma el presupuesto de arranque anterior, medido en R02 entre 57,7 y 58,6 FPS en `initial`, frente a unos 33 FPS de la anterior Alta. Baja y Media reducen trabajo con respecto a Alta; sus presupuestos siguen pendientes de calibración en las GPU de sus tramos. UltraAlta conserva la anterior Alta optimizada, ya no el presupuesto más caro de referencia.

En móvil se mantiene el límite de 921.600 píxeles, sin multiplicar por DPR nativo. Se aplican además los límites móviles existentes: UltraAlta usa sombras 1024, volumen 32 y suelo 0,35. Los demás nuevos presets ya están dentro de sus límites móviles. La reducción automática se aplica después del límite de píxeles. Geometría, composición, luces y animaciones se conservan; se reduce nitidez y precisión de efectos. Los presupuestos históricos siguen disponibles en Referencia 8.1; los modos A/B aíslan resolución, volumen o suelo y no activan adaptación.

## Ajuste automático

- Activo con **Calidad Automática + Presupuesto Actual**. La elección manual permanece fija.
- Tras 4 s de estabilización, mide ventanas de al menos 4 s y 30 fotogramas. Dos ventanas consecutivas por debajo de 55 FPS reducen coste; una ventana por debajo de 40 FPS permite actuar antes si la mediana también supera 25 ms. Así, una pausa aislada de varios segundos no activa la vía rápida.
- Primero reduce la resolución un 10–20 % por cambio, hasta el 75 % de la resolución del perfil. Si sigue lento, baja un LOD y preserva o reduce el número de píxeles. El mínimo absoluto corresponde a Extra baja al 75 %: ratio CSS 0,3 antes de cualquier límite móvil.
- Cada cambio descarta otros 4 s para evitar reaccionar a compilaciones o redimensionados. No eleva calidad automáticamente al ver 60 FPS: el límite de refresco no demuestra margen de GPU. Volver a elegir Automática, cambiar dispositivo o presupuesto reinicia la selección por score.
- Ocultar la pestaña, carga, errores GPU, transiciones y cámara de desarrollo suspenden el muestreo. Medidas breves, tres pasadas, comparación de color y capturas lo congelan; se conserva la calidad alcanzada. Las animaciones normales y navegación libre sí cuentan.
- En el mínimo, si sigue por debajo del objetivo, registra `atMinimum` y los FPS reales; no continúa degradando indefinidamente ni declara 60 FPS conseguidos.

El indicador muestra **LOD auto efectivo**, calidad inicial si ha descendido y porcentaje de resolución si se ha reducido. En manual distingue LOD por score y LOD manual. Diagnóstico/exportación incluyen `automaticQuality`: calidad inicial/efectiva, escala, última ventana y hasta veinte decisiones con sus motivos y FPS. El ajuste se conserva durante la sesión, no se escribe en JSON ni localStorage.

## Verificación

**143/143 pruebas correctas** ([registro](r03-tests.log)). Compilación final correcta en 47,6 s con tres avisos de tamaño/empaquetado ([registro](r03-build.log)). Casos: 132 M / 30 FPS, ventanas lentas consecutivas, un bache breve y una compilación de 5 s, calentamiento entre ajustes, pausa/reanudación, selección manual y A/B, congelación de medidas, suelo mínimo, ausencia de subidas/oscilación y no aumentar píxeles al descender LOD. La integración ejercita los métodos reales de actualización/resolución con dobles de renderer, además de conservar el presupuesto histórico para comparación.

### Alta a viewport 1920 × 1080

Tres pasadas de 60 s, calentamiento de 5 s por pasada, cámara `initial` centrada, escena 1920 × 800, resolución interna 1440 × 600. Alta manual para aislar el presupuesto que recibe un score de 132 M antes de adaptación. Todas las animaciones y efectos configurados activos, VK cerrado, luz tyrell-light-v2 y exposición 1,07. GUI abierta, `?profile=1`; sin tests ni compilación simultáneos. Las pasadas preceden al refuerzo del filtro de pausas aisladas, que no interviene en manual ni en mediciones.

| Pasada | FPS | Media ms | P95 ms |
| --- | --- | --- | --- |
| 1 | 59,23 | 16,88 | 24,2 |
| 2 | 58,69 | 17,04 | 24,6 |
| 3 | 58,91 | 16,97 | 24,4 |

Navegador integrado Chrome 153, Windows, WebGPU / NVIDIA Turing, modelo y alimentación no confirmados. Score real de esta carga: 87.148.936, `gpu-timestamp`, 12 muestras, fiable según el benchmark; la selección automática fue Media. No se ha inyectado un score de 132 M. Su clasificación Alta y adaptación a 30 FPS se verifican en pruebas automatizadas; el presupuesto Alta se prueba aquí de forma explícita. La diferencia de score entre recargas refuerza la necesidad de observar FPS reales; no se presenta esta sesión como comparación controlada de hardware con R02.

Los resultados cumplen la aproximación de media a 60 FPS en esta vista, pero **no el criterio completo p95 ≤20 ms**. No se extrapolan al ThinkBook o Redmi. La validación térmica móvil sigue pendiente; el objetivo continúa siendo aproximadamente 60 FPS por nivel efectivo.

### Adaptación final bajo carga y otras vistas

Prueba funcional a viewport 3840 × 2160, escena 3840 × 1600, misma GPU NVIDIA Turing. Score de esta recarga: **163.840.000**, que selecciona Alta. Sin modificar el score ni inyectar FPS, el historial registró:

1. Alta al 100 %, 22,12 FPS → resolución 80 %.
2. Alta al 80 %, 31,97 FPS → resolución 75 %.
3. Alta al 75 %, 35,97 FPS → Media al 90 %.
4. Media al 90 %, 37,79 FPS → resolución 75 %.
5. Media al 75 %, 52,36 FPS → Baja al 93,75 %.

La siguiente ventana dio **55,83 FPS**, Baja, resolución interna 1800 × 750; el indicador breve mostró 55,7 FPS. Son ventanas del controlador de al menos 4 s, **no tres pasadas sostenidas**. La secuencia final no usa una pausa aislada como señal de lentitud: la mediana respalda cada cambio rápido. La prueba anterior detectó una pausa de compilación y motivó el filtro y su test de regresión. En manual, Alta se mantuvo fija bajo la misma resolución elevada pese a observar unos 20 FPS.

Después se restauró viewport 1920 × 1080 y Automática. El mismo score seleccionó Alta sin reducciones en las comprobaciones breves de 120 fotogramas: `p1`, VK desplegado, **59,8 FPS / p95 20,3 ms**; `p2`, **59,7 FPS / p95 27,9 ms**. Las transiciones terminaron sin errores WebGPU. Estas ventanas no sustituyen las tres pasadas por vista pendientes.

[Pasadas y muestras](r03-measurements.json), [historial de adaptación final](r03-adaptation.json), [revisión de navegador sin errores de consola](r03-browser.json). Capturas 10.3_003 y 10.4_001–002 en el [índice](../capturas/INDEX.md). Al finalizar, cámara `initial`, selección automática, GUI oculta y tamaño de viewport restaurado.
