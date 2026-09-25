# E26902 Blade Runner · Plan de trabajo

**Fase 10 iniciada (24-09-2026):** cinco niveles y selección automática por score implementados, con elección manual y modo Auto/Escritorio/Móvil. Presupuestos nuevos provisionales, resolución móvil acotada y compatibilidad con configuración anterior. Pruebas y revisión WebGPU de cambios de calidad; calibración sostenida y pruebas en ThinkBook/Redmi pendientes. [Entrega inicial, parámetros y evidencias](docs/phase10/INICIO.md).

Actualización de navegación (24-09-2026): la navegación vigente usa `cameraStates` exportados de `_Blender/20260914_BladeRunner_AUXILIAR.blend`. Cada par `cameraspot-[id]` / `cameratarget-[id]` se incorpora al selector con `npm run export:camera-states`; las teclas numéricas se asignan por ID en `static/config/E26902_BladeRunner/gui.initial.json`. El paneo pertenece a cada estado y se interpola durante el travelling. `V` despliega o repliega el Voight-Kampff. Las fases 7.1–7.3 y 7.6 describen implementaciones históricas sustituidas; no son tareas pendientes ni requisitos de la navegación actual. [Flujo y límites](docs/CAMERA_STATES.md).

Ampliación iniciada (22-09-2026): [integración del dispositivo Voight-Kampff](docs/VK_PLAN.md). Primera versión funcional con colocación desde el auxiliar, despliegue manual/automático al llegar a `p1`, fuelle, cables, óptica roja y cadencia reducida de la sonda en p1. [Implementación, capturas y mediciones](docs/VK_IMPLEMENTACION.md). Acabado artístico y validación ampliada de rendimiento pendientes.

Ajustes de arranque actualizados el 10-09-2026: GUI inicialmente oculta, cabecera y FPS siempre visibles; calidad Baja; bloom, color cinematográfico, profundidad exterior, bruma interior, haces y ambos reflejos activos. Paneo `default` actual: horizontal 2 m, vertical 0,5 m, suavidad 1,4 s; `p1` sobrescribe los recorridos con 0,5 m y 0,2 m. FPS visibles incluso con GUI oculta. Esta preferencia sustituye las notas históricas de arranque sin efectos; 6.5 queda documentado más abajo.

Estado actual (21-09-2026): **9.1–9.5 implementados como propuestas visuales.** Ciudad baja oscura y mate, luces estructuradas y carriles integrados. A petición del usuario, se retira completamente la aproximación al hangar de 9.3; permanecen los tres corredores y ocho vehículos de base. **9.4 r04:** se incorpora un anillo óptico periférico y una traza diagonal sutil sobre la base de r03. Un solo vehículo al 25 % de escala repite la misma pasada horizontal; velocidad al 25 % de r02 (40 s por vuelta), inclinación máxima de 20°, carrocería oscura legible, foco central cálido, halo reducido con anillo de lente y destello diagonal tenue. GUI de duración entre 20 y 60 s. Ocho pruebas correctas, auditoría geométrica, compilación y revisión visual WebGPU. Pendiente de valoración artística. Detalles en [9.1](docs/phase9/9.1/CIUDAD.md), [9.2](docs/phase9/9.2/ILUMINACION.md), [9.3](docs/phase9/9.3/TRAFICO.md) y [9.4](docs/phase9/9.4/TRAFICO-CERCANO.md). **9.5 r02:** llamaradas 3,5× en las tres torres laterales, una activa a la vez y nueva cadencia base de 4,5 s. GUI de activación, intervalo 2–60 s, tamaño 1–5× e intensidad. La torre derecha se desplaza 40 m hacia el exterior y las envolventes a 3,5× y 5× quedan fuera de CAM01 con paneo auditado. Revisión visual, compilación y doce pruebas correctas. [Detalle y capturas](docs/phase9/9.5/LLAMARADAS.md), pendiente de valoración artística. **Siguiente: 9.6, integración y validación final.** [Preparación 9.0](docs/phase9/9.0/PREPARACION.md) conservada. 8.3–8.8 siguen pendientes; se revisará el coste global antes de la entrega final.

**Última revisión 9.5 r03:** base más estrecha y expansión en altura, aproximadamente el doble de altura visible. Nuevo GUI «Crecimiento vertical» 1–3×, inicial 2×. Auditoría de CAM01 con tamaño y crecimiento máximos sin intersecciones; cuatro pruebas de llamaradas y compilación correctas. Pendiente de valoración artística.

## Objetivo

Reproducir en Three.js y WebGPU la oficina Tyrell del archivo `BladeRunner_5_6_High_v3.blend`, conservando su modelado, texturas, distribución y atmósfera. El primer objetivo visual es igualar el plano general de Blender; después comprobar el detalle de la mesa y una vista lateral. Las referencias de la película sirven para valorar el carácter de la escena.

Trabajar por entregas pequeñas, en el orden de esta lista. Cada entrega actualizará sus casillas, recogerá lo comprobado y dejará indicado el siguiente paso. Completar el plan requiere revisar el resultado en navegador: una compilación correcta no demuestra fidelidad visual ni rendimiento.

## Fuentes y puntos de integración

- Entrada del proyecto: `E26902_BladeRunner`, en esta carpeta. Es un archivo JavaScript sin extensión; `src/Platform.js` ya lo importa e instancia.
- Motor de las primeras fases: Three.js **0.182.0**; en la revisión 3.4 se detecta **0.185.1** instalada, sin modificar dependencias en esa entrega. Usar las APIs de esta versión como referencia; cualquier actualización deberá tener una razón concreta.
- Ciclo del andamiaje: `onRendererReady` → `project.init(app)` → carga → `onProjectLoaded` → `project.build()` → `update_RAF()`.
- El código específico de Tyrell permanecerá en esta carpeta; los cambios en `core` serán pequeños y necesarios para integrarlo.
- Recursos originales, fuera del repositorio: `../../_Blender/BladeRunner_5_6_High_v3.blend` y `.glb`, respecto a la raíz del repositorio.
- Renders de referencia: `../../_Blender/v3_renders/v3_general.png` y `v3_detalle.png`.
- Referencias de acabado e iluminación añadidas por el usuario en fase 3.1: `docs/reference images/Screenshot_1.jpg`, `Screenshot_2.jpg`, `Screenshot_3.jpg`. Aplicar [sus criterios visuales](<docs/reference images/README.md>) en las siguientes entregas de materiales, luz, reflejos y atmósfera.
- Datos de exportación: `../../_Blender/v3_assets/validation.json` y `export_report.json`.
- Destino previsto para los recursos de ejecución: `static/glbs/E26902_BladeRunner/`, con referencias de revisión en una carpeta separada.
- El módulo anterior `../../_Blender/tyrell-threejs.mjs` se hizo para WebGLRenderer. Sirve como referencia de parámetros, pero necesita adaptación para WebGPU.

## Decisiones de producto

- [x] Decisión inicial: recorrido libre y cámaras de la película. **Sustituida en la navegación vigente** por selección de `cameraStates` desde GUI o tecla numérica; otras formas de navegación podrán añadirse después.
- [x] Dispositivos de referencia ampliados el 24-09-2026: GTX 1650 dedicada para **Alta**, Radeon 660M integrada para **Baja** y Redmi Note 14 Pro para **Extra baja en modo móvil**; especificaciones y scores en fase 10.
- [x] Objetivo de fluidez definido: **aproximadamente 60 FPS por nivel en su hardware de referencia**, sujeto a validación de fase 10.
- [ ] Fijar navegador, resolución de salida y condiciones de medición en 10.1. No prometer un número de FPS sin medirlo.

