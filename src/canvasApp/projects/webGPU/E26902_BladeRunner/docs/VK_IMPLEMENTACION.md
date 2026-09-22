# Voight-Kampff — primera integración funcional

22-09-2026. El dispositivo ya forma parte de la escena principal. El acabado artístico y la validación ampliada siguen abiertos en [el plan](VK_PLAN.md).

## Uso

Ejecutar `npm run dev:local` desde la raíz del repositorio. En la GUI, seleccionar `p1` o pulsar `1`: la máquina comienza cerrada, espera al final real del travelling y 0,3 segundos de estabilización, se despliega en 5 segundos e inicia el fuelle. La sección **Voight-Kampff** permite desplegar/replegar y desactivar la apertura automática.

El repliegue dura 4,2 segundos, amortigua la fase del fuelle y apaga la óptica. El botón se bloquea durante la maniobra. La apertura automática ocurre una sola vez por sesión; una intervención manual la consume. Volver a `p1` respeta el cierre manual. Salir de `p1` conserva el estado del dispositivo.

La opción **Reducir capturas de reflejos en p1** limita a 2 Hz la sonda cúbica mientras la cámara fija ya ha llegado. Durante los recorridos y fuera de `p1` se restaura su comportamiento habitual. La preferencia de activar/desactivar reflejos se conserva. Esta opción reduce la cadencia de capturas; las mediciones breves actuales no demuestran una mejora de FPS.

Para comparar la sala sin dispositivo, cargar `/?vk=0`. Para medir CPU/GPU, usar además `profile=1`, según el sistema de diagnóstico existente.

## Colocación y recursos

- Fuente autoritativa: `_Blender/20260914_BladeRunner_AUXILIAR.blend`, objeto `VK_Referencia`, relativa a la raíz del espacio de trabajo.
- Hash del auxiliar antes y después: `1ca1e08955f98afece856823d6184b9e1cc9227b0223fd3d6da92db0d192cd58`.
- Posición Three.js: `[-0.8259305954, 0.7515769005, -9.9775047302]`; escala exacta `[1, 1, 1]`. Rotación convertida de Blender Z-up a Three.js Y-up, en un contenedor exterior a la mecánica.
- `vkPlacement.generated.json` y `cameraStates.generated.json` proceden del mismo auxiliar. Se conservan las reglas manuales del travelling de `cameraStates.config.js`.
- Reexportación: `npm run export:vk-placement` y `npm run export:camera-states`. Ambos leen el auxiliar sin guardarlo.
- Maestro mecánico nuevo: `_Blender/VK Device/VK Device.motion.blend`. Conserva mapas 4K y la pose desplegada; el movimiento lo calcula Three.js.
- Referencia GLB 4K: `_Blender/VK Device/VK Device.motion.4k.glb`.
- Recurso web: `static/glbs/E26902_BladeRunner/VK_Device.glb`, **7.298.380 bytes**, 16 mallas, 14.891 triángulos y cuatro mapas 2048². La óptica añade en ejecución dos mallas y 34 triángulos.

El archivo `VK Device.blend` de partida y el auxiliar no se han sobrescrito. `prepare_motion.py`, junto al maestro, reproduce la copia y ambas exportaciones. `motion-manifest.json` registra la procedencia y los parámetros.

El paso de cuatro mapas 4096² a 2048² reduce la estimación de almacenamiento RGBA8 con mipmaps de aproximadamente 341 a 85 MiB. Es una estimación de esos mapas, no una medición de la VRAM total. La exportación no usa todavía KTX2. Se han comparado capturas desde `p1` a la resolución indicada más abajo; no equivale a validar un primerísimo plano en Alta.

## Mecánica y aspecto

`TyrellVKMotion` separa abatimiento, desplazamiento telescópico, nivelación del motor y giro del cabezal. La pose se calcula desde referencias fijas, sin acumular transformaciones. El ciclo del fuelle tiene un periodo de 3,8 segundos y queda detenido al cerrar.

La tapa se ha separado del faldón: las cuatro placas móviles conservan su grosor y se articulan con bisagras. El faldón y los cuatro cables utilizan una deformación entre anclajes sobre 2.223 vértices, sin simulación física.

La copia derivada rebaja 123 vértices interiores del alojamiento trasero para dar espacio al cierre; se conserva el número de triángulos y se corrigen las normales de las caras afectadas. El cierre adapta el modelo estático a los vídeos: abatimiento de 15°, recorrido de 9 cm y cabezal a 90°. Sigue siendo una interpretación mecánica del modelo disponible, no una reconstrucción dimensional exacta del aparato filmado.

