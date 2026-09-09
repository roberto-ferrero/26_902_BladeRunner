# 5.4 · Resolución y actualización del reflector

09/09/2026. El reflector mantiene una única pasada compartida, sin rebotes recursivos, y ahora reutiliza el resultado cuando la cámara y la escena permanecen quietas. No se limita a actualizar cada N fotogramas: durante el movimiento actualiza inmediatamente para evitar reflejos atrasados.

## Controles

**Resolución del reflejo** permite `Según calidad`, `25 %`, `50 %` o `100 %`, por eje respecto al buffer del visor/captura. Automático usa Baja=25 %, Media=50 %, Alta=75 %. Cambiar escala redimensiona los targets existentes e invalida sus imágenes. El LOD añade `log2(escala/0,5)` para contener la variación de suavidad; a resolución baja el detalle perdido no se puede recuperar.

**Actualización del reflejo** permite `Al cambiar la vista o la escena` (inicio) o `Cada render`. El modo adaptativo compara identidad de cámara, matriz mundial, proyección, tamaño de buffer, escala y revisión de escena. Las acciones de cámara, iluminación, acabado, calidad y captura invalidan la caché. Cada cámara recupera su propia textura; no se reutiliza la textura de otra vista.

La escena actual es estática. Futuras animaciones, luces móviles o shaders animados deberán invalidar la caché o usar `Cada render`. No se ha implementado reproyección temporal. Los tres targets acotados del visor/captura/restauración se retienen hasta destruir el proyecto.

## Verificación

La primera iteración no reutilizaba la imagen porque Three.js modifica `NodeFrame.camera` dentro del render del reflector. Se conserva la identidad de la cámara exterior antes de llamar al render interno. La captura/diagnóstico **5.4_001** preserva esa iteración fallida; no representa el resultado final. Una prueba de regresión reproduce expresamente esa mutación.

[Diagnóstico corregido 002](../../capturas/5.4_002_2026-09-09_CAM01.json): CAM 01, Media, 893 × 372, **1 render y 871 reutilizaciones**; **277 dibujos / 603.323 triángulos contando pasadas**, frente a **358 / 763.389** al recalcular el reflector. El reflejo continúa visible. Se observaron 60 FPS en ambos casos a esta resolución; el ahorro se demuestra en las pasadas omitidas, no en una promesa de FPS.

Se compararon capturas a 25 %, 50 % y 100 %, cambio de cámara, paneo y retorno al modo automático. La captura fija continúa generando su propio reflejo a 1920 × 800 de salida. Cambiar resolución no añade geometría ni un segundo reflector.

Pruebas cubren movimiento, lente, tamaño, invalidación de escena, reelección de textura entre cámaras, modo continuo y mutación de NodeFrame. [Registro visual y diagnósticos](../../capturas/INDEX.md). Las cifras son intervalos RAF y contadores del renderer, no medidas de tiempo GPU o memoria total.