Priorizar la fidelidad visual dentro del presupuesto de rendimiento de cada equipo. Los `cameraStates` proporcionan las vistas de comparación actuales; el recorrido libre histórico no forma parte de la navegación ofrecida. La fase 10 calibra los cinco niveles con mediciones reales.

## 0 · Revisión inicial

- [x] **0.1** Localizar la entrada y comprobar que está seleccionada en `Platform.js`.
- [x] **0.2** Revisar el ciclo de carga, cámaras, render y eventos del andamiaje.
- [x] **0.3** Confirmar Three.js 0.182.0 y la disponibilidad local de nodos para reflexión, volumen y posprocesado.
- [x] **0.4** Revisar las métricas del recurso: 378.164 triángulos contando repeticiones, 25 imágenes embebidas y GLB de 56,5 MB sin compresión geométrica.
- [x] **0.5** Identificar diferencias iniciales: cámara ortográfica, encuadre que escala contenido, calidad forzada a `Low` y cambio automático a WebGL en el núcleo.
- [x] **0.6** Compilación inicial con `npm run build`: completada el 07/09/2026, Webpack 5.97.1, 46,2 s. Dos advertencias de tamaño de recursos y entrada; sin errores de compilación. Registro local: `tyrell-build-baseline.log` en la raíz, ignorado por Git.
- [x] **0.7** Verificar el arranque en navegador y registrar el backend efectivo: WebGPU, Chrome 152/Windows, adaptador NVIDIA Turing. Diagnósticos en `docs/phase1/`.

El `context.md` de la raíz describe un ejemplo anterior y no coincide completamente con el código actual. La planificación se basa en los archivos de ejecución revisados.

## 1 · Base WebGPU y carga de la escena

- [x] **1.1** Introducir configuración propia de Tyrell: recursos, cámara inicial, exposición y parámetros de calidad.
- [x] **1.2** Asegurar inicialización asíncrona y comprobar el backend efectivo; mostrar error si WebGPU no está disponible.
- [x] **1.3** Omitir el benchmark de arranque en Tyrell y separar sus fallos de la inicialización del motor en el núcleo.
- [x] **1.4** Sustituir la calidad fija por selección manual Baja/Media/Alta; geometría íntegra en todos los perfiles.
- [x] **1.5** Incorporar el GLB completo, con progreso, cancelación y errores de carga; conservar cámaras y metadatos.
- [x] **1.6** Respetar metros y conversión de ejes del GLB, sin escalar el mundo mediante `OrtoResponsiveFrame`.
- [x] **1.7** Encajar una cámara de perspectiva en `stageCamera.get_camera()`, conservando pose y FOV de Blender.
- [x] **1.8** Incorporar limpieza de recursos compartidos y eventos al ciclo de vida de la aplicación.
- [x] **1.9** Probar el visor de producción, cambios de calidad/cámara, captura y redimensionado; corregir la imagen negra al redimensionar sombras WebGPU.
- [x] **1.10** Registrar pruebas, compilación, procedencia del GLB, métricas y limitaciones visuales en `docs/phase1/`.

**Resultado:** escena completa visible en WebGPU, errores de carga cubiertos por pruebas y recarga/redimensionado comprobados. Sin efectos atmosféricos añadidos todavía. El cierre técnico no valida aún la fidelidad visual con la película ni el rendimiento final.

## 2 · Cámaras y fidelidad del modelo

- [x] **2.1** Recuperar la cámara general y la de detalle del GLB sin perder su posición, orientación ni campo de visión (infraestructura adelantada en fase 1).
- [x] **2.2** Añadir captura de comparación de 1920 × 800 y encuadre 2,4:1, independiente del tamaño de la ventana. Conserva pose y FOV; restaura el visor y reinicia métricas.
- [x] **2.3** Exponer CAM 04 como tercera vista lateral estable y revisar su geometría junto a CAM 01–03 con material neutro y en WebGPU.
- [x] **2.4** Comprobar las 18 columnas y sus juntas, las orientaciones invertidas, las cuatro sillas, las celosías y el edificio exterior con paralaje. Perfiles contrastados con la plantilla, geometría inspeccionada y evidencia desde CAM 01–04.
- [x] **2.5** Revisar caras ausentes, normales, tangentes, escalas, transparencias y colisiones visuales del mobiliario. Copia de ejecución con limpieza de índices, atributos y recursos originales conservados; evidencia y límites en `docs/phase2/CIERRE.md`.
- [x] **2.6** Guardar capturas base 1920 × 800 y diagnósticos del visor desde CAM 01–04; resolución de medición 757 × 315, Media. Evidencia en `docs/phase2/model-audit/`.

**Resultado comprobable:** composición y siluetas comparables con Blender; la iluminación aún puede ser provisional.

**Cierre de fase 2:** 18 columnas con 24 hiladas y 23 juntas de 6 mm; inversiones 02/03/11/12 verificadas contra la plantilla; cuatro sillones con malla compartida; 11 grupos de celosías y exterior conservados. Limpieza de 5.396 caras degeneradas únicas y corrección de orientación de 10.813 caras sin mover vértices: 339.381 triángulos contando instancias. Cámaras, capturas, superficies y contactos revisados. Se pausa para revisión antes de fase 3. La equivalencia de materiales con Blender y la atmósfera cinematográfica se validarán en las fases correspondientes.

## 3 · Materiales y respuesta al color

- [x] **3.1** Validar los mapas de color, normales y rugosidad; separar correctamente texturas de color y de datos. 25 imágenes auditadas, 20 materiales contrastados con Blender y conexiones comprobadas con GLTFLoader y WebGPU. No se encontraron errores de espacio de color; informe y límites en `docs/phase3/3.1/`.
- [x] **3.2** Establecer gestión de color, AgX y exposición de referencia antes de calibrar las luces. Linear-sRGB → AgX → sRGB, base 1,07 y compensación ±2 EV; controles de comparación y luz de estudio. Validación técnica; la equivalencia con fotogramas sigue pendiente.
- [x] **3.3** Tyrell v1 conservado como base tras comparar importado/Tyrell en CAM 01/02/04 con luz de estudio y escena. UV colapsadas localizadas y proyectadas: hasta 4,042 píxeles cuadrados en CAM 02; se conservan con revisión de proximidad pendiente en recorrido libre. [Evidencias y límites](docs/phase3/3.3-review/CIERRE.md).
- [x] **3.4** Suelo auditado: juntas y desgaste conservados, sin UV colapsadas; comparación WebGPU con normal activada/desactivada. Normal 0,025 mantenida. El brillo amplio persiste sin normal y queda para luces/reflejos; evidencia y límites en [SUELO.md](docs/phase3/3.4/SUELO.md).
- [x] **3.5** Conservar 19 MeshStandardMaterial y un MeshPhysicalMaterial; adaptación WebGPU y propiedades comprobadas en los 20 materiales. Nodos propios previstos para reflector y volumen en sus fases. [Estrategia y límites](docs/phase3/3.5/MATERIALES_NODOS.md).
- [x] **3.6** Cuatro sillas comparten seis geometrías, seis materiales y doce texturas. Diez ciclos de acabado conservan identidades y transformaciones; liberación única comprobada. 19/19 pruebas correctas. [Informe y reproducción](docs/phase3/3.6/RECURSOS_COMPARTIDOS.md).

**Resultado comprobable:** detalle de la mesa y piedra coherentes con Blender bajo un esquema de luz controlado.

## 4 · Iluminación y sombras

**Corrección solicitada durante 4.1:** eliminadas las líneas horizontales que atravesaban las juntas al hacer paneo y oscurecidas las caras interiores que producían las dos líneas verticales señaladas. Verificación en WebGPU, 23 pruebas y [capturas e informe](docs/phase4/pan-lines/CORRECCION.md). Adelanto puntual de 4.6; ese punto sigue pendiente en el conjunto de la sala. Conservada durante la calibración 4.2.

