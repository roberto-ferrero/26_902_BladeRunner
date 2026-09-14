# 8.1 · Referencia de rendimiento

13-09-2026. Instrumentación opcional: abrir con `?profile=1` (o `&profile=1` junto a otros parámetros). La carga habitual no activa las consultas de GPU. Revisión técnica > Comparar efectos y coste > Medir configuración guarda los resultados; Exportar comparación produce JSON con muestras, configuración, adaptador y tiempos de carga.

## Protocolo

Viewport de referencia 1920×1080, encuadre 2,4:1, cámara fija, acabado y efectos actuales. Cada medición centra paneo, descarta 60 fotogramas y recopila 120 intervalos RAF. Se rechaza iniciar en recorrido libre o durante una transición. Los cambios de controles/foco/tamaño cancelan la medición. Las respuestas GPU tardías se descartan al cambiar configuración. No se alteran los presets de calidad en este punto.

## Qué se mide

- RAF: media, P95 y FPS de presentación. Incluye espera de pantalla y trabajo de navegador; no equivale a GPU.
- CPU render: duración síncrona de renderFrame, preparación y envío de pases; no mide todo el hilo principal ni la actualización completa del proyecto.
- GPU render: timestamps opcionales de Three r185, suma de pases de render del último fotograma resuelto. No incluye presentación ni compute. Muestras asíncronas, cuyo número puede diferir del de CPU/RAF. Si la función no está disponible, el resultado es null/—, nunca cero inventado.
- Memoria: número de geometrías/texturas de renderer.info y heap JS cuando lo expone el navegador. No mide VRAM total ni todos los recursos del sistema.
- Carga: bytes del GLB y tiempo de fetch+decode; tiempo desde navegación hasta primer render enviado. No es una marca de primera presentación confirmada. Navegaciones locales con caché no representan descargas frías por Internet.

La instrumentación tiene coste, por lo que estas medidas sirven para comparar perfiles bajo el mismo protocolo; no son un benchmark universal. Se restaura el viewport y la carga sin instrumentación al terminar.

## Validación

61/61 pruebas correctas, incluidas ventanas acotadas de muestras, ausencia de GPU, consultas tardías, descarte al cambiar configuración y errores de GPU. Los valores medidos y los límites del equipo se registran después de la sesión de navegador.

## Resultados en este equipo

WebGPU, NVIDIA Turing (modelo concreto no expuesto). Una ventana por combinación: 120 muestras CPU/RAF; GPU asíncrona con 22–74 muestras. Datos completos en [measurements.json](measurements.json). No se realizó repetición estadística extensa ni carga fría controlada.

| Cámara | Calidad | Render interno | FPS | RAF P95 ms | CPU render ms | GPU render ms | Muestras GPU | Draw calls instantáneas |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CAM_01_|_fotograma_general | Baja | 1440 x 600 | 59.9 | 22.2 | 8.67 | 9.75 | 71 | 289 |
| CAM_01_|_fotograma_general | Media | 1920 x 800 | 37.8 | 49.9 | 8.86 | 23.33 | 28 | 289 |
| CAM_01_|_fotograma_general | Alta | 2880 x 1200 | 15 | 124.7 | 9.32 | 60.09 | 22 | 370 |
| CAM_02_|_mesa_y_juntas | Baja | 1440 x 600 | 60 | 19.9 | 8.16 | 12.64 | 74 | 273 |

Carga local de esta navegación: GLB 40.552.456 bytes, fetch+decode 840,6 ms, primer render enviado a 4.442,1 ms desde navegación. Caché no vaciada ni controlada: no extrapolar a Internet. Heap JS usado entre 975 y 996 MB decimales durante estas lecturas; 143 geometrías y 55–57 texturas según renderer.info. Los recursos y llamadas varían con capturas de entorno/reflejo y su caché; las llamadas son una lectura puntual, no media de toda la ventana. Esto no demuestra una fuga de memoria ni mide VRAM.

Inferencia para 8.2: entre Baja y Alta el envío CPU permanece alrededor de 9 ms, mientras GPU crece de 9,75 a 60,09 ms. Los perfiles cambian simultáneamente resolución interna, sombras, tamaño del reflejo, bloom y pasos volumétricos; estos datos no atribuyen el coste a un efecto aislado. Conviene variar un parámetro cada vez, empezando por resolución/volumen/reflejo y comparando capturas. No se cambia aún el acabado ni se recomienda Alta para este equipo en estas condiciones.

Build correcto en 67,101 s, tres avisos de tamaño existentes. Sin errores de consola durante la sesión instrumentada.

Contraste sin profile=1 en CAM01 Baja, mismo viewport: 59.9 FPS, RAF medio 16.69 ms, P95 22.2 ms. CPU/GPU detalladas null como se esperaba; archivo control-no-profile.json. Esta única ventana limitada por presentación no demuestra coste cero de instrumentación. Viewport restablecido y visor final sin profiling, CAM01/Baja/GUI oculta.
