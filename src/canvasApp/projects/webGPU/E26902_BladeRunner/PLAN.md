# E26902 Blade Runner · Plan de trabajo

Ajustes de arranque actualizados el 10-09-2026: GUI inicialmente oculta, cabecera y FPS siempre visibles; calidad Baja; bloom, color cinematográfico, profundidad exterior, bruma interior, haces y ambos reflejos activos. Paneo horizontal 2 m, vertical 0,5 m, suavidad 1,4 s. FPS visibles incluso con GUI oculta. Esta preferencia sustituye las notas históricas de arranque sin efectos ; 6.5 queda documentado más abajo.

Estado actual (21-09-2026): **9.1 y 9.2 implementados y en revisión artística.** Ciudad baja con 97 edificios, tres torres, continuidad local de cubierta y acabado más oscuro y mate; tres mallas, una textura compartida y 23.574 triángulos añadidos. Ventanas agrupadas, balizas suaves y carriles integrados en la superficie original. Última revisión: tres pruebas de ciudad/luces correctas, compilación y comprobación visual WebGPU. Detalles en [9.1 — Continuidad urbana](docs/phase9/9.1/CIUDAD.md) y [9.2 — Iluminación](docs/phase9/9.2/ILUMINACION.md). Pendiente de valoración artística del usuario. **9.3 sin iniciar.** [Preparación 9.0](docs/phase9/9.0/PREPARACION.md) conservada. 8.3–8.8 siguen pendientes; se revisará el coste global antes de la entrega final.

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

- [x] Navegación confirmada por el usuario: **recorrido libre y cámaras de la película**.
- [x] Dispositivos prioritarios confirmados por el usuario: **ordenadores con GPU dedicada**.
- [ ] Concretar GPU/navegador/resolución de referencia y objetivo de fluidez al comenzar la medición. No prometer un número de FPS sin medirlo.

Priorizar la fidelidad visual en esos equipos. Las cámaras fijas proporcionarán la referencia de comparación antes de incorporar el recorrido libre. El objetivo de fluidez se fijará a partir de mediciones del dispositivo de referencia.

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

- [x] **7.1** Recorrido libre WASD/flechas, ratón con captura o arrastre alternativo, Q/E para altura, velocidad regulable y Escape. Cámaras y atajos conservados; paneo sólo en modo fijo. Sin colisiones (7.3).
- [x] **7.2** Transiciones suaves entre cámaras (4,5 s, regulables 0–10 s desde 7.3), cambios durante el movimiento y restauración del encuadre desde paneo o recorrido libre. Preferencia de movimiento reducido respetada.
- [x] **7.3** Altura fija ajustable (1,65 m), velocidad 1,4 m/s, colisiones XZ contra 111 volúmenes y límites de la sala, deslizamiento y entrada válida desde todos los presets. UV de mesa/pared reevaluadas: se conservan; ver límites y auditoría en docs/phase7/7.3/WALKING.md.
- [x] **7.4** Observación del tamaño del contenedor, protección de proyección, pausa de entrada al perder foco/usar GUI, pausa al ocultar incluso durante carga y aviso de recarga por pérdida WebGPU. Objetivo escritorio GPU dedicada; límites de validación en docs/phase7/7.4/LIFECYCLE.md.
- [x] **7.5** GUI principal con cámara, calidad, encuadre, navegación y paneo. Herramientas de acabado, captura, diagnóstico y medición agrupadas en Revisión técnica, plegada inicialmente. Cabecera y FPS siempre visibles; valores conservados.

- [x] **7.6** Adelanto solicitado durante 3.1: paneo con el ratón, mirada fija, recorridos y suavidad configurables, retorno al centro y captura sin paneo. Pruebas automatizadas correctas; **revisión visual pendiente por falta de navegador conectado**. Detalles en [PANEO.md](docs/PANEO.md).

**Resultado comprobable:** navegación cómoda y estable sin perder acceso a las cámaras de comparación.

## 8 · Optimización y entrega

La medición comienza en la fase 1; esta fase reúne los ajustes finales cuando ya se conoce el coste y la aportación visual de cada efecto.

- [x] **8.1** Referencia local: CAM01 Baja/Media/Alta y CAM02 Baja, 120 intervalos por combinación, CPU de envío y timestamps GPU opcionales; carga local, heap JS y contadores de recursos/dibujo. VRAM y CPU total no disponibles; alcance y datos en docs/phase8/8.1/PERFORMANCE.md.
- [x] **8.2** Ajustar resolución interna, reflejos y muestras del volumen; preservar sombras y geometría. Comparación A/B en GUI, ocho mediciones y capturas archivadas en docs/phase8/8.2/PERFORMANCE.md.
- [ ] **8.3** Evaluar Meshopt/Draco y KTX2/Basis con sus decodificadores y comprobar que no dañen juntas, normales, cuero o degradados del cielo.
- [ ] **8.4** Revisar culling, instancias y agrupaciones sin perder control de materiales ni iluminación.
- [ ] **8.5** Acotar los recursos copiados a producción: el andamiaje copia actualmente ejemplos ajenos y archivos fuente `.psd`, `.blend` y `.blend1` desde `static/`. Conservar esos originales y excluirlos de la entrega de Tyrell cuando no sean necesarios.
- [ ] **8.6** Establecer perfiles de calidad medidos; comprobarlos siempre desde las mismas cámaras.
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

