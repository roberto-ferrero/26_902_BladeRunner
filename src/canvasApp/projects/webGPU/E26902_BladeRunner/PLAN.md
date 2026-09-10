# E26902 Blade Runner · Plan de trabajo

Ajustes de arranque solicitados el 10-09-2026: calidad Media; bloom, color cinematográfico, profundidad exterior, bruma interior, haces y ambos reflejos activos. Paneo H/V 1,1 m, suavidad 0,75 s. FPS visibles incluso con GUI oculta. Esta preferencia sustituye las notas históricas de arranque sin efectos ; 6.5 queda documentado más abajo.

Estado: **Fase 6 ejecutada y documentada**. 6.5 incorpora comparación exportable y nueve mediciones controladas; 6.6 mantiene la imagen limpia sin grano, viñeta ni desenfoque adicional tras valorar las referencias. 41 pruebas correctas. [Comparación](docs/phase6/6.5/COMPARACION.md) y [criterio de acabado](docs/phase6/6.6/CRITERIO.md). Siguiente punto: **7.1 · Navegación: recorrido libre y cámaras de la película**, según la elección del usuario.

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

## 7 · Navegación y presentación

- [ ] **7.1** Aplicar la elección del usuario: cámaras fijas, recorridos o movimiento libre.
- [ ] **7.2** Añadir transiciones y restauración del encuadre de referencia.
- [ ] **7.3** Revisar al aproximarse las UV colapsadas de Table_Slab y Wall_Side_L documentadas en el cierre de fase 3. Si hay recorrido libre, mantener altura y velocidad coherentes con la escala e impedir atravesar paredes y muebles con colisiones simplificadas.
- [ ] **7.4** Resolver redimensionado, foco del teclado/ratón, pausa al ocultar la pestaña y dispositivos objetivo.
- [ ] **7.5** Separar los controles de revisión técnica de la experiencia final.

- [x] **7.6** Adelanto solicitado durante 3.1: paneo con el ratón, mirada fija, recorridos y suavidad configurables, retorno al centro y captura sin paneo. Pruebas automatizadas correctas; **revisión visual pendiente por falta de navegador conectado**. Detalles en [PANEO.md](docs/PANEO.md).

**Resultado comprobable:** navegación cómoda y estable sin perder acceso a las cámaras de comparación.

## 8 · Optimización y entrega

La medición comienza en la fase 1; esta fase reúne los ajustes finales cuando ya se conoce el coste y la aportación visual de cada efecto.

- [ ] **8.1** Medir tiempo de CPU y GPU, fluidez, memoria, carga inicial y llamadas de dibujo en el dispositivo acordado.
- [ ] **8.2** Ajustar resolución interna, sombras, reflejos y muestras del volumen antes de reducir geometría que define la silueta.
- [ ] **8.3** Evaluar Meshopt/Draco y KTX2/Basis con sus decodificadores y comprobar que no dañen juntas, normales, cuero o degradados del cielo.
- [ ] **8.4** Revisar culling, instancias y agrupaciones sin perder control de materiales ni iluminación.
- [ ] **8.5** Acotar los recursos copiados a producción: el andamiaje copia actualmente ejemplos ajenos y archivos fuente `.psd`, `.blend` y `.blend1` desde `static/`. Conservar esos originales y excluirlos de la entrega de Tyrell cuando no sean necesarios.
- [ ] **8.6** Establecer perfiles de calidad medidos; comprobarlos siempre desde las mismas cámaras.
- [ ] **8.7** Compilar producción y probar carga, errores, redimensionado y liberación de recursos.
- [ ] **8.8** Documentar recursos, parámetros artísticos, capturas finales, dispositivos probados y diferencias conocidas frente a Blender.

**Resultado comprobable:** compilación reproducible, versión WebGPU probada en los dispositivos acordados y comparaciones visuales y de rendimiento registradas.

## Criterio de seguimiento

**Referencia de acabado:** [Tyrell · R01 — Contraste equilibrado](docs/acabados/R01/README.md), guardada a petición del usuario, corresponde al estado 4.3_003. No sobrescribir sus parámetros/captura; crear R02 para la siguiente referencia. Registrar una referencia no cierra automáticamente el punto pendiente.

**Requisito del usuario desde 09/09/2026:** al completar cada punto, crear y guardar un pantallazo en `docs/capturas/` con el formato `PUNTO_NNN_AAAA-MM-DD_CAMxx.png` (ejemplo: `4.3_001_2026-09-09_CAM01.png`). NNN es un contador cronológico creciente dentro del punto, incluyendo revisiones; no reiniciarlo ni sobrescribir capturas anteriores. Si se guardan varias cámaras, cada captura recibe el siguiente número. Registrar en `docs/capturas/INDEX.md` fecha/hora, perfil, cámara, calidad, exposición, tipo de captura y estado (propuesta, rechazada o base restaurada). Contrastar con el fotograma antes de marcar completado; si el usuario rechaza el resultado visual, reabrir el punto aunque pasen las pruebas. Las capturas históricas anteriores mantienen sus nombres; cualquier copia al nuevo registro debe indicar su procedencia.

Al terminar cada entrega: actualizar esta lista, anotar archivos relevantes, comprobaciones realizadas, captura comparable cuando exista cambio visual y siguiente tarea. Las decisiones de implementación rutinarias se resuelven durante el trabajo; se consultan los cambios de alcance o de experiencia que lo necesiten.

Documentación técnica consultada: [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer.html), [ReflectorNode](https://threejs.org/docs/pages/ReflectorNode.html), [VolumeNodeMaterial](https://threejs.org/docs/pages/VolumeNodeMaterial.html). Los ejemplos actuales pueden diferir de Three.js 0.182.0; contrastarlos con el código instalado antes de implementar.