- [x] **4.1** Primera composición solar coherente con el disco, cielo ajustado y balance interior/exterior revisado desde CAM 01/02/04. Perfil reversible y parámetros documentados; equivalencia final pendiente de calibración y atmósfera. [Informe](docs/phase4/4.1/SOL_CIELO.md).
- [x] **4.2** Calibrar intensidades relativas en Three.js a exposición fija; perfil 4.2, comparación con 4.1 y aislamiento de sol/ambiente/áreas. CAM 01/02/04 revisadas y 23 pruebas correctas. El brillo amplio de las áreas disminuye, pero su forma y el acabado final siguen pendientes. [Informe](docs/phase4/4.2/INTENSIDADES.md).
- [x] **4.3** Integración LTC y restauración verificadas. Tras rechazar las áreas reducidas, se conservan los rellenos originales con el balance R01 registrado por el usuario. Revisión visual CAM 01/02/04, capturas 004–006; no se introduce otra reducción de luz. Reflejos finales y sombras de cristalería pendientes en sus puntos. [Informe y decisión](docs/phase4/4.3/AREAS.md).
- [x] **4.4** Cobertura solar acotada, PCF moderado y sombras transmitidas del vidrio. R01 conservado en luces y exposición; CAM 01/02/04, paneo y perfiles de calidad revisados. 24 pruebas correctas. [Informe y límites](docs/phase4/4.4/SOMBRAS.md).
- [x] **4.5** Comparadas base hemisférica, sonda SH y entorno en CAM 01/02/04. Se conserva R01; ensayos reversibles y horneado no incorporado al no demostrar mejora suficiente. 25 pruebas y capturas 001–009. [Decisión, alcance y límites](docs/phase4/4.5/INDIRECTA.md).
- [x] **4.6** Auditados apoyos y cobertura de suelo (11.659 muestras); corregidos 3,6 mm bajo el maletín completo. R01 conservado: reducción de normalBias descartada por bandas. 26 pruebas correctas, capturas cronológicas y límites de oclusión documentados. [Informe](docs/phase4/4.6/CONTACTOS.md).

**Resultado comprobable:** contraluz y lectura de volúmenes cercanos al render de referencia, con atmósfera y bloom desactivados.

## 5 · Reflejos del pavimento y materiales pulidos

- [x] **5.1** Reflector WebGPU compartido por 21 sectores, control de comparación, cámaras/capturas reutilizadas y coste observado. 29 pruebas correctas; capturas 001–007. Ensayo aditivo, desactivado al arrancar. [Informe](docs/phase5/5.1/REFLECTOR.md).
- [x] **5.2** Reflejo modulado por Fresnel, mapa de rugosidad y normales, respetando juntas geométricas; selector de comparación con 5.1. 29 pruebas correctas y capturas 001–007. Integración visual aproximada, no BRDF completa. [Informe](docs/phase5/5.2/MATERIAL.md).
- [x] **5.3** Revisadas las diez cámaras y paneo; matemática del reflector verificada con las cámaras reales. Vistas inversas con limitaciones de decorado documentadas. [Informe](docs/phase5/5.3/CAMARAS.md).
- [x] **5.4** Resolución automática por calidad y manual; actualización adaptativa por cambios, comparador continuo y sin recursión. Caché corregida y ahorro de pasadas verificado en navegador. [Informe](docs/phase5/5.4/RENDIMIENTO.md).
- [x] **5.5** Cubemap local de sala compartido por cinco materiales de metal/vidrio, reversible y actualizado al cambiar iluminación. Pavimento y entorno global conservados. 32 pruebas correctas para la entrega conjunta. [Informe](docs/phase5/5.5/ENTORNO.md).

**Resultado comprobable:** los reflejos largos del suelo refuerzan la composición y mantienen estabilidad al mover la cámara, con coste registrado.

## 6 · Atmósfera y acabado cinematográfico

- [x] **6.1** Profundidad exterior y bruma interior separadas con nodos analíticos y controles independientes. Primer exterior descartado por exceso de aclarado; propuesta tenue revisada en CAM 01/02/04, paneo y restauración. Sin pasadas adicionales; 33 pruebas correctas. [Parámetros, capturas y límites](docs/phase6/6.1/ATMOSFERA.md).
- [x] **6.2** Integración solar acotada con consulta de sombra y polvo de densidad animada, 24/40/64 muestras según calidad. Medición con reflejos, actualización planar a 10 Hz para deriva lenta, controles y restauración comprobados. Corregido el refresco de parámetros de 6.1 en materiales compartidos. 35 pruebas correctas. [Informe y límites](docs/phase6/6.2/VOLUMEN.md).
- [x] **6.3** Oclusión, estabilidad, bandas y ruido revisados: 414 juntas frente al sol, CAM 01–04, paneo y perfiles de calidad. Capturas estáticas idénticas antes/después y tras alternar haces. Protecciones para rayos rasantes e intervalos vacíos; 36 pruebas correctas. [Informe y límites](docs/phase6/6.3/ESTABILIDAD.md).
- [x] **6.4** Bloom por umbral con energía limitada y gradación suave antes de AgX/sRGB. Controles independientes, captura coherente, revisión CAM 01/02/04 y tres calidades. Restauración y repetibilidad exactas, 40 pruebas correctas. [Informe y capturas](docs/phase6/6.4/ACABADO.md).
- [x] **6.5** Controles independientes y registro exportable de 12 configuraciones. Nueve mediciones a igual cámara/resolución/luz; resultados limitados por refresco. [Informe](docs/phase6/6.5/COMPARACION.md).
- [x] **6.6** Valorados grano, viñeta y profundidad de campo; no se incorporan al acabado actual para preservar lectura de piedra, reflejos y arquitectura. CAM 01/02/04 documentadas. [Decisión y límites](docs/phase6/6.6/CRITERIO.md).

**Resultado comprobable:** comparación lado a lado del plano general, el detalle y la vista lateral. Registrar las diferencias restantes con Blender y con los fotogramas de la película.

- [x] **6.7** Cielo panorámico revisado en v3: recuperar composición de las nubes originales y mezclar dentro de su perímetro. v1 y v2 rechazadas; v3 pendiente de valoración visual. [Documentación](docs/phase6/6.7/CIELO.md).

- [x] **6.8** Lens flare solar sutil: halo cálido y tres destellos; activo con intensidad 0,18 y tamaño 1. GUI, trece muestras de profundidad para oclusión y atenuación en bordes; captura y comparación integradas. Revisadas CAM01/02/03 y tres calidades; 44 pruebas correctas. [Informe y alcance de validación](docs/phase6/6.8/LENS_FLARE.md). Estética pendiente de valoración del usuario.

## 7 · Navegación y presentación

- [x] **7.1 · Histórico, sustituido** Recorrido libre WASD/flechas, ratón con captura o arrastre alternativo, Q/E para altura, velocidad regulable y Escape. Ya no se ofrece como modo de navegación; su trabajo y pruebas quedan registrados.
- [x] **7.2 · Histórico, sustituido** Transiciones suaves entre cámaras antiguas (4,5 s, regulables 0–10 s), cambios durante el movimiento y restauración del encuadre desde paneo o recorrido libre. La transición actual entre `cameraStates` se recoge en 7.7.
- [x] **7.3 · Histórico, sustituido** Altura fija ajustable (1,65 m), velocidad 1,4 m/s, colisiones XZ contra 111 volúmenes y límites de la sala. No procede mantener estas colisiones como tarea de la navegación actual. Auditoría histórica en docs/phase7/7.3/WALKING.md.
- [x] **7.4** Observación del tamaño del contenedor, protección de proyección, pausa de entrada al perder foco/usar GUI, pausa al ocultar incluso durante carga y aviso de recarga por pérdida WebGPU. Objetivo escritorio GPU dedicada; límites de validación en docs/phase7/7.4/LIFECYCLE.md.
- [x] **7.5** GUI principal con cámara, calidad, encuadre, navegación y paneo. Herramientas de acabado, captura, diagnóstico y medición agrupadas en Revisión técnica, plegada inicialmente. Cabecera y FPS siempre visibles; valores conservados.

