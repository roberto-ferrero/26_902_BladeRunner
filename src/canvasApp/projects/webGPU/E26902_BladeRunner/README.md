# Oficinas Tyrell · Visor WebGPU

Fases 1, 2 y 3 completadas, y de la fase 4 siete de sus ocho puntos. El visor carga el GLB completo, conserva sus cámaras y materiales, ofrece un encuadre de comparación fijo de 1920 × 800, aplica la misma gestión de color con la que se renderizaron las referencias y monta el equipo de luces leído del `.blend` maestro. La iluminación indirecta, los reflejos, la atmósfera y el recorrido libre continúan en [PLAN.md](PLAN.md).

El objetivo de atmósfera e iluminación son los fotogramas de [`movie_screenshots/`](movie_screenshots), leídos en [docs/REFERENCIAS.md](docs/REFERENCIAS.md). Los renders de Blender mandan en la forma y el encuadre.

## Ejecutar

Desde la raíz del repositorio, con Node.js 24.14.0 (versión utilizada en la validación):

```powershell
npm ci
npm run dev:local
```

Abrir `http://localhost:8080`. Se requiere un navegador con WebGPU habilitado, contexto seguro (localhost o HTTPS) y GPU compatible. El proyecto solicita alto rendimiento y comprueba el backend efectivo; si no consigue WebGPU muestra un error y permite recargar. El navegador decide el adaptador final.

```powershell
npm run test:tyrell       # 29 pruebas de las fases 1 a 4
npm run tyrell:audit      # auditoría geométrica, escribe docs/phase2/auditoria.json
npm run tyrell:materials  # auditoría de materiales y mapas, escribe docs/phase3/materiales.json
npm run tyrell:color      # compara el mapeo tonal con el de Blender, ya medido
npm run tyrell:lights     # confronta el equipo de luces del maestro con el del GLB
npm run build
npm run tyrell:capture    # sirve dist, abre Chrome y guarda capturas y diagnósticos
npm run tyrell:compare    # compara las capturas con los renders de Blender y saca recortes
npm run tyrell:indirect   # ordena las opciones de luz indirecta ya capturadas
# Comprobación manual de dist, si Python está instalado:
python -m http.server 8081 --bind 127.0.0.1 --directory dist
```

`tyrell:capture` acepta `--window 1024x640`, `--port 8099`, `--out <carpeta>`, `--prefix <nombre>`, `--look on|off`, `--eval "<js>"` para un experimento puntual sobre la escena y `--keep` para dejar el navegador abierto. Abre una ventana real porque WebGPU necesita un adaptador de verdad; usa `CHROME_PATH` si Chrome no está en la ruta habitual. Antes de medir recorre las tres cámaras para que la primera no pague la creación de tuberías.

`tyrell:lights` y `tyrell:color` sólo leen medidas ya tomadas. Para rehacerlas hace falta Blender:

```powershell
$blender = "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe"
$script  = "src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/blender/medir_agx.py"
& $blender --background --factory-startup --python $script -- "src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase3"

# El equipo de luces se lee del maestro, que sí lleva las cuatro luces de área que el GLB no exporta.
$luces = "src/canvasApp/projects/webGPU/E26902_BladeRunner/tools/blender/leer_luces.py"
& $blender --background --factory-startup "../../_Blender/BladeRunner_5_6_High_v3.blend" `
  --python $luces -- "src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase4"
```

Abrir `http://localhost:8081` para producción. Tras una nueva compilación hay que recargar la página. `dist/` sigue copiando todos los recursos de `static/`; su depuración pertenece a la fase 8.

## Controles y medición