La comprobación BVH en 21 posiciones no detectó intersecciones del tramo interior, motor, cabezal ni óptica con el chasis. En el pie del mástil persisten contactos con su soporte: 26 pares de triángulos ya presentes desplegado y hasta 40 cerrado. Este control no certifica todos los contactos entre cables, placas y piezas pequeñas.

Se mantienen los mapas PBR compartidos. El dispositivo se registra explícitamente en la sonda de entorno existente y se excluye de su propia captura. La óptica roja tiene material independiente, emisión HDR y un halo local con prueba de profundidad; aprovecha el bloom de la sala sin añadir otra cadena de posprocesado ni luces con sombras. El halo y la emisión están apagados al cerrar.

## Verificación y mediciones

`npm run test:tyrell`: **109 pruebas aprobadas**. `npm run build`: compilación de producción correcta, con tres avisos de tamaño de recursos/bundle. `npm run export:vk-placement` ejecutado correctamente. `git diff --check` sin errores de espacios.

Se han probado en navegador la llegada automática, el bloqueo del botón durante la maniobra, el repliegue con apagado, el regreso a `p1` tras un cierre manual y la restauración de la cadencia de la sonda al salir. Las pruebas automatizadas cubren cinco ciclos sin deriva, independencia entre 30/60 FPS, continuidad al detener el fuelle, colocación, cancelación de llegada, registro de materiales y restauración de preferencias.

Mediciones iniciales: Windows, navegador Chromium, WebGPU, adaptador NVIDIA Turing; calidad Baja optimizada, imagen efectiva **1119 × 466**, escala de píxel 0,75, sombras 1024, volumen 24 pasos y reflejo planar al 25 %. Cada fila descarta 60 fotogramas y recoge 120. CPU/GPU no se midieron en estas filas.

| Caso en p1 | FPS | Media ms | P95 ms |
|---|---:|---:|---:|
| Sala base sin VK | 59,9 | 16,70 | 22,20 |
| VK cerrado, cadencia normal | 58,8 | 17,02 | 22,20 |
| VK operativo y óptica, cadencia normal | 59,9 | 16,70 | 21,80 |
| VK operativo, sonda a 2 Hz | 59,5 | 16,81 | 22,60 |

Estas ventanas son cortas, con efectos dinámicos en distintas fases y FPS limitados por presentación. No justifican afirmar una ganancia de rendimiento ni que se haya alcanzado el presupuesto P95 de 16,7 ms. La línea base inicial también tuvo abierto el visor auxiliar; hay que repetir una campaña aislada antes de sacar conclusiones pequeñas entre filas. Los draw calls guardados son la instantánea de un fotograma, no un promedio de todas las pasadas.

Datos: [línea base](vk-review/baseline.json), [comparación 2K](vk-review/comparison-2k.json), [comprobación de navegación](vk-review/navigation-check.json). En la comparación 2K archivada, las filas 1, 2 y 3 corresponden respectivamente a cerrado, operativo y operativo con ahorro; se añadió después el estado VK al exportador para que las siguientes comparaciones lo incluyan explícitamente.

Capturas: [p1 abierto 2K](vk-review/p1-open-2k.jpg), [p1 cerrado 2K](vk-review/p1-closed-2k.jpg), [mecánica cerrada](vk-review/mechanics-closed.jpg), [intermedia](vk-review/mechanics-mid.jpg) y [abierta](vk-review/mechanics-open.jpg).

El visor mecánico independiente está en `docs/vk-review/index.html`. Servir la raíz del repositorio con `python -m http.server 8081 --bind 127.0.0.1` y abrir `/src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/vk-review/index.html`. Usa los módulos locales de Three.js y no se publica como parte de la aplicación.

## Siguiente revisión

1. Afinar color, rugosidad, contacto con la mesa, intensidad de la óptica y la fidelidad del cierre con revisión visual de detalle.
2. Revisar los extremos del paneo de `p1`, los formatos de pantalla y las calidades Media/Alta; el paneo global actual puede sacar el dispositivo del encuadre.
3. Medir GPU, primer encendido de la óptica, travelling y salida con ventanas mayores. El recurso se carga antes de mostrar la escena, pero la primera variante visible de la óptica aún necesita una medición específica de precalentamiento.
4. Auditar la contribución del suelo durante todo el paneo antes de omitir su reflexión. En esta entrega no se han congelado el suelo, el tráfico, las llamaradas ni el volumen: siguen aportando a la imagen o a los reflejos.
5. Validar más ciclos de navegación y recursos en una sesión larga. Durante una recarga de desarrollo se registró un error de WebGPU por un lienzo de tamaño cero; no volvió a aparecer en las recargas y maniobras de la versión final revisada.

No se ha publicado ni desplegado remotamente.