- [x] **7.6 · Histórico, sustituido** Primer paneo con el ratón, documentado en [PANEO.md](docs/PANEO.md). Sus valores globales y su reinicio al cambiar de cámara no describen el comportamiento vigente, recogido en 7.8.

- [x] **7.7** Sustituir los destinos de navegación por pares de cámara y target del Blender auxiliar, con ID común, FOV de cámara, `viewOffset` manual y transición interpolada de posición, target, FOV y offset. `npm run export:camera-states` actualiza el catálogo y la colocación del VK desde el mismo archivo; un nuevo estado aparece en el GUI sin editar código. El GUI o `selectCameraState(id)` seleccionan por ID; cambios de destino durante el travelling y movimiento reducido están cubiertos. [Procedimiento](docs/CAMERA_STATES.md).
- [x] **7.8** Incorporar paneo por `cameraState`: valores `default` y excepciones por ID en `gui.initial.json`, con interpolación de rango horizontal, vertical y suavidad durante el travelling, incluso si se interrumpe. La cámara de render conserva el paneo mientras la base viaja y apunta al target interpolado. [Configuración](docs/GUI_CONFIGURACION.md).
- [x] **7.9** Configurar `camera.stateKeys` en `gui.initial.json`; asociar opcionalmente cada ID a una cifra única de `0` a `9` y rechazar IDs o teclas inválidos. El GUI incluye también los estados sin atajo. La tecla `V` usa la misma acción que el botón para desplegar/replegar el Voight-Kampff. Comprobado en navegador con `p2` exportado, selección desde GUI, `1` y `V`; 123 pruebas Node y compilación de producción correctas el 23-09-2026.

**Resultado comprobable:** crear un par en el auxiliar, ejecutar la exportación y encontrar su estado en el GUI; asignarle una tecla solo si se desea. Paneo y encuadre continúan durante los cambios de estado. Los nombres CAM 01–04 en las fases históricas designan vistas de aquella revisión, no el catálogo actual de destinos.

## 8 · Optimización y entrega

La medición comienza en la fase 1; esta fase reúne los ajustes finales cuando ya se conoce el coste y la aportación visual de cada efecto.

- [x] **8.1** Referencia local: CAM01 Baja/Media/Alta y CAM02 Baja, 120 intervalos por combinación, CPU de envío y timestamps GPU opcionales; carga local, heap JS y contadores de recursos/dibujo. VRAM y CPU total no disponibles; alcance y datos en docs/phase8/8.1/PERFORMANCE.md.
- [x] **8.2** Ajustar resolución interna, reflejos y muestras del volumen; preservar sombras y geometría. Comparación A/B en GUI, ocho mediciones y capturas archivadas en docs/phase8/8.2/PERFORMANCE.md.
- [ ] **8.3** Evaluar Meshopt/Draco y KTX2/Basis con sus decodificadores y comprobar que no dañen juntas, normales, cuero o degradados del cielo.
- [ ] **8.4** Revisar culling, instancias y agrupaciones sin perder control de materiales ni iluminación.
- [ ] **8.5** Acotar los recursos copiados a producción: el andamiaje copia actualmente ejemplos ajenos y archivos fuente `.psd`, `.blend` y `.blend1` desde `static/`. Conservar esos originales y excluirlos de la entrega de Tyrell cuando no sean necesarios.
- [ ] **8.6** Establecer perfiles de calidad medidos; comprobarlos siempre desde los mismos `cameraStates`, FOV, offset y paneo, registrando los IDs usados.
- [ ] **8.7** Compilar producción y probar carga, errores, redimensionado y liberación de recursos.
- [ ] **8.8** Documentar recursos, parámetros artísticos, capturas finales, dispositivos probados y diferencias conocidas frente a Blender.

**Resultado comprobable:** compilación reproducible, versión WebGPU probada en los dispositivos acordados y comparaciones visuales y de rendimiento registradas.

## 9 · Enriquecimiento del exterior

**Objetivo:** completar el entorno de la pirámide y los edificios inclinados con continuidad urbana, iluminación, tráfico aéreo y llamaradas. Mantener el aspecto actual de amanecer/atardecer: las referencias nocturnas orientan formas y efectos, pero no trasladan su look nocturno. Integración sutil con la paleta, luz y atmósfera existentes, conservando el protagonismo de las oficinas.

### 9.0 · Referencias, encuadres y criterios de integración — completado

- [x] Revisar las imágenes de las tres carpetas de referencias y las cinco capturas del usuario con las carencias marcadas en verde. [Láminas e informe inicial](docs/phase9/9.0/PREPARACION.md).
- [x] Registrar criterios visuales, distribución conceptual y fuentes históricas del acabado/rendimiento actuales, separando observaciones y propuestas.
- [x] Revisar secuencias temporales de los dos vídeos y documentar referencias de movimiento/evolución y límites de temporización; no copiar la frecuencia nocturna.
- [x] Revisar CAM01–04, dos extremos de paneo y una vista libre junto a la mesa. Auditar coordenadas del GLB y proponer zonas de edificios, corredores, pasos cercanos y torres. Tres volúmenes de torre/llamarada fuera del frustum en 451 muestras de paneo CAM01; no equivale a validación de efectos todavía inexistentes.
- [x] Guardar siete capturas actuales y medición CAM01 Baja (60 fotogramas de calentamiento, 120 muestras RAF; viewport 1920 × 1080). Contrastar las carencias con las capturas del usuario y las referencias de película. [Preparación, evidencia y límites](docs/phase9/9.0/PREPARACION.md).

### 9.1 · Continuidad urbana y edificios bajos

- [x] Crear edificios bajos inspirados en las terrazas y cubiertas de `_Fuentes/Edificios ciudad/Screenshot_2.jpg`: cinturón cercano, laterales y capa distante; originales del GLB conservados.
- [x] Añadir cornisas, retranqueos, bandas de servicio, nervios y equipos de cubierta; textura de paneles con UV métricas, mipmaps y variación discreta de material. Alturas ajustadas en visor para cubrir remates sin tapar la silueta principal.
- [x] Valorar la textura distante: se conserva una capa geométrica con paralaje, sin fotografía de fondo ni cambio de cielo. Decisión y límites en el informe.
- [x] Revisar CAM01–04, dos extremos de paneo y Camera_free elevada; siete capturas archivadas. GUI «Exterior — Fase 9 → Edificios bajos», comparación A/B con invalidación de reflejos y medición de coste. Valoración estética pendiente del usuario; no se declara cobertura de todas las posiciones posibles.

**Resultado:** exterior continuo en las vistas revisadas, sin finales de modelo evidentes y con profundidad urbana.

**Revisión solicitada 20/09:** cubiertas rebajadas 2,5 m. Tres torres industriales estáticas (una derecha, dos más lejanas a la izquierda), adelantando la geometría prevista en 9.5. Plataformas, fustes y mástiles con los materiales actuales; sin emisiones todavía. 451 muestras de paneo CAM01 verifican que las torres y una reserva de 25 m sobre ellas quedan fuera de cuadro. Propuesta revisada pendiente de valoración artística; capturas 008–011 conservadas junto a la primera propuesta.