- **Cámara:** diez cámaras del GLB. Inicio en CAM 01; CAM 02 muestra mesa y juntas, CAM 03 los perfiles invertidos y CAM 04 una vista lateral. Son cámaras de Blender pendientes de validar contra los fotogramas.
- **Calidad:** Baja usa resolución interna ×0,75 y sombras 1024; Media ×1 y sombras 2048; Alta ×1,5 y sombras 2048. Son multiplicadores del tamaño CSS, independientes del DPR del equipo. Todos conservan la misma geometría.
- **Encuadre 2,4:1:** activa bandas para mantener el aspecto de referencia. Al desactivarlo se utiliza el contenedor completo y cambia el campo horizontal visible, conservando el FOV vertical.
- **Comparación 1920 × 800:** clava el destino de render en ese tamaño con relación de píxel 1, sea cual sea la ventana, y bloquea la casilla de encuadre porque 1920 × 800 ya es 2,4:1. Es el tamaño con el que Blender renderizó `v3_general.png` y `v3_detalle.png`. Mientras está activo, el perfil de calidad sigue mandando en las sombras pero deja de mandar en la resolución interna.
- **Look AgX de Blender:** activo por defecto. Añade a AgX el aspecto «AgX - Medium High Contrast» con el que se renderizaron las referencias, que Three.js no trae. Al desactivarlo queda AgX base, lo que abre las sombras un 64 % de más a −6 EV. Es un cambio de uniforme, así que no recompila ningún shader.
- **Indirecta:** cuatro opciones para comparar la luz rebotada, que Blender traza y el visor no puede. Ninguna, el mundo de Blender como ambiente, el mundo como entorno, y la sonda capturada de la propia sala. Se entrega la última, que es la única que levanta de verdad las zonas de sombra. Cambiar de opción reconstruye el entorno.
- **Captura:** prepara un PNG del lienzo, sin interfaz, y ofrece su descarga. El nombre recoge cámara, calidad, modo y resolución.
- **Diagnóstico:** muestra y permite descargar JSON con backend, adaptador disponible, cámara, carga, modo de comparación, resolución de sombras y métricas.

Cada cambio de cámara, calidad, tamaño o visibilidad reinicia la medición: 60 fotogramas de calentamiento y ventana móvil de hasta 120 muestras. FPS, media y percentil 95 corresponden a intervalos RAF e incluyen presentación; no miden tiempo GPU. Las llamadas y triángulos del renderer incluyen pasadas adicionales. Las cantidades de geometrías y texturas son contadores, no memoria en bytes. La carga medida incluye descarga y parseo, pero no toda la preparación GPU hasta la primera imagen.

## Archivos y decisiones

| Archivo | Responsabilidad |
| --- | --- |
| `E26902_BladeRunner` | Entrada sin extensión, ciclo del proyecto, perfiles, captura y métricas |
| `config.js` | Ruta del GLB, cámara inicial, exposición 1,0718, constantes del aspecto AgX, grosor de la cristalería y parámetros artísticos |
| `TyrellAssets.js` | Carga con progreso, errores HTTP/GLB, cancelación y liberación de recursos compartidos |
| `TyrellCameraRig.js` | Pose mundial y FOV de cámaras, escala de visualización de Blender normalizada, resize |
| `TyrellUI.js`, `tyrell.css` | Interfaz de revisión y estados de carga/error |
| `tests/phase1.test.mjs` … `tests/phase4.test.mjs` | Veintinueve comprobaciones de integración, recurso, encuadre, curva de tono, materiales, luces y superficies |
| `tools/auditar-modelo.mjs` | Auditoría geométrica del GLB sin DOM: columnas, juntas, perfiles, sillas, celosías, exterior, normales, tangentes, escalas, transparencias y contactos |
| `tools/capturar-comparacion.mjs` | Sirve `dist`, abre Chrome por el protocolo de depuración y guarda capturas y diagnósticos desde las cámaras de comparación |
| `TyrellToneMapping.js` | AgX con el aspecto de Blender, y su gemelo escalar para comprobarlo sin GPU |
| `tools/auditar-materiales.mjs` | Materiales, texturas, espacio de color de cada ranura y contenido real de cada mapa |
| `tools/calibrar-color.mjs`, `tools/blender/medir_agx.py` | Miden la curva de Blender y ajustan el aspecto contra ella |
| `tools/comparar-render.mjs` | Compara capturas con los renders de Blender por regiones y escribe recortes lado a lado |
| `TyrellLighting.js` | Equipo de luces del maestro, colores lineales, ajuste del frustum de sombra y las cuatro opciones de luz indirecta |
| `TyrellSurfaces.js` | Mide si cada superficie es cerrada y descarta caras traseras sólo donde es seguro |
| `tools/blender/leer_luces.py`, `tools/verificar-luces.mjs` | Leen el equipo real del `.blend` y derivan lo que Three necesita |
| `tools/comparar-indirecta.mjs` | Ordena las opciones de luz indirecta por lo que consiguen en las zonas de sombra |
| `tools/lib/png.mjs`, `tools/lib/regiones.mjs` | Utilidades de PNG y las regiones de medida que comparten las herramientas |
| `docs/REFERENCIAS.md` | Lectura de los fotogramas de la película y reparto por fases |
| `docs/phase1/`, `docs/phase2/`, `docs/phase3/` | Evidencia y límites de cada entrega |
| `docs/phase1/manifest.json` | Procedencia, tamaño y SHA-256 del modelo |
| `docs/phase2/auditoria.json` | Salida completa de la auditoría del modelo |

