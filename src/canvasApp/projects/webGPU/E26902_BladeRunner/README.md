# Oficinas Tyrell · Visor WebGPU

Fase 1 cerrada; fase 2 iniciada con capturas de referencia exactas de 1920 × 800. El visor carga el GLB completo, conserva sus cámaras y materiales y permite comparar perfiles de resolución. La iluminación es provisional; la fidelidad cinematográfica y el recorrido libre continúan en las siguientes fases de [PLAN.md](PLAN.md).

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

- **Cámara:** diez cámaras del GLB. Inicio en CAM 01; CAM 02 muestra mesa y juntas, CAM 03 los perfiles invertidos y CAM 04 una vista lateral. Son cámaras de Blender pendientes de validar contra los fotogramas.
- **Calidad:** Baja usa resolución interna ×0,75 y sombras 1024; Media ×1 y sombras 2048; Alta ×1,5 y sombras 2048. Son multiplicadores del tamaño CSS, independientes del DPR del equipo. Todos conservan la misma geometría.
- **Encuadre 2,4:1:** activa bandas para mantener el aspecto de referencia. Al desactivarlo se utiliza el contenedor completo y cambia el campo horizontal visible, conservando el FOV vertical.
- **Captura 1920 × 800:** genera un PNG sin interfaz, con encuadre 2,4:1 y la pose/FOV de la cámara seleccionada, incluso si la ventana es pequeña o están desactivadas las bandas. Conserva la calidad de sombras elegida; para comparar imágenes usar siempre la misma calidad (Media como base). Restaura tamaño, calidad y cámara del visor al terminar. El nombre incluye cámara y resolución.
- **Diagnóstico:** muestra y permite descargar JSON con backend, adaptador disponible, cámara, carga y métricas.

Cada cambio de cámara, calidad, tamaño o visibilidad reinicia la medición: 60 fotogramas de calentamiento y ventana móvil de hasta 120 muestras. FPS, media y percentil 95 corresponden a intervalos RAF e incluyen presentación; no miden tiempo GPU. Las llamadas y triángulos del renderer incluyen pasadas adicionales. Las cantidades de geometrías y texturas son contadores, no memoria en bytes. La carga medida incluye descarga y parseo, pero no toda la preparación GPU hasta la primera imagen.

## Archivos y decisiones

| Archivo | Responsabilidad |
| --- | --- |
| `E26902_BladeRunner` | Entrada sin extensión, ciclo del proyecto, luces provisionales, perfiles, captura y métricas |
| `config.js` | Ruta del GLB, cámara inicial, AgX/exposición 1,07 y parámetros artísticos |
| `TyrellAssets.js` | Carga con progreso, errores HTTP/GLB, cancelación y liberación de recursos compartidos |
| `TyrellCameraRig.js` | Pose mundial y FOV de cámaras, escala de visualización de Blender normalizada, resize |
| `TyrellCapture.js` | Captura a resolución fija y restauración del visor; reinicio de métricas tras la captura |
| `TyrellUI.js`, `tyrell.css` | Interfaz de revisión y estados de carga/error |
| `tests/phase1.test.mjs` | Seis comprobaciones de integración y recurso |
| `tests/phase2.test.mjs` | Tres pruebas de captura, conservación del visor y recuperación ante fallos |
| `docs/phase2/CAPTURA_REFERENCIA.md` | Entrega parcial de fase 2 y evidencia para revisión |
| `docs/phase1/VALIDACION.md` | Evidencia y límites de la entrega |
| `docs/phase1/manifest.json` | Procedencia, tamaño y SHA-256 del modelo |

Integración con el andamiaje: `Platform.js` selecciona Tyrell sin cámara de depuración ni GUI; `AppRender.js` aplica la política WebGPU del proyecto y omite el benchmark de arranque; `CanvasApp.js` respeta `debug_mode: false` y cierra su ciclo de vida; `AppDev.js` libera controles. `script.js` evita solicitar un adaptador por separado y evita duplicar las métricas.

El GLB conserva metros y ejes glTF (Y arriba). No se escala la escena para adaptarla a la pantalla. GLTFLoader recupera los materiales PBR y sus mapas. Se usa salida sRGB y AgX; la equivalencia visual con Blender requiere calibración posterior. Los rellenos de área inicializan las texturas LTC para WebGPU. Al cambiar la resolución de sombras se sustituye la luz solar por una copia con la misma transformación y objetivo, nuevo `mapSize` y recursos GPU nuevos; se libera la anterior. La nueva identidad fuerza a regenerar las referencias de los nodos. Redimensionar o destruir sólo el render target activo dejaba la imagen negra en la combinación r182/WebGPU probada.

## Actualizar el modelo

1. Exportar desde el Blender fuente conservando cámaras, materiales, texturas y recursos compartidos.
2. Copiar el resultado a `static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_edited.glb` desde la raíz del repositorio.
3. Obtener tamaño y SHA-256 con `Get-Item` y `Get-FileHash -Algorithm SHA256`.
4. Actualizar `config.js` (`asset` y `assetBytes`) y las expectativas de la prueba de integridad cuando el cambio sea intencionado. El manifiesto de `docs/phase1` es histórico y no debe sobrescribirse.
5. Ejecutar pruebas, compilar, recargar y guardar nuevas capturas y diagnósticos desde las mismas cámaras, resolución y calidad.

La copia actual ocupa 40.549.528 bytes, contiene 25 imágenes, 107 recursos mesh y 10 cámaras. Excluye los objetos ocultos tanto en visor como en render y el volumen `Atmosfera | polvo en haces de luz`, que es exclusivo de Cycles. Esta fase no modifica el `.blend` original.

En Blender: **Archivo > Exportar > glTF 2.0**; usar formato **glTF Binary (.glb)**, activar **Objetos visibles** y **Objetos renderizables**, y conservar **Cámaras**, **Luces**, **Materiales: Exportar**, **Imágenes: Automático**, **UVs**, **Normales**, **Animaciones** y **+Y arriba**. Mantener desactivados **Compresión Draco**, **Tangentes** y **Aplicar modificadores/transformaciones** para reproducir este asset. Antes de exportar, ocultar en visor y render `Atmosfera | polvo en haces de luz`: su material de volumen es exclusivo de Cycles y en glTF se vuelve opaco. Las luces de área no son compatibles directamente con glTF; el proyecto aporta sus rellenos en tiempo de ejecución.

## Próxima entrega

Pausa para revisar [la captura de referencia de fase 2](docs/phase2/CAPTURA_REFERENCIA.md). Después: comparar plano general, mesa y lateral con los renders de Blender; revisar las 18 columnas, juntas y orientaciones, sillas, celosías y edificio exterior. Registrar defectos del modelo antes de calibrar materiales, luz, reflejos y atmósfera.
