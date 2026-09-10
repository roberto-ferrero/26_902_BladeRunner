# 6.3 · Oclusión y estabilidad del volumen

Revisión del 10 de septiembre de 2026. Se conserva el acabado de 6.2: densidad 0,004 /m, radiancia solar ×0,18, intensidad 1 y muestreo 24/40/64 en Baja/Media/Alta. R01 archivado permanece intacto.

## Oclusión

El volumen consulta la profundidad del sol y termina en la superficie visible de cada píxel. La geometría de las columnas y sus núcleos interiores participan en esa sombra. Nueva prueba: **414 rayos**, uno por junta horizontal de las 18 columnas, dirigidos hacia la luz solar calibrada; todos encuentran el núcleo opaco. Esto incluye los perfiles invertidos. La prueba existente verifica además que la cámara de sombras contiene toda la sala, por tanto también la caja del volumen.

La prueba geométrica no demuestra por sí sola la ausencia de aliasing en el mapa GPU. Se complementa con las vistas del navegador. En CAM 01 y CAM 03 las columnas mantienen sus siluetas y zonas oscuras; el aclarado delante de una columna puede proceder del aire iluminado entre ella y la cámara y no implica luz atravesando piedra.

## Estabilidad y muestreo

Se preserva el muestreo determinista en el centro de cada intervalo, sin jitter por fotograma ni historial temporal. El polvo es una función suave de posición mundial y tiempo; al apagarlo se elimina esa variación de densidad para comparar.

Dos protecciones en el shader: conservar el signo de las componentes casi paralelas al recortar el rayo contra la caja, y omitir el bucle cuando no hay intervalo entre cámara, caja y superficie. La segunda evita consultas de sombra inútiles delante del volumen, también desde cámaras reflejadas.

Las capturas 001–003 comparan Media, Baja y Alta con polvo apagado, capas de profundidad y ambos reflejos activos, intensidad 1 y exposición 0 EV. No aparecen bandas fuertes en el plano general a la escala examinada. Cambiar calidad también cambia resolución de sombra y reflejo: esas imágenes no aíslan exclusivamente el número de muestras. No se añaden ruido ni desenfoque para ocultar errores.

## Evidencia final

Capturas en el [registro cronológico](../../capturas/INDEX.md): 001–003 calidad; 004 perfiles invertidos; 005 paneo sin polvo; 006–008 repetibilidad; 009 detalle de mesa; 010 lateral; 011 paneo con polvo y diagnóstico; **012 entrega CAM 01**.

En el rectángulo de escena x 46–846, y 294–626 del diálogo, **001 = 006 = 007 = 008 píxel a píxel**: la corrección conserva la base 6.2, se repite sin deriva y vuelve al mismo resultado tras apagar/encender los haces. Entre 006 y 007 transcurren unos segundos y se genera una nueva captura, no se reutiliza el diálogo. [Resultados numéricos](pixel-comparison.json). Las diferencias medias RGB entre Media y Baja son inferiores a 0,66/255; entre Media y Alta inferiores a 0,28/255. No son una medida aislada del error volumétrico porque varían también sombra y reflejo.

Revisión visual en CAM 01–04, incluido paneo asentado con/sin polvo. No se observan fugas fuertes a través de columnas ni ruido de pantalla en estas vistas. Las instantáneas y la repetibilidad estática no constituyen una medición exhaustiva de cada fotograma de la transición.

**36/36 pruebas correctas**, incluida la nueva prueba de 414 juntas. Compilación de producción correcta con Webpack 5.97.1 en **53,779 s**, tres advertencias existentes de tamaño. Los arranques de CLI se quedaron detenidos; se utilizó la API de Webpack con la misma configuración `bundler/webpack.prod.js`. Shader validado en el navegador WebGPU.

Diagnóstico 011: CAM 01 Media, 893 × 372, polvo y reflejos activos: **59,9 FPS**, media RAF 16,68 ms, P95 20,2 ms, 120 muestras. 142 geometrías, 51 texturas. El fotograma registrado reutiliza el reflejo: 277 dibujos, 603.323 triángulos/pasadas; no representa el coste de los fotogramas que recalculan el reflector. No es tiempo GPU ni una garantía para 1920 × 800. No se añaden recursos gráficos ni pasadas.

## Límites

- La comparación de profundidad tiene resolución finita. Pueden aparecer pequeños escalones en bordes de sombra, especialmente en Baja; no se certifica ausencia de aliasing a cualquier resolución o recorrido.
- La integración usa profundidad opaca, sin transmisión parcial o coloreada de cristal dentro del aire.
- La caja es artística y mantiene sus límites laterales y longitudinales; no es una simulación de múltiples rebotes.
- El reflejo planar del polvo se actualiza a 10 Hz; la cámara invalida su caché al moverse. La sonda de metal y vidrio no sigue cada cambio del polvo.
- Las capturas son pantallazos del visor con el render de referencia reducido; no sustituyen una inspección de vídeo a resolución completa.

El siguiente punto es **6.4 · Bloom contenido y ajuste final del color**. La revisión de 6.3 no cierra la fase 6 ni declara aprobado un nuevo acabado.
