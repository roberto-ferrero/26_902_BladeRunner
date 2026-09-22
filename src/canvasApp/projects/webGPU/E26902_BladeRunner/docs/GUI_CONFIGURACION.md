# Valores iniciales del GUI

Editar `static/config/E26902_BladeRunner/gui.initial.json` y recargar el visor.
En una publicación ya compilada, editar `dist/config/E26902_BladeRunner/gui.initial.json`.
La aplicación solicita el archivo en cada carga con `cache: no-store`: no hace falta recompilar para cambiar valores en la publicación. Una nueva compilación copia de nuevo la versión de `static`.

JSON permite un árbol explícito sin añadir dependencias. No admite comentarios ni comas finales; esta guía documenta su uso.

- `viewer`: calidad, encuadre y presupuesto de render.
- `camera`: estado inicial, transición y paneo del ratón.
- `materials`, `lighting`, `reflections`: acabado, exposición, iluminación y reflejos.
- `atmosphere`, `sky`: bruma, haces, polvo y panorama.
- `postProcessing`: bloom, color y destello solar.
- `city`: edificios, HSL, color por orientación, luces, tráfico y llamaradas.
- `voightKampff`: despliegue al llegar y ahorro de capturas de reflejos.

Los sufijos `Seconds`, `Meters`, `Degrees`, `Percent` y `EV` expresan las unidades. `rightBuildingLightnessStep` y `leftBuildingLightnessStep` son puntos porcentuales de luminosidad por edificio. `resolutionScale` acepta `"auto"`, `"0.25"`, `"0.5"` o `"1"`. Los booleanos se escriben como `true` o `false`, sin comillas.

`camera.initialState` utiliza el identificador del estado exportado de Blender (actualmente `initial` o `p1`). Las poses, teclas y excepciones de transición por pareja siguen en los archivos de estados de cámara. Los botones de acción, resultados de mediciones y estados temporales del dispositivo no son parámetros iniciales.

El archivo es completo y requiere `schemaVersion: 1`. Se rechazan campos ausentes o desconocidos, tipos erróneos, cámaras inexistentes, opciones inválidas y números fuera de los rangos del GUI. Los errores aparecen en el estado de carga; corregir el archivo y pulsar Reintentar. No se ocultan errores usando silenciosamente otros valores.

Los ajustes se validan antes de cargar los modelos y se aplican cuando todos los componentes están creados, antes de estabilizar y revelar la escena. Se reutilizan las mismas acciones del GUI para actualizar controles, lecturas y componentes. Los cambios interactivos duran la sesión y no sobrescriben el JSON.

Al añadir un control configurable, añadir su ruta descriptiva a `TyrellGUISettings.js` y su valor al JSON. Los valores locales de construcción del HTML y de los componentes son provisionales: el archivo externo prevalece al arrancar.
