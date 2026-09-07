# E26902 Blade Runner · Plan de trabajo

Estado (08/09/2026): **fases 1, 2 y 3 completadas; de la fase 4 van los cuatro primeros puntos**. Próximo paso: **el quinto punto de la fase 4, iluminación indirecta**. Instrucciones en [README.md](README.md). Evidencia y límites en [fase 1](docs/phase1/VALIDACION.md), [fase 2](docs/phase2/VALIDACION.md), [fase 3](docs/phase3/VALIDACION.md) y [fase 4](docs/phase4/VALIDACION.md). Objetivo artístico de luz y atmósfera en [REFERENCIAS.md](docs/REFERENCIAS.md).

## Objetivo

Reproducir en Three.js y WebGPU la oficina Tyrell del archivo `BladeRunner_5_6_High_v3.blend`, conservando su modelado, texturas, distribución y atmósfera. El primer objetivo visual es igualar el plano general de Blender; después comprobar el detalle de la mesa y una vista lateral. Las referencias de la película sirven para valorar el carácter de la escena.

Trabajar por entregas pequeñas, en el orden de esta lista. Cada entrega actualizará sus casillas, recogerá lo comprobado y dejará indicado el siguiente paso. Completar el plan requiere revisar el resultado en navegador: una compilación correcta no demuestra fidelidad visual ni rendimiento.

## Fuentes y puntos de integración

- Entrada del proyecto: `E26902_BladeRunner`, en esta carpeta. Es un archivo JavaScript sin extensión; `src/Platform.js` ya lo importa e instancia.
- Motor instalado: Three.js **0.182.0**. Usar las APIs de esta versión como referencia; cualquier actualización deberá tener una razón concreta.
- Ciclo del andamiaje: `onRendererReady` → `project.init(app)` → carga → `onProjectLoaded` → `project.build()` → `update_RAF()`.
- El código específico de Tyrell permanecerá en esta carpeta; los cambios en `core` serán pequeños y necesarios para integrarlo.
- Recursos originales, fuera del repositorio: `../../_Blender/BladeRunner_5_6_High_v3.blend` y `.glb`, respecto a la raíz del repositorio.
- Renders de referencia: `../../_Blender/v3_renders/v3_general.png` y `v3_detalle.png`, ambos a 1920 × 800.
- Fotogramas de la película en `movie_screenshots/`, aportados por el usuario el 07/09/2026 como objetivo de atmósfera e iluminación. Su lectura y reparto por fases está en [docs/REFERENCIAS.md](docs/REFERENCIAS.md). Los renders mandan en la forma; los fotogramas mandan en el acabado.
- Datos de exportación: `../../_Blender/v3_assets/validation.json` y `export_report.json`.
- Destino previsto para los recursos de ejecución: `static/glbs/E26902_BladeRunner/`, con referencias de revisión en una carpeta separada.
- El módulo anterior `../../_Blender/tyrell-threejs.mjs` se hizo para WebGLRenderer. Sirve como referencia de parámetros, pero necesita adaptación para WebGPU.

## Decisiones de producto

- [x] Navegación confirmada por el usuario: **recorrido libre y cámaras de la película**.
- [x] Dispositivos prioritarios confirmados por el usuario: **ordenadores con GPU dedicada**.
- [ ] Concretar GPU/navegador/resolución de referencia y objetivo de fluidez al comenzar la medición. No prometer un número de FPS sin medirlo.

Priorizar la fidelidad visual en esos equipos. Las cámaras fijas proporcionarán la referencia de comparación antes de incorporar el recorrido libre. El objetivo de fluidez se fijará a partir de mediciones del dispositivo de referencia.

## 0 · Revisión inicial

- [x] Localizar la entrada y comprobar que está seleccionada en `Platform.js`.
- [x] Revisar el ciclo de carga, cámaras, render y eventos del andamiaje.
- [x] Confirmar Three.js 0.182.0 y la disponibilidad local de nodos para reflexión, volumen y posprocesado.
- [x] Revisar las métricas del recurso: 378.164 triángulos contando repeticiones, 25 imágenes embebidas y GLB de 56,5 MB sin compresión geométrica.
- [x] Identificar diferencias iniciales: cámara ortográfica, encuadre que escala contenido, calidad forzada a `Low` y cambio automático a WebGL en el núcleo.
- [x] Compilación inicial con `npm run build`: completada el 07/09/2026, Webpack 5.97.1, 46,2 s. Dos advertencias de tamaño de recursos y entrada; sin errores de compilación. Registro local: `tyrell-build-baseline.log` en la raíz, ignorado por Git.
- [x] Verificar el arranque en navegador y registrar el backend efectivo: WebGPU, Chrome 152/Windows, adaptador NVIDIA Turing. Diagnósticos en `docs/phase1/`.

