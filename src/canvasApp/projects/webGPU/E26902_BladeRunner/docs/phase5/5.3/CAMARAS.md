# 5.3 · Continuidad de columnas y mobiliario reflejados

09/09/2026. Revisadas las diez cámaras exportadas y una vista con paneo en CAM 01. Se conserva el acabado de piedra 5.2, iluminación R01, normales activas y Media. Las capturas 001–010 corresponden a la compilación 5.2; 011 comprueba paneo con la actualización adaptativa ya corregida.

| Cámaras | Resultado de la revisión |
| --- | --- |
| CAM 01 y CAM 04 | Reflejos de columnas y mobiliario continuos con la perspectiva y los apoyos; no se aprecia un salto al alternar vistas |
| CAM 02, CAM 03 y Camera_E | Encuadres centrados en mesa/columnas, con poca superficie de suelo visible; útiles para verificar que no se aplica el reflector a la mesa |
| Camera_B, Camera_C, Camera_D y Camera_F | Muestran vistas inversas/laterales menos terminadas del decorado: fondo negro o cielo limitado por el panel existente y aristas luminosas de geometría. No se atribuyen al reflector ni se declaran acabadas artísticamente |
| Camera_free | Pose fija heredada de Blender; refleja el suelo desde una vista elevada, sin habilitar todavía navegación libre |

No se modifican las poses, la arquitectura ni las juntas. Los fondos de las vistas inversas requieren revisión al preparar el recorrido libre; este punto valida la continuidad del reflector en las vistas existentes, no el acabado de todo el decorado desde cualquier posición.

La prueba automatizada ejercita la matemática de cámara del ReflectorNode instalado para las diez cámaras reales: posición Y reflejada, X/Z conservadas y material restaurado tras la pasada. Es una comprobación geométrica sin GPU, complementada con la revisión visual. Las cámaras de visor/referencia/captura conservan identidades estables.

En la comprobación de paneo, el diagnóstico registra un desplazamiento local de aproximadamente **+0,176 / −0,100 m** y renders nuevos del reflector con la vista movida. La captura 011 es del visor en vivo, no del diálogo fijo 1920 × 800; el diagnóstico se tomó inmediatamente después al abrir el panel.

[Capturas y estados](../../capturas/INDEX.md), [diagnóstico de paneo](../../capturas/5.3_011_2026-09-09_CAM01.json). Continúan las limitaciones del reflejo planar y la integración artística 5.2; no se declara fidelidad cinematográfica final.
