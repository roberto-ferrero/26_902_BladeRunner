# Oficinas Tyrell · Visor WebGPU

Fases 1 y 2 cerradas: cámaras, capturas exactas de 1920 × 800 y fidelidad geométrica revisadas. El visor utiliza una copia del GLB con limpieza de índices, conservando posiciones, UV, materiales y cámaras. La iluminación es provisional; materiales, atmósfera y recorrido libre continúan en las siguientes fases de [PLAN.md](PLAN.md). Evidencia y límites en [el cierre de fase 2](docs/phase2/CIERRE.md).

**3.1 completado:** [mapas, canales y conexiones validados](docs/phase3/3.1/MAPAS.md). Las tres imágenes de [referencia de acabado e iluminación](<docs/reference images/README.md>) orientan las próximas entregas. El diagnóstico incluye una auditoría de los mapas realmente cargados, sin modificar los materiales.

**3.2 implementado; 3.3 en revisión:** referencia de color explícita y propuesta de materiales **Tyrell v1**, seleccionada al arrancar. Puede compararse con el export desde **Color y materiales**. [Cambios, previsualizaciones y límites](docs/phase3/3.2-3.3/COLOR_MATERIALES.md).

**3.4 completado:** juntas, desgaste y respuesta de normal del pavimento revisados en WebGPU. [Auditoría, capturas y límites](docs/phase3/3.4/SUELO.md). Motor instalado en esta revisión: Three.js 0.185.1; las primeras fases usaron r182.

**3.5 completado:** se mantienen 19 materiales estándar y uno físico; los nodos propios se reservan para reflejos y volumen. [Decisiones y auditoría reproducible](docs/phase3/3.5/MATERIALES_NODOS.md).

**3.6 completado:** cuatro sillas comparten seis geometrías, seis materiales y doce texturas; identidad y liberación verificadas tras diez ciclos de acabado. **19/19 pruebas correctas.** [Informe y reproducción](docs/phase3/3.6/RECURSOS_COMPARTIDOS.md).

## Ejecutar

Desde la raíz del repositorio, con Node.js 24.14.0 (versión utilizada en la validación):

```powershell
npm ci
npm run dev:local
```

Abrir `http://localhost:8080`. Se requiere un navegador con WebGPU habilitado, contexto seguro (localhost o HTTPS) y GPU compatible. El proyecto solicita alto rendimiento y comprueba el backend efectivo; si no consigue WebGPU muestra un error y permite recargar. El navegador decide el adaptador final.

```powershell
npm run test:tyrell
npm run build
# Comprobación local de dist, si Python está instalado:
python -m http.server 8081 --bind 127.0.0.1 --directory dist
```

Abrir `http://localhost:8081` para producción. Tras una nueva compilación hay que recargar la página. `dist/` sigue copiando todos los recursos de `static/`; su depuración pertenece a la fase 8.

## Controles y medición

- **Color y materiales:** comparar `Importado del GLB` con `Tyrell v1 · en revisión`, variar compensación entre −2 y +2 EV, restablecer 0 EV y activar luz blanca de estudio. La referencia utiliza AgX, salida sRGB y exposición base 1,07. El control **Normal de piedra negra** permite comparar el suelo con y sin relieve, conservando su rugosidad. Las capturas incluyen acabado, luz, EV y estado de la normal en el nombre y mantienen la cámara sin paneo.
- **Paneo con el ratón:** panel plegable con activación, recorrido horizontal/vertical (metros), suavidad (segundos), distancia al punto de mirada y retorno al centro. [Comportamiento y validación](docs/PANEO.md).
- **Cámara:** diez cámaras del GLB. Inicio en CAM 01; CAM 02 muestra mesa y juntas, CAM 03 los perfiles invertidos y CAM 04 una vista lateral. Son cámaras de Blender pendientes de validar contra los fotogramas.
- **Calidad:** Baja usa resolución interna ×0,75 y sombras 1024; Media ×1 y sombras 2048; Alta ×1,5 y sombras 2048. Son multiplicadores del tamaño CSS, independientes del DPR del equipo. Todos conservan la misma geometría.
- **Encuadre 2,4:1:** activa bandas para mantener el aspecto de referencia. Al desactivarlo se utiliza el contenedor completo y cambia el campo horizontal visible, conservando el FOV vertical.
- **Captura 1920 × 800:** genera un PNG sin interfaz, con encuadre 2,4:1 y la pose/FOV de la cámara seleccionada, incluso si la ventana es pequeña o están desactivadas las bandas. Conserva la calidad de sombras elegida; para comparar imágenes usar siempre la misma calidad (Media como base). Restaura tamaño, calidad y cámara del visor al terminar. El nombre incluye cámara y resolución.
- **Diagnóstico:** muestra y permite descargar JSON con backend, adaptador disponible, cámara, carga y métricas. Incluye `materialAudit`: espacios de color, canales, tamaño de imágenes, UV y posibles problemas de conexión. No evalúa por sí solo la fidelidad artística.

