# E26902 Blade Runner · Plan de trabajo

Estado (07/09/2026): **fase 1 completada**; **fase 2, inventario y perfiles del modelo comprobados**. Instrucciones en [README.md](README.md); cierre técnico en [VALIDACION.md](docs/phase1/VALIDACION.md), captura fija en [CAPTURA_REFERENCIA.md](docs/phase2/CAPTURA_REFERENCIA.md) y revisión actual en [FIDELIDAD_MODELO.md](docs/phase2/FIDELIDAD_MODELO.md).

## Objetivo

Reproducir en Three.js y WebGPU la oficina Tyrell del archivo `BladeRunner_5_6_High_v3.blend`, conservando su modelado, texturas, distribución y atmósfera. El primer objetivo visual es igualar el plano general de Blender; después comprobar el detalle de la mesa y una vista lateral. Las referencias de la película sirven para valorar el carácter de la escena.

Trabajar por entregas pequeñas, en el orden de esta lista. Cada entrega actualizará sus casillas, recogerá lo comprobado y dejará indicado el siguiente paso. Completar el plan requiere revisar el resultado en navegador: una compilación correcta no demuestra fidelidad visual ni rendimiento.

## Fuentes y puntos de integración

- Entrada del proyecto: `E26902_BladeRunner`, en esta carpeta. Es un archivo JavaScript sin extensión; `src/Platform.js` ya lo importa e instancia.
- Motor instalado: Three.js **0.182.0**. Usar las APIs de esta versión como referencia; cualquier actualización deberá tener una razón concreta.
- Ciclo del andamiaje: `onRendererReady` → `project.init(app)` → carga → `onProjectLoaded` → `project.build()` → `update_RAF()`.
- El código específico de Tyrell permanecerá en esta carpeta; los cambios en `core` serán pequeños y necesarios para integrarlo.
- Recursos originales, fuera del repositorio: `../../_Blender/BladeRunner_5_6_High_v3.blend` y `.glb`, respecto a la raíz del repositorio.
- Renders de referencia: `../../_Blender/v3_renders/v3_general.png` y `v3_detalle.png`.
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
- [x] Añadir captura de comparación de 1920 × 800 y encuadre 2,4:1, independiente del tamaño de la ventana. Conserva pose y FOV; restaura el visor y reinicia métricas.
- [x] Exponer CAM 04 como tercera vista lateral estable; su comparación visual detallada sigue pendiente.
- [x] Comprobar las 18 columnas y sus juntas, las orientaciones invertidas, las cuatro sillas, las celosías y el edificio exterior con paralaje. Perfiles contrastados con la plantilla, geometría inspeccionada y evidencia desde CAM 01–04.
- [ ] Revisar caras ausentes, normales, tangentes, escalas, transparencias y colisiones visuales del mobiliario.
- [x] Guardar capturas base 1920 × 800 y diagnósticos del visor desde CAM 01–04; resolución de medición 757 × 315, Media. Evidencia en `docs/phase2/model-audit/`.

**Resultado comprobable:** composición y siluetas comparables con Blender; la iluminación aún puede ser provisional.

**Entrega parcial actual:** 18 columnas con 24 hiladas y 23 juntas de 6 mm; inversiones 02/03/11/12 verificadas en 24 secciones por columna contra la plantilla; cuatro sillones con malla compartida; 11 grupos de celosías y exterior conservados. Capturas y mediciones de cuatro cámaras documentadas. Se pausa para revisión. Siguiente punto: caras ausentes, normales, tangentes, escalas, transparencias y colisiones visuales. Aún no se valida la iluminación ni la atmósfera final.

## 3 · Materiales y respuesta al color

- [ ] Validar los mapas de color, normales y rugosidad; separar correctamente texturas de color y de datos.
- [ ] Establecer gestión de color, AgX y exposición de referencia antes de calibrar las luces.
- [ ] Ajustar piedra, cuero, nogal, bronce, suelo y cristalería con el GLB como punto de partida.
- [ ] Comprobar que el suelo conserva juntas y desgaste y que la normal no produce un aspecto de agua.
- [ ] Usar materiales estándar cuando sean suficientes y materiales de nodos donde lo exija un efecto concreto.
- [ ] Conservar los recursos compartidos entre sillas y evitar clonar materiales innecesariamente.

**Resultado comprobable:** detalle de la mesa y piedra coherentes con Blender bajo un esquema de luz controlado.

## 4 · Iluminación y sombras

- [ ] Igualar dirección del sol, disco solar, cielo y contraste interior/exterior.
- [ ] Calibrar intensidades en Three.js; no trasladar sin comprobar los valores fotométricos exportados.
- [ ] Reconstruir los rellenos de área con la inicialización apropiada para WebGPU.
- [ ] Ajustar sombras solares, sesgos, resolución y cobertura de la sala sin desperdiciar resolución en todo el exterior lejano.
- [ ] Comparar soluciones de iluminación indirecta: entorno/sondas y, si hace falta, luz estática horneada desde Blender. Incorporar horneado sólo si mejora la comparación y su coste está justificado.
- [ ] Medir y corregir fugas de luz, contactos del mobiliario y pérdida de detalle en sombras.

**Resultado comprobable:** contraluz y lectura de volúmenes cercanos al render de referencia, con atmósfera y bloom desactivados.

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

**Resultado comprobable:** comparación lado a lado del plano general, el detalle y la vista lateral. Registrar las diferencias restantes con Blender y con los fotogramas de la película.

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