El `context.md` de la raíz describe un ejemplo anterior y no coincide completamente con el código actual. La planificación se basa en los archivos de ejecución revisados.

## 1 · Base WebGPU y carga de la escena

- [x] Introducir configuración propia de Tyrell: recursos, cámara inicial, exposición y parámetros de calidad.
- [x] Asegurar inicialización asíncrona y comprobar el backend efectivo; mostrar error si WebGPU no está disponible.
- [x] Omitir el benchmark de arranque en Tyrell y separar sus fallos de la inicialización del motor en el núcleo.
- [x] Sustituir la calidad fija por selección manual Baja/Media/Alta; geometría íntegra en todos los perfiles.
- [x] Incorporar el GLB completo, con progreso, cancelación y errores de carga; conservar cámaras y metadatos.
- [x] Respetar metros y conversión de ejes del GLB, sin escalar el mundo mediante `OrtoResponsiveFrame`.
- [x] Encajar una cámara de perspectiva en `stageCamera.get_camera()`, conservando pose y FOV de Blender.
- [x] Incorporar limpieza de recursos compartidos y eventos al ciclo de vida de la aplicación.
- [x] Probar el visor de producción, cambios de calidad/cámara, captura y redimensionado; corregir la imagen negra al redimensionar sombras WebGPU.
- [x] Registrar pruebas, compilación, procedencia del GLB, métricas y limitaciones visuales en `docs/phase1/`.

**Resultado:** escena completa visible en WebGPU, errores de carga cubiertos por pruebas y recarga/redimensionado comprobados. Sin efectos atmosféricos añadidos todavía. El cierre técnico no valida aún la fidelidad visual con la película ni el rendimiento final.

## 2 · Cámaras y fidelidad del modelo

- [x] Recuperar la cámara general y la de detalle del GLB sin perder su posición, orientación ni campo de visión (infraestructura adelantada en fase 1).
- [x] Añadir un modo de comparación de 1920 × 800 y encuadre 2,4:1, independiente del tamaño de la ventana. Comprobado en dos ventanas distintas: mismo búfer y mismo peso de imagen.
- [x] Exponer CAM 04 como tercera vista lateral estable; su comparación visual detallada sigue pendiente.
- [x] Comprobar las 18 columnas y sus juntas, las orientaciones invertidas, las cuatro sillas, las celosías y el edificio exterior con paralaje. Auditoría reproducible en `tools/auditar-modelo.mjs`.
- [x] Revisar caras ausentes, normales, tangentes, escalas, transparencias y colisiones visuales del mobiliario.
- [x] Guardar una captura base y métricas de render desde las cámaras de comparación, tomadas en Chrome real sobre WebGPU.

**Resultado:** composición, siluetas y encuadre coinciden con Blender en CAM 01, CAM 02 y CAM 04. Las diferencias restantes son de luz y material y quedan repartidas entre las fases 3 a 6. Evidencia y hallazgos en [docs/phase2/VALIDACION.md](docs/phase2/VALIDACION.md).

Abierto al cerrar la fase, para resolver donde corresponda:

- La auditoría no encuentra ninguna columna que sea el reflejo vertical de otra, sino tres perfiles distintos. Contradice al modelo documentado y al nombre de CAM 03. Confirmar mirando CAM 03 contra Blender antes de la fase 4.
- La consola flota 40 mm sobre el podio.
- Los 27 materiales son de doble cara; decidir el descarte de caras traseras en la fase 4.
- La cristalería con transmisión sale lechosa y opaca; resolver en la fase 3.

## 3 · Materiales y respuesta al color

- [x] Validar los mapas de color, normales y rugosidad; separar correctamente texturas de color y de datos. Ninguna imagen alimenta a la vez una ranura de color y una de datos, y las 37 texturas piden mipmaps.
- [x] Establecer gestión de color, AgX y exposición de referencia antes de calibrar las luces. Medido contra una rampa del propio Blender; el aspecto «AgX - Medium High Contrast» que faltaba está reproducido con residuo 0,0091.
- [x] Ajustar piedra, cuero, nogal, bronce, suelo y cristalería con el GLB como punto de partida. Los materiales del archivo resultan correctos; el único ajuste necesario es el grosor de la cristalería.
- [x] Comprobar que el suelo conserva juntas y desgaste y que la normal no produce un aspecto de agua. Albedo de luminancia lineal 0,0022, desgaste en el mapa de rugosidad entre 0,11 y 0,45, normal de ±0,03 escalada a 0,035.
- [x] Usar materiales estándar cuando sean suficientes y materiales de nodos donde lo exija un efecto concreto. 171 mallas con material estándar y sólo las 4 piezas de cristal con material físico.
- [x] Conservar los recursos compartidos entre sillas y evitar clonar materiales innecesariamente. 175 mallas con 27 materiales, 157 geometrías y 25 texturas, exactamente los recursos del archivo.
- [x] Resolver la cristalería. El material llega bien pero el GLB no trae `KHR_materials_volume`, así que el grosor llegaba a 0 y no había refracción. Ahora se calcula de la propia geometría.
- [x] Bajar el cuero de la mesa y cerrar las negras de la sala. El aspecto de color las cierra; lo que queda por encima es luz provisional.