**Revisión solicitada 21/09:** materiales base algo más oscuros para la ciudad y las torres. Continuidad localizada en los dos niveles de cubierta y el lateral señalados al pie derecho de la pirámide: revestimiento texturizado adherido y tres pequeños remates de servicio. Se conservan exactamente las alturas y posiciones de los edificios existentes. Tres mallas y 23.574 triángulos en total; propuesta pendiente de valoración artística.

**Segunda revisión de tono 21/09:** ciudad de 9.1 más oscura y cubiertas claramente más mates para dar protagonismo a pirámide e inclinados. Menor color base, oscurecimiento adicional de caras superiores y fuerte reducción de intensidad especular. Se mantienen geometría, alturas y luces. Propuesta pendiente de valoración artística.

**Corrección posterior 21/09:** la segunda revisión se considera insuficiente por el usuario. Se oscurecen más los techos y todas las piezas de las torres; especular a cero y corrección artística de tono localizada después de la bruma para evitar que vuelva a aclararlos. Tres mallas y geometría intacta. Revisado en WebGPU y archivado en capturas 020–022; pendiente de valoración artística.

### 9.2 · Iluminación de los edificios

- [x] Usar `_Fuentes/Luces edificio piramide` como referencia para ventanas de oficinas a escala monumental, focos de hangares y luces rojas/naranjas de ascensores.
- [x] Añadir máscaras emisivas métricas a la pirámide, edificios inclinados y nuevos edificios de 9.1; ventanas finas, bandas ocasionales de hangares y acentos de ascensores. Intensidad inicial reducida para conservar el amanecer/atardecer.
- [x] Añadir pequeñas balizas blancas estroboscópicas en vértices superiores reales del GLB, con doble destello y desfases.
- [x] Incorporar GUI para intensidad de luces de edificios, incluido cero, y control independiente de balizas.

**9.2 reabierta por valoración del usuario:** la propuesta 001–004 tenía luces demasiado grandes y bastas y balizas demasiado pequeñas y duras. Revisión: ventanas más finas en filas de plantas separadas por bandas oscuras; suavizado corregido para no ensanchar luces subpíxel; balizas con halo blanco suave de mayor extensión. Se conservan las capturas anteriores. [Implementación, controles y límites](docs/phase9/9.2/ILUMINACION.md). Pendiente de valoración de la revisión antes de pasar a 9.3.

**Revisión estructural a partir de la referencia anotada:** agrupaciones en columnas y bandas oscuras, márgenes en los límites de cada fachada y franja central de pirámide sin ventanas con iluminación ascendente suave simulada. Coordenadas ajustadas a las superficies inclinadas y a los volúmenes de ciudad. Capturas 9.2_008–010, diagnóstico y referencia guardados; propuesta pendiente de valoración artística. Las balizas conservan los halos revisados.

**Revisión de ascensores exteriores, corregida el 21/09:** la entrega 9.2_011–013 fue rechazada por su soporte saliente. Se retiran la cuña y todos los perfiles añadidos. Los trece carriles pasan al material de la superficie original, con bajorrelieve simulado en normales, franja oscura sin emisión y surcos algo más oscuros. Ningún vértice desplazado ni volumen nuevo; se respetan las pendientes y ocultaciones originales. Punto 9.2 pendiente de valoración de esta corrección.

**Resultado:** mayor riqueza y lectura de escala sin convertir las fachadas en superficies excesivamente luminosas ni oscurecer el entorno para hacerlas visibles.

### 9.3 · Tráfico aéreo lejano

- [x] Crear objetos mínimos, percibidos como pequeñas manchas en movimiento, con luces blancas de posición y luces estroboscópicas.
- [x] Establecer dos corredores de fondo; el desvío al hangar se retira a petición del usuario en r06. Añadir un tercer corredor ante las fachadas de derecha a izquierda. Velocidades diferentes por recorrido y separación escalonada estable.
- [x] Añadir GUI para densidad del tráfico lejano: 80 % inicial (ocho vehículos), cero para apagar y máximo diez vehículos repartidos por el exterior.

**Propuesta 21/09:** implementada y revisada en WebGPU a petición del usuario. Rutas alejadas y por encima de la pirámide, cuerpos mínimos, halos blancos y destellos suaves. Seis pruebas correctas, auditoría de visibilidad y cuatro muestras A/B conservadas. Capturas 9.3_001–004. [Implementación y límites](docs/phase9/9.3/TRAFICO.md). Pendiente de valoración artística; no se adelantan los vehículos cercanos de 9.4.

**Revisión r02, 21/09:** tras observar largos intervalos sin tráfico, el usuario solicita duplicar la base y hacer más continuas las regeneraciones. Ocho vehículos con ciclos de 60/68 s, tramos laterales más cortos y corredor secundario más próximo. Prueba de diez minutos sin pérdida de separación; auditoría aproximada de CAM01 con tráfico visible geométricamente en el 84,5 % de las muestras y 2,7 s de intervalo vacío máximo. Cinco pruebas correctas, compilación y diagnóstico WebGPU tras varias vueltas. Capturas 9.3_005–007 y registros r02 conservados; pendiente de valoración artística.

**Revisión r03, 21/09:** se añade una ruta entre las oficinas y las fachadas, de derecha a izquierda, y se aumenta uniformemente un 25 % el cuerpo y las luces de todos los vehículos. Ocho vuelos de base repartidos 3 + 3 + 2; el corredor nuevo tiene ciclos de 40 s, con cruces separados 20 s. Pruebas de margen geométrico, sentido de vuelo y repetición correctas; auditoría con la pirámide por detrás de los vehículos en las cuatro cámaras principales. Compilación correcta y revisión WebGPU; registros r03 conservados. [Detalle](docs/phase9/9.3/TRAFICO.md).

**Revisión r04, 21/09:** a petición del usuario se reduce solo el tráfico frontal a un cuarto de su tamaño en r03 y se baja 2,5 m. El desvío desde el corredor alto gira, desciende y se acerca al hangar supuesto siguiendo el dibujo; queda oculto por el bloque marcado, con opacidad completa hasta el destino. Seis pruebas correctas, incluyendo trayectoria sin cruces del eje con el edificio y ocultación del casco desde Camera_E, CAM01 y CAM03. Compilación y revisión WebGPU correctas; capturas 9.3_013–016 y registros r04. [Recorrido, escala y límites](docs/phase9/9.3/TRAFICO.md).

**Revisión r05, 21/09:** el vehículo del hangar se reduce a un cuarto de su tamaño en r04 y su ruta empieza detrás de la pirámide. Las primeras muestras del recorrido quedan ocultas por el edificio desde Camera_E, CAM01 y CAM03; después emerge antes de girar y descender. La primera aproximación de la sesión también comienza oculta. Seis pruebas correctas, incluyendo reducción/restauración de escala al cambiar de ruta y continuidad durante diez minutos. Tráfico frontal y destino del hangar conservados. [Detalle y validación](docs/phase9/9.3/TRAFICO.md).

**Revisión r06, 21/09:** se elimina completamente el vuelo al hangar, descartado por el usuario, incluida su regeneración. Se mantienen los tres corredores, ocho vuelos de base y el tráfico frontal pequeño y bajo. Las capturas r04/r05 del hangar se conservan como propuestas rechazadas. Captura 9.3_019; validación conjunta con 9.4.

**Resultado:** actividad distante discreta que refuerce la escala de la ciudad.

### 9.4 · Tráfico aéreo cercano

