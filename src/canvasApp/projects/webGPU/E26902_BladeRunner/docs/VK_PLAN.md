# Voight-Kampff — plan de integración, animación y rendimiento

Fecha: 22-09-2026. Estado: **primera integración funcional implementada; acabado y validación ampliada en curso**.

## Resultado previsto

Incorporar el dispositivo en la colocación elegida en el auxiliar, con acabado
fotorealista adecuado al primer plano de `p1`. Comienza cerrado. Se despliega al
terminar el travelling a `p1`, enciende una óptica rojiza con halo suave e inicia
la respiración del fuelle. Un botón de GUI permite desplegarlo y replegarlo.
Durante el plano de detalle se reduce el coste de efectos que no contribuyan a
la imagen, recuperando su funcionamiento al salir del plano.

Ejecución iniciada el 22-09-2026. Registro reproducible, capturas y límites actuales en [VK_IMPLEMENTACION.md](VK_IMPLEMENTACION.md).

## Base comprobada

- Colocación autoritativa: `_Blender/20260914_BladeRunner_AUXILIAR.blend`, objeto
  `VK_Referencia`, respecto a la raíz del espacio de trabajo.
- Transformación leída el 22-09-2026, ejes Blender: posición
  `(-0.8259305954, 9.9775047302, 0.7515769005)` m; rotación XYZ
  `(0, 0, -2.3124256134)` rad; escala **`(1, 1, 1)`**. Esta anotación es una
  instantánea; al implementar se leerá de nuevo el archivo guardado.
- Cámaras y colocación sincronizadas desde el mismo auxiliar guardado, con hash de procedencia común. Se conserva la configuración manual del travelling.
- Recurso preparado: `_Blender/VK Device/VK Device.parts.glb`; 15 mallas,
  14.891 triángulos, 4 imágenes incrustadas de 4096², unos 23,5 MB de archivo.
  El tamaño del archivo no representa la memoria de texturas en GPU.
- La copia mecánica derivada conserva 14.891 triángulos en 16 mallas; separa tapa y faldón, articula cuatro placas rígidas y deforma cuatro cables. El alojamiento trasero se ha adaptado en esta copia. El original y el auxiliar permanecen intactos.
- `TyrellCameraRig` interpola el recorrido; al terminar pone `transition = null`.
  `activeCameraStateId` cambia **al iniciar** el recorrido: no sirve por sí solo
  para disparar el despliegue al llegar.
- Ya existen bloom HDR, reflejo planar del suelo con caché adaptativa y una sonda
  local para metales/vidrio. La sonda actual selecciona materiales por nombre;
  el material del VK no entra automáticamente en esa selección.
- Tráfico, llamaradas, iluminación y volumen pueden invalidar reflejos durante
  cada actualización. Congelar solo la animación visible del fondo no garantiza
  que cesen sus capturas auxiliares.

## Comportamiento propuesto

Se toma «luz rojiza en la cámara» como la óptica del propio dispositivo.

- Estado inicial **cerrado y apagado**, aplicado antes de hacerlo visible.
- GUI: sección «Voight-Kampff», un botón contextual «Desplegar» / «Replegar» y
  estado legible. Durante la maniobra se desactiva el botón en la primera versión
  para evitar órdenes superpuestas; mostrar «Desplegando…» / «Replegando…».
- Opción «Desplegar al llegar a p1», inicialmente activa. Propuesta: una sola
  activación automática por sesión, sin anular una intervención manual.
- Activación tras llegada confirmada a `p1` y una breve estabilización configurable
  (punto de partida: 0,3 s), con el recurso listo. No usar un temporizador basado
  en la duración nominal del travelling.
- Cambio de destino o cancelación antes de llegar: cancelar el disparo pendiente.
  Contemplar también transiciones instantáneas y movimiento reducido.
- Despliegue: secuencia coordinada de mástil, extensión y cabezal, calibrada con
  los vídeos; óptica encendida progresivamente al quedar operativa y fuelle en marcha.
- Repliegue: detener suavemente el fuelle, apagar la óptica y recoger los mecanismos
  con el orden adecuado. No asumir que invertir los tiempos garantiza el encaje.
- Salir de `p1` restaura el perfil de efectos. No recoge automáticamente la máquina
  ni borra su estado; el botón conserva el control explícito del usuario.

## VK-01 · Fijar colocación, encuadre y línea base

- [x] Leer `VK_Referencia.matrix_world` del auxiliar y generar un archivo de
  transformación reproducible, con ruta y hash de procedencia.
- [x] Convertir Blender Z-up a Three.js Y-up mediante `C × M × C⁻¹`; aplicar la
  matriz a un contenedor exterior a `VK_Root`, conservando escala 1 y pivotes.
- [x] Actualizar `p1` con el flujo existente de exportación de cámaras desde ese
  mismo auxiliar, sin perder los ajustes manuales del recorrido.
