# Fase 10 · R04 · Más resolución sin bloom ni reflejo planar

Prueba solicitada por el usuario: dedicar el presupuesto del reflejo del suelo y el glow general a más resolución en Baja, Extra baja y modo móvil. Se desactivan el reflejo planar del pavimento y el bloom global. Se conservan halos pequeños de vehículos/balizas/Voight-Kampff, lens flare, iluminación/material del suelo, composición y animaciones. El pavimento todavía puede mostrar brillo especular de la iluminación: no se convierte en un material mate.

## Presupuestos

| Modo / perfil | Ratio CSS R03 → R04 | Píxeles adicionales antes del límite móvil |
| --- | --- | --- |
| Escritorio Extra baja | 0,4 → 0,5 | +56,25 % |
| Escritorio Baja | 0,5 → 0,6 | +44 % |
| Móvil Extra baja | 0,4 → 0,5 | +56,25 % |
| Móvil Baja | 0,5 → 0,6 | +44 % |
| Móvil Media | 0,625 → 0,75 | +44 % |
| Móvil Alta | 0,75 → 0,9 | +44 % |
| Móvil UltraAlta | 1 → 1 | Ya en el máximo configurado |

Media, Alta y UltraAlta de escritorio conservan sus presupuestos y efectos. En móvil, ambos efectos quedan desactivados en los cinco niveles. El límite móvil de 921.600 píxeles internos sigue activo, sin multiplicar por DPR nativo. Por ello una pantalla que ya llegue al límite puede no ganar resolución. Sombras, pasos volumétricos y geometría mantienen los valores R03.

El ajuste automático por FPS permanece operativo: la resolución anterior es inicial y puede bajar si la carga real no permite aproximarse a 60 FPS. La selección manual mantiene su resolución de perfil. Los tramos de GPU Score no cambian.

## Restauración y comparación

Los efectos se excluyen del render, no se ocultan bajando su intensidad. Se conserva por separado la preferencia solicitada y la activación efectiva; cambiar a un perfil permitido restaura la preferencia anterior, incluso si el usuario los había apagado manualmente. Cambiar modo de reflexión no elude la restricción. La GUI muestra ambos controles desmarcados y deshabilitados cuando corresponda, junto al texto «Sin bloom ni reflejo del suelo».

**Revisión técnica → Presupuesto de render → Anterior · fase 10 R03** recupera exactamente el presupuesto anterior de esos perfiles y permite ambos efectos. Es una comparación explícita, sin adaptación automática, no la configuración de arranque. Para A/B usar la misma cámara, viewport y elección de efectos solicitados. Los diagnósticos distinguen `qualityEffects`, `requestedEnabled/qualityAllowed` del suelo y `bloomRequested/bloomAllowed` del postprocesado. El comparador lista los efectos realmente activos.

## Validación

**147/147 pruebas correctas** ([registro](r04-tests.log)): máscaras por perfil/dispositivo, presupuesto anterior, restauración de preferencias, exclusión real del grafo de bloom, resolución móvil limitada y aplicación integrada de la política. Compilación correcta en 76,3 s con tres avisos de tamaño/empaquetado ([registro](r04-build.log)). No se declara ahorro de VRAM: los recursos creados antes pueden conservarse para permitir cambios de perfil durante la sesión.

### Comparación sostenida de Baja

Misma sesión, vista `initial` centrada, viewport 1920 × 1080, escena 1920 × 800, luz tyrell-light-v2, exposición 1,07, efectos y animaciones restantes activos, VK cerrado. Baja manual para mantener fijos ambos presupuestos. Tres pasadas por caso de 60 s con 5 s de calentamiento. Sin pruebas ni compilaciones simultáneas. Navegador integrado, Windows / Chrome 153 / WebGPU / NVIDIA Turing, score 124.121.212 por timestamps GPU. Modelo exacto, alimentación y carga externa no confirmados; no se identifica esta GPU como Radeon 660M. Animaciones no sincronizadas al mismo instante.

| Presupuesto | Interno | FPS por pasada | P95 ms por pasada | CPU render ms* | GPU pases ms* |
| --- | --- | --- | --- | --- | --- |
| R03: bloom y reflejo activos | 960 × 400 | 59,57 / 59,58 / 59,56 | 23,4 / 24,5 / 24,5 | 8,17 / 9,03 / 8,75 | 4,99 / 5,37 / 5,14 |
| R04: sin ambos, más resolución | 1152 × 480 | 59,84 / 59,64 / 57,34 | 19,8 / 20,0 / 19,9 | 6,44 / 6,33 / 6,58 | 6,31 / 6,28 / 6,51 |

*CPU y GPU son ventanas cortas del diagnóstico al finalizar cada pasada, no estadísticas completas de 60 s. CPU mide envío del render y GPU los pases, sin presentación. Las medias y p95 RAF sí incluyen toda la pasada. La tercera pasada R04 contiene **un fotograma de 2017,2 ms**, de causa no identificada, incluido en sus 57,34 FPS. No se descarta ni se atribuye sin pruebas al código, compilación o sistema.

Interpretación: se obtiene un 44 % más de píxeles con media entre 57,3 y 59,8 FPS y menor p95 en esta vista. Las muestras de CPU bajan, pero las de GPU **suben**: el ahorro de efectos no paga completamente el aumento de píxeles en GPU. En un dispositivo más limitado por GPU, subir resolución podría empeorar FPS; el controlador automático puede recortarla si lo necesita. Se mantiene como propuesta reversible, no como optimización universal ni validación final de fluidez. Las pruebas sobre esta GPU no validan Radeon 660M ni Redmi; quedan pendientes esas mediciones y la valoración visual.

### Revisión funcional

Extra baja confirma ratio 0,5 y ambos efectos realmente desactivados. Alta de escritorio restaura ambos, conservando la preferencia solicitada. Alta móvil los desactiva y respeta el límite de píxeles: en viewport 1920 × 1080 alcanza 1487 × 619 en lugar de superar el límite con ratio 0,9. La revisión móvil de 852 × 393 con Extra baja da imagen interna 426 × 177; es simulación de viewport sobre GPU de escritorio. Los controles restringidos aparecen deshabilitados y desmarcados. Sin errores de consola en la secuencia final; al terminar se restauran calidad y dispositivo automáticos, GUI oculta y viewport original.

[Seis pasadas completas](r04-measurements.json), [diagnósticos y revisión](r04-browser.json), capturas 10.3_004–005 y 10.6_004 del [índice](../capturas/INDEX.md). La captura nueva conserva el brillo físico del suelo, aunque el reflejo planar esté apagado.