- [x] Crear una silueta reconocible inspirada en imágenes y vídeo de `_Fuentes/Vehiculo aereo`, sin reproducción exacta ni detalle innecesario.
- [x] Revisión r02: una única pasada en primer término, de la zona superior izquierda al lateral derecho, a cota constante sobre la altura de las oficinas; conservar un arco horizontal suave.
- [x] Evitar cruces con arquitectura y apariciones/desapariciones visibles; un solo vehículo repite el mismo trayecto al terminar. Banking máximo de 20° (revisión r03).
- [x] Duración inicial de 40 s por vuelta (25 % de la velocidad de r02), GUI de duración y activación; modelo al 25 % de escala, silueta oscura legible, foco central cálido, halo contenido y estroboscópica secundaria.

**Resultado:** pasos ocasionales integrados con perspectiva y atmósfera, diferenciados del tráfico lejano.

**Propuesta 21/09:** geometría simplificada de cabina alargada, cuerpo bajo y dos volúmenes laterales; luces blancas suaves y salida cálida. Dos rutas alternas con separación vertical y lateral, sobre el techo de las oficinas. Intervalo inicial de 10 s, regulable de 5 a 30 s, y apagado independiente. Ocho pruebas correctas, incluyendo regeneración durante diez minutos y comprobación conservadora de todo el casco frente al GLB. Compilación correcta y revisión WebGPU en CAM01 y Camera_E; capturas 9.4_001–004. [Implementación, controles y límites](docs/phase9/9.4/TRAFICO-CERCANO.md). Pendiente de valoración artística; 9.5 sin iniciar.

**Revisión r02, 21/09:** propuesta 001–004 rechazada por el usuario. Se reduce el tamaño a 0,25, se elimina la alternancia y se limita a un solo vehículo y un único recorrido repetido. Altura constante, arco horizontal suave, rumbo separado de banking (≤3°) y núcleo HDR con glow/halo de lente que aprovecha el bloom actual. El control pasa de intervalo entre vehículos a duración del trayecto. Ocho pruebas correctas y revisión visual documentada en [9.4](docs/phase9/9.4/TRAFICO-CERCANO.md). Historial conservado; pendiente de valoración artística.

**Revisión r03, 21/09:** r02 rechazada por rapidez y halo que ocultaba totalmente el vehículo. Se mantiene una única ruta y la escala, se reduce la velocidad al 25 % (40 s por vuelta), se permite banking hasta 20° y se recupera la masa oscura mediante materiales mates y un foco cálido más compacto. Glow y halo reducidos; destello blanco secundario. Ocho pruebas correctas y auditoría sin colisiones. [Referencia y registros](docs/phase9/9.4/TRAFICO-CERCANO.md). Compilación y revisión WebGPU correctas; capturas 9.4_009–012 archivadas. Pendiente de valoración artística.

**Revisión r04, 21/09:** se refuerza el anillo en el contorno del halo con un perfil difuso y se añade un único destello diagonal sutil, siguiendo la referencia del usuario. Se conserva la silueta oscura y el tamaño contenido del halo. Misma ruta, velocidad, escala y límite de inclinación; no aumenta el número de sprites ni de pases de render. Tres pruebas de tráfico cercano correctas, compilación y revisión WebGPU sin errores. Capturas 9.4_013–015. Pendiente de valoración artística.

### 9.5 · Torres y llamaradas

- [x] Tomar como referencia `_Fuentes/Edificios ciudad/fondo ciudad y llamaradas.mp4` para torres y aspecto de las emisiones.
- [x] Situar una torre a la derecha y dos a la izquierda, estas últimas más alejadas (geometría adelantada en revisión de 9.1 a petición del usuario).
- [x] Mantener las llamaradas fuera de cuadro desde CAM 01, incluida la extensión máxima del efecto; comprobar también el paneo previsto para esa cámara.
- [x] Usar una presencia mucho menor que en el vídeo, emisiones ocasionales y no sincronizadas, adaptadas al amanecer/atardecer.
- [x] Añadir GUI para activación, frecuencia e intensidad de llamaradas.

**Resultado:** detalle característico visible al explorar otros encuadres, sin alterar la composición de CAM 01.

**Propuesta 21/09:** emisiones breves de chorro y lóbulos cálidos, con intensidad adaptada al amanecer. Tres torres existentes, sin emisiones simultáneas; GUI de activación, intervalo 12–60 s e intensidad 0–1,5 (iniciales 26 s y 0,65). Comprobadas las envolventes completas fuera de CAM01 con paneo; visibles desde Camera_D y CAM02. Doce pruebas, compilación y revisión WebGPU correctas. Capturas 9.5_001–005 y [registros](docs/phase9/9.5/LLAMARADAS.md). Pendiente de valoración artística; 9.6 sin iniciar.

**Revisión r02, 21/09:** se amplía el efecto a 3,5× y se añade GUI de tamaño 1–5×. La cadencia base pasa a 4,5 s y el intervalo del GUI permite bajar hasta 2 s. Se mantiene una sola emisión activa. La torre derecha se desplaza de X=360 a X=400 para conservar CAM01 limpia; auditoría a 3,5× y al máximo 5× en 2,4:1 y 16:9 sin intersecciones. Doce pruebas, compilación y revisión WebGPU correctas. Capturas 9.5_006–009 y [registros r02](docs/phase9/9.5/LLAMARADAS.md). Pendiente de valoración artística.

### 9.6 · Integración, ajustes y validación final

- [x] Agrupar controles en «Exterior — Fase 9», con apartados de edificios, tráfico lejano, tráfico cercano y llamaradas; ya existe en el GUI.
- [ ] Validar artísticamente los valores iniciales del exterior y ajustarlos si dejan de ser sutiles al combinar los efectos.
- [ ] Revisar `initial` y los demás `cameraStates` afectados (incluidos `p1` y `p2`): escala, profundidad, niebla, oclusiones y continuidad de trayectorias con su FOV, offset y paneo actuales.
- [ ] Comprobar el efecto conjunto, conservando el protagonismo de las oficinas y el acabado actual.
- [ ] Comparar coste con la referencia previa a Fase 9 y ajustar geometrías, texturas y luces; registrar resultados por calidad, sin atribuir mejoras no medidas.
- [ ] Guardar capturas, parámetros y límites; trasladar los nuevos recursos a las revisiones finales pendientes de 8.3–8.8.

**Criterio de cierre:** exterior más completo y vivo, sin cortes visibles en las vistas revisadas, efectos regulables e integración sutil. Cada subfase conserva el requisito general de captura y validación visual; una compilación correcta no la cierra por sí sola.

## 10 · Niveles de calidad y optimización a aproximadamente 60 FPS

**Iniciada el 24-09-2026; R03 implementada.** Cinco perfiles globales de calidad (denominados LOD) con presupuestos reducidos y adaptación por FPS después de seleccionar por score. Regulan resolución y efectos; conservan geometría. Alta registra 58,7–59,2 FPS en tres pasadas de `initial`; p95 y equipos reales siguen pendientes. La adaptación baja de LOD cuando la resolución por sí sola no basta. No se cierran tareas pendientes de fases 8 y 9. [Estado vigente y límites](docs/phase10/R03_AUTO.md).

### 10.1 · Umbrales, referencias y protocolo de medida

| Calidad | GPU Score: límite inferior incluido, superior excluido |
| --- | --- |
| Extra baja | Mayor que 0 y menor que 25.000.000 |
| Baja | Desde 25.000.000 hasta menos de 60.000.000 |
| Media | Desde 60.000.000 hasta menos de 120.000.000 |
| Alta | Desde 120.000.000 hasta menos de 240.000.000 |
| UltraAlta | 240.000.000 o más |