- [ ] Crear objetos mínimos, percibidos como pequeñas manchas en movimiento, con luces blancas de posición y luces estroboscópicas.
- [ ] Establecer uno o dos corredores y desvíos ocasionales hacia el edificio; variar discretamente velocidades y separación.
- [ ] Añadir GUI para densidad del tráfico lejano, baja por defecto y con posibilidad de desactivarlo.

**Resultado:** actividad distante discreta que refuerce la escala de la ciudad.

### 9.4 · Tráfico aéreo cercano

- [ ] Crear una silueta reconocible inspirada en imágenes y vídeo de `_Fuentes/Vehiculo aereo`, sin reproducción exacta ni detalle innecesario.
- [ ] Preparar pasos por encima de las oficinas, de aproximación y alejamiento; reproducir el carácter del movimiento de referencia.
- [ ] Evitar cruces con arquitectura y apariciones/desapariciones visibles; alternar recorridos para reducir repetición.
- [ ] Establecer aproximadamente un paso cada 10 segundos; añadir GUI para intervalo en segundos y activación.

**Resultado:** pasos ocasionales integrados con perspectiva y atmósfera, diferenciados del tráfico lejano.

### 9.5 · Torres y llamaradas

- [ ] Tomar como referencia `_Fuentes/Edificios ciudad/fondo ciudad y llamaradas.mp4` para torres y aspecto de las emisiones.
- [x] Situar una torre a la derecha y dos a la izquierda, estas últimas más alejadas (geometría adelantada en revisión de 9.1 a petición del usuario).
- [ ] Mantener las llamaradas fuera de cuadro desde CAM 01, incluida la extensión máxima del efecto; comprobar también el paneo previsto para esa cámara.
- [ ] Usar una presencia mucho menor que en el vídeo, emisiones ocasionales y no sincronizadas, adaptadas al amanecer/atardecer.
- [ ] Añadir GUI para activación, frecuencia e intensidad de llamaradas.

**Resultado:** detalle característico visible al explorar otros encuadres, sin alterar la composición de CAM 01.

### 9.6 · Integración, ajustes y validación final

- [ ] Agrupar controles en «Exterior — Fase 9», con apartados de edificios, tráfico lejano, tráfico cercano y llamaradas; establecer valores iniciales sutiles.
- [ ] Revisar CAM 01 y las vistas afectadas: escala, profundidad, niebla, oclusiones y continuidad de trayectorias.
- [ ] Comprobar el efecto conjunto, conservando el protagonismo de las oficinas y el acabado actual.
- [ ] Comparar coste con la referencia previa a Fase 9 y ajustar geometrías, texturas y luces; registrar resultados por calidad, sin atribuir mejoras no medidas.
- [ ] Guardar capturas, parámetros y límites; trasladar los nuevos recursos a las revisiones finales pendientes de 8.3–8.8.

**Criterio de cierre:** exterior más completo y vivo, sin cortes visibles en las vistas revisadas, efectos regulables e integración sutil. Cada subfase conserva el requisito general de captura y validación visual; una compilación correcta no la cierra por sí sola.

## Criterio de seguimiento

**Referencia de acabado:** [Tyrell · R01 — Contraste equilibrado](docs/acabados/R01/README.md), guardada a petición del usuario, corresponde al estado 4.3_003. No sobrescribir sus parámetros/captura; crear R02 para la siguiente referencia. Registrar una referencia no cierra automáticamente el punto pendiente.

**Requisito del usuario desde 09/09/2026:** al completar cada punto, crear y guardar un pantallazo en `docs/capturas/` con el formato `PUNTO_NNN_AAAA-MM-DD_CAMxx.png` (ejemplo: `4.3_001_2026-09-09_CAM01.png`). NNN es un contador cronológico creciente dentro del punto, incluyendo revisiones; no reiniciarlo ni sobrescribir capturas anteriores. Si se guardan varias cámaras, cada captura recibe el siguiente número. Registrar en `docs/capturas/INDEX.md` fecha/hora, perfil, cámara, calidad, exposición, tipo de captura y estado (propuesta, rechazada o base restaurada). Contrastar con el fotograma antes de marcar completado; si el usuario rechaza el resultado visual, reabrir el punto aunque pasen las pruebas. Las capturas históricas anteriores mantienen sus nombres; cualquier copia al nuevo registro debe indicar su procedencia.

Al terminar cada entrega: actualizar esta lista, anotar archivos relevantes, comprobaciones realizadas, captura comparable cuando exista cambio visual y siguiente tarea. Las decisiones de implementación rutinarias se resuelven durante el trabajo; se consultan los cambios de alcance o de experiencia que lo necesiten.

Documentación técnica consultada: [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer.html), [ReflectorNode](https://threejs.org/docs/pages/ReflectorNode.html), [VolumeNodeMaterial](https://threejs.org/docs/pages/VolumeNodeMaterial.html). Los ejemplos actuales pueden diferir de Three.js 0.182.0; contrastarlos con el código instalado antes de implementar.