Cada cambio de cámara, calidad, tamaño o visibilidad reinicia la medición: 60 fotogramas de calentamiento y ventana móvil de hasta 120 muestras. FPS, media y percentil 95 corresponden a intervalos RAF e incluyen presentación; no miden tiempo GPU. Las llamadas y triángulos del renderer incluyen pasadas adicionales. Las cantidades de geometrías y texturas son contadores, no memoria en bytes. La carga medida incluye descarga y parseo, pero no toda la preparación GPU hasta la primera imagen.

## Archivos y decisiones

| Archivo | Responsabilidad |
| --- | --- |
| `E26902_BladeRunner` | Entrada sin extensión, ciclo del proyecto, luces provisionales, perfiles, captura y métricas |
| `config.js` | Ruta del GLB, cámara inicial, AgX/exposición 1,07 y parámetros artísticos |
| `TyrellAssets.js` | Carga con progreso, errores HTTP/GLB, cancelación y liberación de recursos compartidos |
| `TyrellCameraRig.js` | Pose mundial y FOV de cámaras, escala de visualización de Blender normalizada, resize |
| `TyrellCameraPan.js` | Paneo relativo al ratón, límites, mirada fija y suavizado temporal; referencia independiente para capturas |
| `TyrellLook.js` | Referencia de color/exposición y propuesta reversible de materiales; conserva mapas y recursos compartidos |
| `TyrellCapture.js` | Captura a resolución fija y restauración del visor; reinicio de métricas tras la captura |
| `TyrellUI.js`, `tyrell.css` | Interfaz de revisión y estados de carga/error |
| `tests/phase1.test.mjs` | Seis comprobaciones de integración y recurso |
| `tests/phase2.test.mjs` | Tres pruebas de captura, conservación del visor y recuperación ante fallos |
| `tests/phase2-mesh.test.mjs` | Integridad de atributos/recursos y conservación de caras con área significativa |
| `TyrellMaterialAudit.js` | Inspección de materiales cargados sin modificar texturas ni recursos compartidos |
| `scripts/audit-textures.py`, `scripts/audit-blender-materials.py` | Inspección de píxeles/canales/UV del GLB y conexiones del Blender fuente |
| `tests/phase3-materials.test.mjs` | GLTFLoader real y detección de errores de conexión/UV sin mutaciones |
| `scripts/prepare-phase2.mjs` | Generación determinista de la copia de ejecución, modificando sólo índices |
| `scripts/inspect-surfaces.py` | Auditoría de superficies/contactos y cuatro vistas neutras de Blender |
| `docs/phase2/CIERRE.md` | Cierre, recurso activo, evidencias, reproducción y límites de fase 2 |
| `docs/phase2/CAPTURA_REFERENCIA.md` | Entrega parcial de fase 2 y evidencia para revisión |
| `scripts/audit-model.py` | Auditoría de geometría con Blender en segundo plano, sin guardar los archivos fuente |
| `docs/phase2/FIDELIDAD_MODELO.md` | Columnas, juntas, sillones, celosías y exterior; capturas CAM 01–04 y siguiente revisión |
| `docs/phase1/VALIDACION.md` | Evidencia y límites de la entrega |
| `docs/phase1/manifest.json` | Procedencia, tamaño y SHA-256 del modelo |