Referencias aportadas por el usuario, todavía sin repetir bajo un protocolo común:

- **Alta:** Lenovo Legion Y540-17IRH, Intel Core i7-9750HF a 2,60 GHz, 16 GB RAM, NVIDIA GeForce GTX 1650; GPU Score aproximado **170.000.000**, escenario actual cerca de **60 FPS**.
- **Baja:** Lenovo ThinkBook 16 G7 ARP, Radeon 660M; GPU Score aproximado **33.500.000**, escenario actual cerca de **20 FPS**. Alcanzar 60 FPS requiere pasar aproximadamente de 50 a 16,67 ms por fotograma; cambiar el nombre del preset no constituye una optimización.
- **Extra baja / modo móvil:** Redmi Note 14 Pro; GPU Score aproximado **11.000.000**, escenario actual cerca de **10 FPS**. Variante exacta, GPU, navegador y resolución pendientes de registrar en el dispositivo. Alcanzar 60 FPS requiere pasar aproximadamente de 100 a 16,67 ms por fotograma: reducir el tiempo a una sexta parte. Es un objetivo de optimización pendiente de verificar, no una prestación garantizada.

- [ ] Registrar la versión `tyrell-compute-v1`, método de medida y fiabilidad junto al score; comparar scores obtenidos con la misma versión y método. El benchmark sintético orienta la selección inicial, no predice por sí solo los FPS.
- [ ] Fijar y registrar resolución de salida, tamaño del viewport, DPR, resolución interna, navegador/versión, backend, GPU efectiva y modo de energía; medir los portátiles conectados a corriente y sin carga externa relevante. Propuesta inicial de comparación: pantalla 1920 × 1080, anotando el área real de escena y su relación de aspecto.
- [ ] Guardar una base del escenario completo por equipo antes de ajustar presets, incluida la calidad actualmente seleccionada y sus parámetros. No asumir que los 60 FPS aportados corresponden al preset Alta actual.
- [ ] Definir un recorrido repetible con `initial`, `p1`, `p2` y los demás `cameraStates` vigentes, extremos de paneo, travelling, Voight-Kampff desplegado y animaciones exteriores activas. Incluir las vistas de mayor coste.
- [ ] Medir tras calentamiento y compilación, con tres pasadas de al menos 60 s por caso; recoger FPS, tiempo medio y p95 de fotograma, tiempos CPU/GPU cuando estén disponibles, draw calls y triángulos. Separar carga inicial de rendimiento sostenido y excluir pausas de pestaña oculta.

**Avance 10.1, R02:** implementado el botón de tres pasadas de 60 s con 5 s de calentamiento por pasada, cancelación por cambios/visibilidad y exportación de estadísticas RAF completas. Quince pasadas exploratorias en `initial` registradas; faltan control de energía, identificación exacta del equipo, resto de vistas y dispositivos reales. [Condiciones y resultados](docs/phase10/R02_PERFORMANCE.md).

### 10.2 · Creación y selección de los cinco perfiles

- [x] Centralizar nombres y umbrales e integrar **Extra baja, Baja, Media, Alta y UltraAlta** en configuración, GUI, diagnósticos y comparador de rendimiento; auditar consumidores que asuman tres niveles.
- [x] Seleccionar inicialmente el perfil por GPU Score válido. Tratar `null`, cero, negativos, NaN, errores y timeout como medición no disponible, nunca como potencia cero; usar Baja como fallback provisional en escritorio y Extra baja en modo móvil, mostrando el motivo en diagnóstico. Los scores aproximados requieren confirmación con rendimiento real.
- [x] Conservar selección manual y distinguir en la GUI el modo automático, el nivel recomendado y el aplicado. Respetar la elección manual durante la sesión y definir la compatibilidad con ajustes guardados.
- [ ] Probar valores justo por debajo, exactamente en y justo por encima de cada umbral, además de score inválido y cambios de calidad sin recarga ni pérdida de recursos.

**Avance 10.2:** límites, scores inválidos y compatibilidad cubiertos por pruebas; cambios entre los cinco niveles y ambos modos revisados en WebGPU sin errores tras corregir referencias de volumen/sombras y redimensionado de reflejos. Queda pendiente la auditoría prolongada de recursos y valoración visual de los nuevos presupuestos; por ello no se cierra la subfase completa.

### 10.3 · Presupuestos visuales y optimización del escenario

**R04, prueba solicitada:** Baja/Extra baja y todos los perfiles móviles excluyen bloom global y reflejo planar para aumentar resolución. Baja pasa de ratio 0,5 a 0,6 (+44 % píxeles); Extra baja de 0,4 a 0,5 (+56,25 %). Móvil Media/Alta también suben dentro del límite de píxeles. La comparación R03 sigue disponible y las preferencias de efectos se restauran al salir del perfil. Seis pasadas de Baja: R03 ~59,6 FPS; R04 59,8 / 59,6 / 57,3 FPS, p95 ~20 ms, con una pausa aislada de 2 s registrada en la última. Menos CPU, algo más GPU en muestras cortas; no se extrapola al hardware débil. 147 pruebas correctas, build y cambios de perfil sin errores WebGPU. [Propuesta y límites](docs/phase10/R04_RESOLUCION.md). No se cierra la calibración del hardware ni la aprobación visual.

**Avance R02:** LOD automático visible junto a FPS incluso con GUI oculta; elección manual identificada por separado. Comparadas resolución, cadencia de sonda y presupuesto anterior en 15 pasadas. Alta actual ~33 FPS; menos píxeles ~52 FPS; presupuesto anterior ~58 FPS, todavía con p95 de 27–28 ms. No se adopta el límite de sonda como valor global ni se da por calibrada Alta. [Informe y siguiente trabajo](docs/phase10/R02_PERFORMANCE.md).

- [ ] Tomar el aspecto actual del Legion como referencia visual de Alta, registrando primero sus parámetros reales. Definir una tabla de presupuestos por nivel con resolución interna, sombras, muestras volumétricas, escala/cadencia de reflejos, posprocesado, texturas y detalle/densidad exterior.
- [ ] Perfilar CPU y GPU y hacer comparaciones A/B de un cambio cada vez, priorizando los costes medidos. Revisar también reflejos y sonda del Voight-Kampff, transparencias, tráfico y llamaradas del escenario completo.
- [ ] Calibrar primero **Baja en Radeon 660M** y **Alta en GTX 1650**. Reducir primero costes de efectos y resolución preservando composición, iluminación y siluetas; aplicar simplificación geométrica, instancias o culling donde las mediciones lo justifiquen.
- [ ] Definir Media entre las dos referencias; Extra baja como presupuesto mínimo visualmente aceptable; UltraAlta como mejora visible que utilice margen de hardware superior manteniendo el objetivo temporal. No subir costes sin mejora visual comprobable.
- [ ] Comprobar cambios entre todos los perfiles, redimensionado, navegación y estabilidad de reflejos/sombras. Archivar capturas comparables por nivel y documentar pérdidas visuales aceptadas.

### 10.4 · Ajuste por rendimiento real

**Implementada en R03:** el score fija el perfil inicial y el rendimiento sostenido corrige resolución y LOD efectivo. Alta inicia con el presupuesto previamente medido cerca de 58 FPS. Dos ventanas de 4 s por debajo de 55 FPS —una si baja de 40— reducen resolución y después LOD, con 4 s de estabilización entre ajustes. Manual fijo; pausas/carga y medidas quedan excluidas. Sin subidas automáticas basadas únicamente en 60 FPS. [Presupuestos, comportamiento y validación](docs/phase10/R03_AUTO.md).