Integración con el andamiaje: `Platform.js` selecciona Tyrell sin cámara de depuración ni GUI; `AppRender.js` aplica la política WebGPU del proyecto y omite el benchmark de arranque; `CanvasApp.js` respeta `debug_mode: false` y cierra su ciclo de vida; `AppDev.js` libera controles. `script.js` evita solicitar un adaptador por separado y evita duplicar las métricas.

El GLB conserva metros y ejes glTF (Y arriba). No se escala la escena para adaptarla a la pantalla. GLTFLoader recupera los materiales PBR y sus mapas. La salida es sRGB con AgX más el aspecto de Blender y exposición 1,0718, que es el +0,1 EV del render; la curva coincide con la de Blender dentro de 0,0091 de error cuadrático medio. El GLB declara transmisión pero no volumen, así que el visor calcula el grosor de la cristalería de su propia geometría al construir la escena. Los rellenos de área inicializan las texturas LTC para WebGPU. Al cambiar la resolución de sombras se sustituye la luz solar por una copia con la misma transformación y objetivo, nuevo `mapSize` y recursos GPU nuevos; se libera la anterior. La nueva identidad fuerza a regenerar las referencias de los nodos. Redimensionar o destruir sólo el render target activo dejaba la imagen negra en la combinación r182/WebGPU probada.

## Actualizar el modelo

1. Exportar desde el Blender fuente conservando cámaras, materiales, texturas y recursos compartidos.
2. Copiar el resultado a `static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb` desde la raíz del repositorio.
3. Obtener tamaño y SHA-256 con `Get-Item` y `Get-FileHash -Algorithm SHA256`.
4. Actualizar `config.js` (`assetBytes`), el manifiesto y las expectativas de la prueba de integridad cuando el cambio sea intencionado.
5. Ejecutar pruebas, compilar, recargar y guardar nuevas capturas y diagnósticos desde las mismas cámaras, resolución y calidad.

La copia actual ocupa 56.526.524 bytes, contiene 25 imágenes, 117 recursos mesh y 10 cámaras. Los 378.164 triángulos de la escena incluyen repeticiones. Esta fase no modifica el `.blend` original.

## Próxima entrega

Fase 5: reflejos del pavimento. La fase 4 deja el error de CAM 02 en 0,0928 y el de CAM 01 en 0,0967, y el pavimento sigue 0,69 EV por encima además de no reflejar las columnas, que es justo lo que la fase 5 aborda. Queda abierto el friso de la fase 4, diagnosticado pero sin causa establecida, y de la fase 2 que ninguna columna resulta ser el reflejo vertical de otra pese al nombre de CAM 03.
