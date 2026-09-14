# 8.2 · Presupuestos de render

Se conserva Baja y se reduce el coste de Media y Alta antes de tocar geometría. La fuente efectiva de los presupuestos es `TyrellQuality.js`; el selector «Presupuesto de render» de Revisión técnica permite volver a Referencia 8.1 o aislar resolución, volumen y reflejo. No se guarda el modo entre recargas. Optimizado 8.2 es el modo inicial.

| Calidad | Ratio interno anterior → actual | Pasos volumen | Escala de reflejo automático | Sombras |
| --- | --- | --- | --- | --- |
| Baja | 0,75 → 0,75 | 24 → 24 | 0,25 → 0,25 | 1024 |
| Media | 1 → 0,9 | 40 → 32 | 0,5 → 0,35 | 2048 |
| Alta | 1,5 → 1 | 64 → 48 | 0,75 → 0,5 | 2048 |

Las sombras conservan tamaño, cámara y sesgos para preservar contactos. No cambian luces, materiales, exposición, cielo, densidad de bruma, intensidad de haces, bloom ni lens flare. El GLB y Blender activos no cambian. Se conserva la compensación de mip del reflejo para que reducir resolución no altere el desenfoque buscado. La resolución manual del reflejo sigue teniendo prioridad sobre el presupuesto automático.

A viewport 1920×1080 y encuadre 2,4:1: Baja 1440×600; Media 1728×720; Alta 1920×800. Alta deja de aplicar supersampling 1,5, pero conserva más muestras volumétricas y resolución de reflejo que Media. La definición fina puede bajar respecto a la antigua Alta; el selector permite comparar o recuperarla durante esta sesión. Los perfiles finales se revisarán en 8.6.

## Protocolo y validación

Mismo protocolo de 8.1: 60 fotogramas de calentamiento, 120 intervalos, cámara fija centrada, efectos activos, `profile=1`. Timestamps GPU asíncronos de pases, CPU de envío y RAF son métricas distintas. Una ventana por combinación no representa una distribución extensa; no medir diferencias pequeñas como ganancias garantizadas.

64/64 pruebas correctas, incluidos aislamiento de los tres presupuestos, Baja sin cambios y selección inválida.


## Resultados locales

NVIDIA Turing, viewport 1920×1080, encuadre 2,4:1, CAM01. Misma sesión y todos los efectos activos. Registro completo en [measurements.json](measurements.json).

| Calidad / presupuesto | FPS | RAF medio ms | RAF P95 ms | CPU envío ms | GPU pases ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Media / baseline | 38 | 26.32 | 49 | 9.74 | 23.28 |
| Media / resolution | 45.1 | 22.15 | 34.7 | 9.40 | 19.44 |
| Media / volume | 41.4 | 24.17 | 44.5 | 9.55 | 21.24 |
| Media / reflection | 36.7 | 27.22 | 52.3 | 9.92 | 23.03 |
| Media / optimized | 49.4 | 20.23 | 28.3 | 10.72 | 17.78 |
| Alta / optimized | 33 | 30.28 | 59.8 | 14.78 | 25.21 |
| Alta / baseline | 14.7 | 68.14 | 118.3 | 12.75 | 59.84 |
| Baja / optimized | 59.9 | 16.7 | 24.2 | 10.46 | 12.15 |

Media gana aproximadamente 30% de FPS y reduce 24% el tiempo GPU en esta ventana. Alta pasa de 14,7 a 33 FPS, a costa de retirar supersampling y reducir los presupuestos indicados. No equivale a mantener idéntica nitidez de la antigua Alta. Baja conserva sus parámetros y alcanza 59,9 FPS.

En Media, reducir solo resolución interna aporta la mayor mejora (38 → 45,1 FPS); bajar muestras del volumen aporta 41,4 FPS. Reducir solo reflejo no muestra mejora clara: 36,7 FPS y GPU 23,03 frente a 23,28 ms. Se conserva el búfer menor por su menor área y la revisión visual, sin atribuirle una ganancia de FPS. No se ha medido VRAM. En el perfil combinado el target automático de reflejo pasa de 960×400 a aproximadamente 605×252; se mantiene la compensación de desenfoque.

Las comparaciones CAM01 y CAM02 mantienen encuadre, luz y lectura de sombras/reflejos; no se observan cortes o bandas nuevas en estas vistas. Hay una leve pérdida de definición en bordes finos propia de bajar resolución. Polvo y reflejos están animados: las capturas son de instantes diferentes y no constituyen una comparación exacta por píxel. La aprobación artística definitiva queda para revisión del usuario y 8.6. No se ha hecho un barrido exhaustivo de todas las posiciones del recorrido libre.

Sin errores de consola en la sesión. Build de producción correcto, con los tres avisos de tamaño existentes. El visor final vuelve a CAM01, Baja, GUI oculta y sin instrumentación GPU.

## Capturas archivadas

- [8.2_001_2026-09-13_CAM01-Media-referencia.jpg](../../capturas/8.2_001_2026-09-13_CAM01-Media-referencia.jpg)
- [8.2_002_2026-09-13_CAM01-Media-optimizada.jpg](../../capturas/8.2_002_2026-09-13_CAM01-Media-optimizada.jpg)
- [8.2_003_2026-09-13_CAM02-Media-optimizada.jpg](../../capturas/8.2_003_2026-09-13_CAM02-Media-optimizada.jpg)
- [8.2_004_2026-09-13_CAM02-Media-referencia.jpg](../../capturas/8.2_004_2026-09-13_CAM02-Media-referencia.jpg)
- [8.2_005_2026-09-13_CAM01-Alta-optimizada.jpg](../../capturas/8.2_005_2026-09-13_CAM01-Alta-optimizada.jpg)