Integración con el andamiaje: `Platform.js` selecciona Tyrell sin cámara de depuración ni GUI; `AppRender.js` aplica la política WebGPU del proyecto y omite el benchmark de arranque; `CanvasApp.js` respeta `debug_mode: false` y cierra su ciclo de vida; `AppDev.js` libera controles. `script.js` evita solicitar un adaptador por separado y evita duplicar las métricas.

El GLB conserva metros y ejes glTF (Y arriba). No se escala la escena para adaptarla a la pantalla. GLTFLoader recupera los materiales PBR y sus mapas. Se usa salida sRGB y AgX; la equivalencia visual con Blender requiere calibración posterior. Los rellenos de área inicializan las texturas LTC para WebGPU. Al cambiar la resolución de sombras se sustituye la luz solar por una copia con la misma transformación y objetivo, nuevo `mapSize` y recursos GPU nuevos; se libera la anterior. La nueva identidad fuerza a regenerar las referencias de los nodos. Redimensionar o destruir sólo el render target activo dejaba la imagen negra en la combinación r182/WebGPU probada.

## Actualizar el modelo

1. Exportar desde el Blender fuente conservando cámaras, materiales, texturas y recursos compartidos.
2. Copiar el resultado a `static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_edited.glb` desde la raíz del repositorio.
3. Ejecutar `node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/prepare-phase2.mjs`. Genera `_phase2.glb` y `docs/phase2/surfaces/cleanup.json`; no modifica el export `_edited.glb`. Revisar el informe y las vistas neutras: la corrección presupone que las normales exportadas expresan la orientación deseada de la superficie.
4. Obtener tamaño y SHA-256, actualizar `config.js` (`asset`, revisión de caché y `assetBytes`) y las expectativas de las pruebas sólo cuando el cambio sea intencionado. El manifiesto de `docs/phase1` y las evidencias de entregas anteriores son históricas.
5. Repetir las auditorías indicadas en el cierre de fase 2, ejecutar pruebas, compilar, recargar y guardar nuevas capturas y diagnósticos desde las mismas cámaras, resolución y calidad.

La copia activa `_phase2.glb` ocupa **40.552.456 bytes**, contiene 25 imágenes, 107 recursos mesh, 10 cámaras y **339.381 triángulos contando instancias**. Procede del export `_edited.glb` de 40.549.528 bytes. La pequeña diferencia de tamaño se debe a índices separados para primitivas que requieren distinta orientación; no se ha compactado el binario. Excluye los objetos ocultos tanto en visor como en render y el volumen `Atmosfera | polvo en haces de luz`, exclusivo de Cycles. El `.blend` original y el export de entrada se conservan intactos.

En Blender: **Archivo > Exportar > glTF 2.0**; usar formato **glTF Binary (.glb)**, activar **Objetos visibles** y **Objetos renderizables**, y conservar **Cámaras**, **Luces**, **Materiales: Exportar**, **Imágenes: Automático**, **UVs**, **Normales**, **Animaciones** y **+Y arriba**. Mantener desactivados **Compresión Draco**, **Tangentes** y **Aplicar modificadores/transformaciones** para reproducir este asset. Antes de exportar, ocultar en visor y render `Atmosfera | polvo en haces de luz`: su material de volumen es exclusivo de Cycles y en glTF se vuelve opaco. Las luces de área no son compatibles directamente con glTF; el proyecto aporta sus rellenos en tiempo de ejecución.

## Próxima entrega

Revisar [la propuesta de 3.2–3.3](docs/phase3/3.2-3.3/COLOR_MATERIALES.md) en WebGPU desde CAM 01/02/04, a 0 EV, alternando acabado importado/Tyrell v1 y luz de escena/estudio. **3.3 permanece abierto hasta esa comprobación visual.** 3.4 ya está revisado y documentado. 3.5 completado: estrategia de materiales y adaptación WebGPU verificadas. 3.6 completado: recursos compartidos y liberación comprobados. Siguiente entrega: **terminar 3.3**, revisión general de acabados y UV pendientes, antes de iniciar iluminación en 4.1.