**Resultado:** la curva de tono coincide con la de Blender dentro de 0,0091 y los materiales del GLB quedan verificados uno a uno. El error del fotograma frente a Blender baja de 0,1254 a 0,1133 en CAM 02. Evidencia en [docs/phase3/VALIDACION.md](docs/phase3/VALIDACION.md).

Lo que esta fase deja medido para la fase 4:

- El suelo brilla porque los cuatro rellenos provisionales se reflejan en piedra pulida: apagándolos cae 109 veces, de 0,429 a 0,0040 de luminancia lineal.
- Sin iluminación indirecta las sombras se pasan de cerradas: la columna izquierda queda 2,15 EV por debajo de Blender y el lateral del suelo 3,03 EV.
- Las zonas que reciben los rellenos quedan por encima: friso +1,16 EV, suelo centro +0,90 EV, cuero +1,65 EV.
- El beneficio del grosor de la cristalería no se demuestra todavía y hay que volver a medirlo con la luz definitiva.

## 4 · Iluminación y sombras

- [x] Igualar dirección del sol, disco solar, cielo y contraste interior/exterior. La dirección del GLB reproduce la del maestro con 0,000° de desvío y el disco emisivo cae a 0,07° de la luz. La pirámide del fondo pasa de 1,76 a 1,02 veces la luminancia de Blender.
- [x] Calibrar intensidades en Three.js; no trasladar sin comprobar los valores fotométricos exportados. **El GLB resultó inservible como fuente**: declara 683 lux, que son 1,0 W/m², donde el maestro tiene 2,25, y blanco donde el maestro tiene ámbar. Todo sale ahora del `.blend`, con la conversión de cada magnitud escrita junto al dato.
- [x] Reconstruir los rellenos de área con la inicialización apropiada para WebGPU. Las cuatro luces del maestro no viajan en el GLB; se reconstruyen con su potencia real de 170, 60, 70 y 80 W, convertida a radiancia, y con colores lineales.
- [x] Ajustar sombras solares, sesgos, resolución y cobertura de la sala sin desperdiciar resolución en todo el exterior lejano. El frustum se ajusta al interior en el espacio del sol: 26,89 × 10,37 m frente a 36 × 24, y 83,1 a 113,3 m de profundidad frente a 0,1 a 150. Los sesgos se expresan en texels.
- [ ] Comparar soluciones de iluminación indirecta: entorno/sondas y, si hace falta, luz estática horneada desde Blender. Incorporar horneado sólo si mejora la comparación y su coste está justificado. **Es lo que falta ahora:** sin rebotes, las zonas en sombra quedan hasta 3,8 EV por debajo de Blender.
- [ ] Medir y corregir fugas de luz, contactos del mobiliario y pérdida de detalle en sombras.
- [ ] Devolver el friso superior a la penumbra que tiene en el render y en los fotogramas; hoy sale plenamente iluminado.
- [ ] Decidir el descarte de caras traseras: los 27 materiales del GLB son de doble cara, lo que encarece el relleno y obliga a más sesgo de sombra.

**Resultado comprobable:** contraluz y lectura de volúmenes cercanos al render de referencia, con atmósfera y bloom desactivados.

Al cerrar los cuatro primeros puntos, el error del fotograma frente a Blender baja de 0,1100 a 0,0943 en CAM 01 y de 0,1133 a 0,0948 en CAM 02. Evidencia en [docs/phase4/VALIDACION.md](docs/phase4/VALIDACION.md).

Medido y pendiente para los puntos que quedan:

- Las zonas en sombra salen hasta 3,8 EV por debajo de Blender por falta de rebotes.
- El pavimento queda 0,69 EV y el friso 1,07 EV por encima. La causa está comprobada: en Blender los cuatro rellenos proyectan sombra y una `RectAreaLight` de Three.js no puede hacerlo, así que su luz llega al suelo sin que las columnas la corten. No es un problema de calibración; los factores de contribución del maestro están todos a 1.

## 5 · Reflejos del pavimento y materiales pulidos

