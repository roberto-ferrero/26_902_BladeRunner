# Oficinas Tyrell · Visor WebGPU

Fase 1: base técnica de la escena. El visor carga el GLB completo, conserva sus cámaras y materiales y permite comparar perfiles de resolución. La iluminación es provisional; la fidelidad cinematográfica y el recorrido libre continúan en las siguientes fases de [PLAN.md](PLAN.md).

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
- **Captura:** prepara un PNG del lienzo, sin interfaz, y ofrece su descarga.
- **Diagnóstico:** muestra y permite descargar JSON con backend, adaptador disponible, cámara, carga y métricas.

Cada cambio de cámara, calidad, tamaño o visibilidad reinicia la medición: 60 fotogramas de calentamiento y ventana móvil de hasta 120 muestras. FPS, media y percentil 95 corresponden a intervalos RAF e incluyen presentación; no miden tiempo GPU. Las llamadas y triángulos del renderer incluyen pasadas adicionales. Las cantidades de geometrías y texturas son contadores, no memoria en bytes. La carga medida incluye descarga y parseo, pero no toda la preparación GPU hasta la primera imagen.

## Archivos y decisiones

| Archivo | Responsabilidad |
| --- | --- |
| `E26902_BladeRunner` | Entrada sin extensión, ciclo del proyecto, luces provisionales, perfiles, captura y métricas |
| `config.js` | Ruta del GLB, cámara inicial, AgX/exposición 1,07 y parámetros artísticos |
| `TyrellAssets.js` | Carga con progreso, errores HTTP/GLB, cancelación y liberación de recursos compartidos |
| `TyrellCameraRig.js` | Pose mundial y FOV de cámaras, escala de visualización de Blender normalizada, resize |
| `TyrellUI.js`, `tyrell.css` | Interfaz de revisión y estados de carga/error |
| `tests/phase1.test.mjs` | Seis comprobaciones de integración y recurso |
| `docs/phase1/VALIDACION.md` | Evidencia y límites de la entrega |
| `docs/phase1/manifest.json` | Procedencia, tamaño y SHA-256 del modelo |

Integración con el andamiaje: `Platform.js` selecciona Tyrell sin cámara de depuración ni GUI; `AppRender.js` aplica la política WebGPU del proyecto y omite el benchmark de arranque; `CanvasApp.js` respeta `debug_mode: false` y cierra su ciclo de vida; `AppDev.js` libera controles. `script.js` evita solicitar un adaptador por separado y evita duplicar las métricas.

El GLB conserva metros y ejes glTF (Y arriba). No se escala la escena para adaptarla a la pantalla. GLTFLoader recupera los materiales PBR y sus mapas. Se usa salida sRGB y AgX; la equivalencia visual con Blender requiere calibración posterior. Los rellenos de área inicializan las texturas LTC para WebGPU. Al cambiar la resolución de sombras se sustituye la luz solar por una copia con la misma transformación y objetivo, nuevo `mapSize` y recursos GPU nuevos; se libera la anterior. La nueva identidad fuerza a regenerar las referencias de los nodos. Redimensionar o destruir sólo el render target activo dejaba la imagen negra en la combinación r182/WebGPU probada.

## Actualizar el modelo

1. Exportar desde el Blender fuente conservando cámaras, materiales, texturas y recursos compartidos.
2. Copiar el resultado a `static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb` desde la raíz del repositorio.
3. Obtener tamaño y SHA-256 con `Get-Item` y `Get-FileHash -Algorithm SHA256`.
4. Actualizar `config.js` (`assetBytes`), el manifiesto y las expectativas de la prueba de integridad cuando el cambio sea intencionado.
5. Ejecutar pruebas, compilar, recargar y guardar nuevas capturas y diagnósticos desde las mismas cámaras, resolución y calidad.

La copia actual ocupa 56.526.524 bytes, contiene 25 imágenes, 117 recursos mesh y 10 cámaras. Los 378.164 triángulos de la escena incluyen repeticiones. Esta fase no modifica el `.blend` original.

## Próxima entrega

Fase 2: comparar plano general, mesa y lateral con los renders de Blender; revisar las 18 columnas, juntas y orientaciones, sillas, celosías y edificio exterior. Fijar encuadres y registrar defectos del modelo antes de calibrar materiales, luz, reflejos y atmósfera.