- [ ] Revisar encuadre cerrado, desplegado y durante la trayectoria, incluidos
  paneo, formatos de pantalla y proximidad a mesa/otros objetos. No recolocar el
  dispositivo para compensar un encuadre: registrar cualquier ajuste necesario.
- [ ] Capturar y medir el proyecto actual en `initial`, travelling y `p1` antes
  de integrar el recurso; anotar equipo, navegador, resolución, DPR y calidad.

**Cierre:** transformación coincidente con el auxiliar y línea base reproducible.

## VK-02 · Terminar la mecánica en un visor de prueba

- [ ] Calibrar pose cerrada, ángulo de abatimiento, recorrido telescópico y giro
  del cabezal utilizando los vídeos de despliegue y repliegue.
- [ ] Verificar encaje en el alojamiento y ausencia de intersecciones visibles
  en ambos extremos y a lo largo de la maniobra.
- [x] Separar la tapa rígida de la parte flexible que aún comparte geometría;
  refinar el fuelle para que respire sin aplastar el grosor de las piezas rígidas.
- [x] Hacer que los cuatro cables sigan sus anclajes con una deformación ligera
  —huesos o morphs según la prueba—; evitar simulación física continua.
- [x] Definir un controlador determinista, con estados cerrado, desplegando,
  operativo y replegando. Interpolar respecto a transformaciones originales,
  sin acumular errores ni depender de los FPS.
- [x] Separar progreso de apertura y ciclo respiratorio. Gestionar pausa de
  pestaña y reanudación sin saltos ni avance por tiempo oculto.

**Cierre:** ciclos completos en Three.js sin penetraciones visibles, deriva de
posición ni cables desconectados. Modelo maestro y exportación verificables.

## VK-03 · Integración estática y acabado fotorealista

- [x] Incorporar un GLB independiente en `static/glbs/E26902_BladeRunner/`, con
  carga, errores y liberación de recursos integrados en el ciclo del proyecto.
- [ ] Calibrar en `p1` pintura, metal, caucho, cristal, normal y rugosidad bajo la
  iluminación/exposición de la sala. Priorizar lectura de superficies y contacto
  con la mesa; evitar apariencia cromada o de plástico por exceso de brillo.
- [x] Mantener los mapas compartidos y el despiece móvil. Aislar el material de
  la óptica para encenderla sin teñir toda la máquina ni duplicar sus texturas.
- [ ] Evaluar sombras de contacto: chasis estable y mecanismos móviles solo
  donde aporten detalle visible, midiendo el coste de sus pasadas de sombra.
- [x] Reutilizar la sonda de entorno existente para los materiales pertinentes
  del VK mediante registro explícito; evitar otra captura cúbica cada fotograma.
- [ ] Comparar texturas 4K y 2K desde `p1`; conservar resolución según el detalle
  visible. Probar KTX2/Basis únicamente si aporta una mejora medida y su soporte
  de carga se integra correctamente. Mantener el original de alta calidad.
- [ ] Contabilizar draw calls y memoria: las 15 mallas son una base razonable,
  no un número final garantizado por las pasadas de sombra/reflexión. No fusionar
  partes móviles ni aplicar una reducción geométrica que perjudique la silueta.
- [ ] Precalentar recursos/materiales antes de la llegada a `p1`, para evitar
  decodificación o compilación en el instante del despliegue.

**Cierre:** capturas de detalle aprobables y coste del dispositivo estático medido
por separado, conservando exactamente la colocación del usuario.

## VK-04 · GUI y llegada a p1

- [x] Añadir botón y estado en `TyrellUI`, conectados al mismo controlador que
  usará la activación automática.
- [x] Añadir una señal inequívoca de llegada en `TyrellCameraRig`, o detectar el
  fin de la transición con identificador de recorrido y destino confirmado.
- [x] Implementar la opción de activación automática y la estabilización,
  cancelables al cambiar de destino y condicionadas a la carga del dispositivo.
- [ ] Comprobar doble pulsación, regreso a `p1`, transición instantánea, cámara
  libre, recurso fallido y cambio de cámara durante la maniobra.

**Cierre:** ninguna apertura prematura o duplicada; la GUI refleja el estado real.

## VK-05 · Óptica roja y halo

- [x] Aplicar emisión HDR localizada en la óptica, con encendido y apagado suaves
  coordinados con la maniobra. Mantener rojo legible sin quemarlo a blanco.
- [x] Aprovechar el bloom existente y calibrar intensidad/radio desde `p1` sin
  alterar el umbral global para hacer brillar un único objeto.
- [ ] Si bloom está desactivado o su coste es excesivo en un perfil, comparar un
  pequeño halo local con prueba de profundidad y tamaño limitado; no añadir otra
  cadena de posprocesado completa solo para la óptica.
- [ ] Añadir una luz local sin sombras únicamente si el ligero rebote rojo sobre
  piezas próximas mejora de forma visible el plano; emisión y glow no equivalen
  por sí solos a iluminar otros objetos.