- [ ] Probar un reflector planar compartido por el pavimento mediante nodos compatibles con WebGPU.
- [ ] Integrarlo con rugosidad, Fresnel, normales y juntas del material, evitando un espejo uniforme.
- [ ] Comprobar las columnas y el mobiliario reflejados, también al cambiar de cámara.
- [ ] Controlar resolución y frecuencia de actualización del reflejo; evitar recursión y pasadas innecesarias.
- [ ] Mantener un entorno de reflexión coherente para bronces y cristalería.

**Resultado comprobable:** los reflejos largos del suelo refuerzan la composición y mantienen estabilidad al mover la cámara, con coste registrado.

## 6 · Atmósfera y acabado cinematográfico

- [ ] Separar la profundidad atmosférica del exterior de la bruma dentro de la sala.
- [ ] Implementar y medir haces de luz y polvo mediante nodos/volumen compatibles con la versión instalada; una niebla uniforme no sustituye estos haces.
- [ ] Comprobar oclusión por las columnas, estabilidad temporal, bandas y ruido del volumen.
- [ ] Añadir bloom contenido y ajuste final del color con el sistema de posprocesado WebGPU.
- [ ] Mantener controles para activar/desactivar cada efecto y comparar su aportación y coste.
- [ ] Valorar grano, viñeta o profundidad de campo sólo si aportan fidelidad a las referencias y no ocultan defectos del modelo o la luz.
- [ ] Sustituir el disco solar recortado por un núcleo difuso con halo. El GLB trae un disco emisivo de 14 m a 650 m que hoy se recorta con borde duro; en los tres fotogramas de la película el sol no tiene borde.
- [ ] Añadir perspectiva aérea al exterior: en los fotogramas lo lejano se aclara y pierde contraste, y hoy las pirámides se recortan contra el cielo.

**Resultado comprobable:** comparación lado a lado del plano general, el detalle y la vista lateral contra las capturas base de la fase 2, los renders de Blender y los fotogramas de la película.

## 7 · Navegación y presentación

- [ ] Aplicar la elección del usuario: cámaras fijas, recorridos o movimiento libre.
- [ ] Añadir transiciones y restauración del encuadre de referencia.
- [ ] Si hay recorrido libre, mantener altura y velocidad coherentes con la escala e impedir atravesar paredes y muebles con colisiones simplificadas.
- [ ] Resolver redimensionado, foco del teclado/ratón, pausa al ocultar la pestaña y dispositivos objetivo.
- [ ] Separar los controles de revisión técnica de la experiencia final.

**Resultado comprobable:** navegación cómoda y estable sin perder acceso a las cámaras de comparación.

## 8 · Optimización y entrega

La medición comienza en la fase 1; esta fase reúne los ajustes finales cuando ya se conoce el coste y la aportación visual de cada efecto.

- [ ] Medir tiempo de CPU y GPU, fluidez, memoria, carga inicial y llamadas de dibujo en el dispositivo acordado.
- [ ] Ajustar resolución interna, sombras, reflejos y muestras del volumen antes de reducir geometría que define la silueta.
- [ ] Evaluar Meshopt/Draco y KTX2/Basis con sus decodificadores y comprobar que no dañen juntas, normales, cuero o degradados del cielo.
- [ ] Revisar culling, instancias y agrupaciones sin perder control de materiales ni iluminación.
- [ ] Acotar los recursos copiados a producción: el andamiaje copia actualmente ejemplos ajenos y archivos fuente `.psd`, `.blend` y `.blend1` desde `static/`. Conservar esos originales y excluirlos de la entrega de Tyrell cuando no sean necesarios.
- [ ] Establecer perfiles de calidad medidos; comprobarlos siempre desde las mismas cámaras.
- [ ] Compilar producción y probar carga, errores, redimensionado y liberación de recursos.
- [ ] Documentar recursos, parámetros artísticos, capturas finales, dispositivos probados y diferencias conocidas frente a Blender.

**Resultado comprobable:** compilación reproducible, versión WebGPU probada en los dispositivos acordados y comparaciones visuales y de rendimiento registradas.

## Criterio de seguimiento

Al terminar cada entrega: actualizar esta lista, anotar archivos relevantes, comprobaciones realizadas, captura comparable cuando exista cambio visual y siguiente tarea. Las decisiones de implementación rutinarias se resuelven durante el trabajo; se consultan los cambios de alcance o de experiencia que lo necesiten.

Documentación técnica consultada: [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer.html), [ReflectorNode](https://threejs.org/docs/pages/ReflectorNode.html), [VolumeNodeMaterial](https://threejs.org/docs/pages/VolumeNodeMaterial.html). Los ejemplos actuales pueden diferir de Three.js 0.182.0; contrastarlos con el código instalado antes de implementar.