- [x] Definir límites de resolución por perfil (75–100 %), ventanas de al menos 4 s / 30 fotogramas y espera de 4 s entre cambios. Dos ventanas lentas; vía rápida si también la mediana confirma lentitud. Sin subidas automáticas ni oscilación entre niveles.
- [x] Ignorar carga, estabilización y pestaña oculta; una pausa aislada no activa la vía rápida. No elevar calidad basándose en 60 FPS. Suspender adaptación durante mediciones técnicas y capturas.
- [x] Mantener el preset manual fijo. Mostrar nivel inicial, nivel efectivo, escala y motivos en diagnóstico/exportación e identificar el LOD aplicado junto a FPS.
- [x] Acotar Extra baja al mínimo y registrar `atMinimum` y FPS cuando siga lento. Prueba automatizada del límite; no se garantiza 60 FPS para cualquier dispositivo.

**Validación R03:** 143 pruebas correctas, compilación y revisión WebGPU sin errores. Bajo carga elevada real, score 163,84 M inició Alta a unos 22 FPS y terminó en Baja a unos 56 FPS. Las ventanas del controlador no son aceptación sostenida del hardware. Restan p95, tres pasadas de las demás vistas y validación en ThinkBook/Redmi; la fase no se cierra.

### 10.5 · Validación y cierre

- [ ] Validar Baja y Alta en los dos ordenadores aportados y Extra baja con modo móvil en el Redmi Note 14 Pro; conseguir hardware representativo para Media y UltraAlta y comprobar Extra baja en escritorio, preferiblemente cerca del extremo inferior de los tramos. Las pruebas de un preset en una GPU más potente no validan su tramo ni sustituyen la validación móvil.
- [ ] Usar como criterio inicial de aceptación por caso una media de **al menos 55 FPS** (objetivo 60; media de fotograma ideal de **16,67 ms**) y **p95 de fotograma ≤ 20 ms**, sin caídas sostenidas ni degradación visual inaceptable. Registrar cada pasada; no ocultar vistas lentas dentro de una media global.
- [ ] Comprobar calidad visual en los `cameraStates` actuales, paneos y transiciones, con comparación a la referencia de Alta y capturas según el registro general del proyecto.
- [ ] Guardar en `docs/phase10/` la matriz equipo × modo (escritorio/móvil) × calidad × vista × resolución, parámetros, mediciones antes/después, capturas y limitaciones. Marcar como pendientes los niveles sin hardware real de validación.
- [ ] Actualizar documentación de arranque, selector, benchmark y calidad; ejecutar las pruebas relevantes y compilación, además de la revisión en navegador.

### 10.6 · Modo móvil y calibración en Redmi Note 14 Pro

**Ampliación solicitada el 24-09-2026.** Añadir un modo móvil compatible con los cinco niveles de calidad, con presupuestos y controles adaptados. No constituye un sexto tramo de score: el Redmi de referencia corresponde a Extra baja por sus 11.000.000 puntos. Mantener separados en configuración y diagnóstico el modo de dispositivo y el nivel de calidad; una GPU de escritorio lenta también puede pertenecer a Extra baja.

- [x] Definir selección de modo Auto / Escritorio / Móvil, con detección inicial que combine capacidades de entrada y características del dispositivo, sin depender solo del ancho de pantalla ni del score. Permitir corrección manual y verificar que el cambio no pierde el estado de cámara.
- [ ] Crear presupuestos móviles por calidad con límite explícito de píxeles internos y DPR efectivo; calibrar resolución dinámica con un mínimo de legibilidad. No aplicar sin límite el DPR nativo. Registrar resolución de salida e interna en vertical y horizontal; el protocolo de escritorio a 1920 × 1080 no se impone al teléfono.
- [ ] Perfilar en el Redmi y probar variantes de bajo coste: reflejos simplificados o precalculados, sombras reducidas, atmósfera analítica en lugar de integración volumétrica costosa, posprocesado reducido y menor detalle/densidad del exterior. Medir cada cambio y preservar encuadre, siluetas e iluminación característica; los valores definitivos dependen de las pruebas.
- [ ] Auditar memoria y carga de texturas/geometrías, recursos temporales y pasadas de render; evitar cargar recursos exclusivos de niveles superiores cuando no se utilicen y liberar correctamente al cambiar de modo.
- [ ] Adaptar selector de cámaras, calidad y control Voight-Kampff a interacción táctil sin necesidad de teclado ni hover. Comprobar legibilidad de GUI/FPS, áreas seguras, orientación y paneo táctil sin conflictos con los controles.
- [ ] Registrar variante exacta del Redmi, GPU efectiva, sistema, navegador, backend, refresco, batería y ahorro de energía. Verificar compatibilidad WebGPU en el dispositivo y una salida clara si no está disponible; no asumirla por el nombre comercial.
- [ ] Repetir el protocolo 10.1 en el teléfono real y añadir una sesión continua de al menos 15 minutos, registrando evolución de FPS y posibles caídas sostenidas por calentamiento. Comprobar también pausa/reanudación, cambio de orientación y recuperación de recursos.
- [ ] Mantener **60 FPS aproximados** como objetivo y aplicar los criterios 10.5 al rendimiento sostenido. Si no se alcanza tras optimizar, documentar el mejor resultado y el coste visual; presentar **30 FPS estables** como alternativa para decisión del usuario, sin rebajar automáticamente el objetivo ni declarar la fase completada.

**Criterio de cierre:** cinco perfiles operativos con los umbrales acordados, modo móvil validado en el Redmi Note 14 Pro, selección automática y manual comprobadas, optimizaciones respaldadas por mediciones y objetivo aproximado de 60 FPS verificado en las condiciones documentadas de cada equipo. Los umbrales son iniciales; cualquier recalibración deberá quedar justificada y registrada. La fase no se cierra globalmente mientras falte validar algún nivel o el modo móvil.

## Criterio de seguimiento

**Referencia de acabado:** [Tyrell · R01 — Contraste equilibrado](docs/acabados/R01/README.md), guardada a petición del usuario, corresponde al estado 4.3_003. No sobrescribir sus parámetros/captura; crear R02 para la siguiente referencia. Registrar una referencia no cierra automáticamente el punto pendiente.

**Requisito del usuario desde 09/09/2026:** al completar cada punto, crear y guardar un pantallazo en `docs/capturas/` con el formato `PUNTO_NNN_AAAA-MM-DD_CAMxx.png` (ejemplo: `4.3_001_2026-09-09_CAM01.png`). NNN es un contador cronológico creciente dentro del punto, incluyendo revisiones; no reiniciarlo ni sobrescribir capturas anteriores. Si se guardan varias cámaras, cada captura recibe el siguiente número. Registrar en `docs/capturas/INDEX.md` fecha/hora, perfil, cámara, calidad, exposición, tipo de captura y estado (propuesta, rechazada o base restaurada). Contrastar con el fotograma antes de marcar completado; si el usuario rechaza el resultado visual, reabrir el punto aunque pasen las pruebas. Las capturas históricas anteriores mantienen sus nombres; cualquier copia al nuevo registro debe indicar su procedencia.

Al terminar cada entrega: actualizar esta lista, anotar archivos relevantes, comprobaciones realizadas, captura comparable cuando exista cambio visual y siguiente tarea. Las decisiones de implementación rutinarias se resuelven durante el trabajo; se consultan los cambios de alcance o de experiencia que lo necesiten.

Documentación técnica consultada: [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer.html), [ReflectorNode](https://threejs.org/docs/pages/ReflectorNode.html), [VolumeNodeMaterial](https://threejs.org/docs/pages/VolumeNodeMaterial.html). Los ejemplos actuales pueden diferir de Three.js 0.182.0; contrastarlos con el código instalado antes de implementar.