- [ ] Verificar oclusión, vistas laterales y estado cerrado: el halo no debe verse
  a través del chasis ni quedar flotando al recoger el cabezal.

**Cierre:** luz integrada en el material, halo contenido y coste incremental medido.

## VK-06 · Perfil temporal de rendimiento para p1

- [ ] Construir una tabla de contribuciones desde el `p1` sincronizado y todo su
  paneo permitido: visibilidad directa, reflejos y sombras. «Detrás de cámara»
  no basta para decidir que una contribución es prescindible.
- [ ] Probar primero el suelo: omitir su pasada de reflexión si realmente no
  contribuye al plano. Si permanece visible, conservarla o ajustar su resolución/
  cadencia; no reutilizar imágenes del espejo con una cámara en movimiento.
- [ ] Mantener un entorno útil para el metal del VK; congelar la sonda local si
  sus fuentes no cambian de forma apreciable. No actualizar seis caras por cada
  movimiento del fuelle o de la óptica.
- [ ] Suspender o reducir actualizaciones de tráfico, llamaradas y volúmenes
  únicamente donde la revisión confirme ausencia de contribución relevante.
  Cortar también sus invalidaciones de reflejos y trabajo auxiliar innecesario.
- [ ] Aplicar el perfil mediante estado efectivo temporal, separado de las
  preferencias GUI. Al salir de `p1`, recuperar la configuración deseada actual,
  incluidas las decisiones que el usuario haya cambiado durante ese plano.
- [ ] Preparar el refresco necesario antes de volver a mostrar un efecto para
  evitar reflejos obsoletos, cambios bruscos o picos al salir del primer plano.
- [ ] Evitar reconstruir materiales, recompilar shaders o crear/destruir render
  targets en cada cambio de estado. Calentar las variantes necesarias y medir
  también el primer uso; el `setEnabled` actual del suelo marca `needsUpdate`.
- [ ] Suspender respiración/trabajo del dispositivo fuera de vista solo cuando
  tampoco aporte a reflejos; conservar fase y estado para una reanudación suave.

**Cierre:** mejora medida en `p1`, continuidad visual durante entrada/salida y
restauración correcta tras cambiar cámara, calidad, GUI o modo de navegación.

## VK-07 · Validación visual y de rendimiento

- [ ] Comparar cuatro casos a igual encuadre y configuración: base sin VK;
  VK estático; VK animado + óptica; lo anterior con el perfil temporal de `p1`.
- [ ] Medir tiempo de fotograma medio y p95, picos de entrada/salida, memoria,
  draw calls y frecuencia de capturas de suelo/sonda. Separar, cuando sea posible,
  medición CPU/GPU; documentar las limitaciones del navegador.
- [ ] Repetir ciclos de despliegue, repliegue y navegación para detectar deriva,
  crecimiento de memoria, recursos sin liberar y estados que no se restauran.
- [ ] Verificar `initial`, travelling, `p1`, salida, cámara libre, redimensionado,
  captura de imagen y pestaña oculta. Revisar calidades Baja, Media y Alta.
- [ ] Ejecutar pruebas de lógica de estados/cancelación/restauración, validación
  del recurso y compilación. La prueba en navegador es obligatoria para cerrar.
- [ ] Archivar capturas comparables, configuración y métricas; actualizar casillas
  solo para tareas comprobadas y separar validación técnica de revisión artística.

**Objetivo inicial propuesto, pendiente de confirmar con el equipo de referencia:**
60 FPS (16,7 ms/fotograma), con p95 próximo o inferior a ese presupuesto, a
1920 × 800 y DPR 1. Medir también la resolución habitual del usuario. No prometer
este resultado antes de medir la escena base. Como presupuesto provisional del
VK, intentar un incremento p95 ≤ 2 ms respecto a la misma escena sin dispositivo;
medir su coste antes de descontar los ahorros del perfil de detalle.

## Puntos de integración previstos

| Archivo/componente | Responsabilidad |
|---|---|
| `E26902_BladeRunner` | Carga, ciclo de vida, actualización y coordinación |
| Nuevo `TyrellVKDevice` | Jerarquía, estados, respiración, óptica y diagnóstico |
| Configuración/datos VK generados | Transformación del auxiliar y parámetros |
| `TyrellCameraRig` | Llegada confirmada/cancelación de transición |
| `TyrellUI` | Botón, estado y activación al llegar |
| `TyrellFloorReflection` / `TyrellReflectionUpdates` | Coste y vigencia del espejo |
| `TyrellSpecularEnvironment` | Registro del VK y cadencia de capturas |
| `TyrellPostProcessing` | Bloom existente y comparación del halo |
| Perfil temporal de efectos | Preferencias frente a ejecución efectiva en p1 |

Primera entrega ejecutada: colocación sincronizada, mecánica en visor, integración en sala, GUI, llegada a p1, óptica y primera reducción de coste. Las casillas pendientes conservan las revisiones artísticas y mediciones que todavía faltan; ninguna fase completa se da por aprobada únicamente por disponer de una primera implementación.
