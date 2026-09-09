# Paneo con el ratón

09/09/2026. Añadido a petición del usuario durante la fase 3.1. El movimiento desplaza la cámara respecto a su pose de referencia y mantiene fijo un punto sobre su eje de mirada. Se aplica a todas las cámaras del selector.

En el panel inferior, abrir **Paneo con el ratón**:

| Control | Valor inicial | Rango y significado |
| --- | --- | --- |
| Activar paneo | Activado | Desactivarlo restaura exactamente la pose original |
| Recorrido horizontal | 0,25 m | 0–2 m máximos desde el centro hacia cada lado |
| Recorrido vertical | 0,12 m | 0–2 m máximos desde el centro hacia arriba/abajo |
| Suavidad | 0,35 s | 0–2 s; mayor valor, respuesta más lenta; 0 es inmediato |
| Distancia al punto de mirada | 20 m | 1–100 m sobre el eje de visión de la cámara de referencia |
| Volver al centro | — | Restaura posición/orientación y borra el desplazamiento acumulado |

Se normaliza la posición del ratón usando la ventana completa: centro = cero, bordes = recorrido máximo. Ratón a la izquierda → cámara a la derecha; ratón arriba → cámara abajo. El desplazamiento se expresa en los ejes locales de la cámara y en metros, para conservar la escala de la escena al cambiar de resolución. Los píxeles que se desplaza cada objeto en pantalla dependen de su profundidad, del FOV y del tamaño del visor.

El punto de mirada permanece fijo mientras se mueve el ratón. glTF no aporta un objetivo look-at: se obtiene desde la pose original y la distancia configurada. Cambiar esa distancia permite controlar la convergencia del efecto. La suavidad usa interpolación exponencial dependiente del tiempo, con delta limitado a 0,1 s tras una interrupción para evitar saltos.

Al pasar por controles o salir de la ventana, vuelve suavemente al centro. Al perder el foco, ocultar la pestaña, desactivar el efecto o cambiar de cámara, se restaura la referencia sin deriva. Los eventos se eliminan al destruir el proyecto. Se ignoran movimientos táctiles y de lápiz.

Los valores se conservan al cambiar de cámara durante la sesión; al recargar vuelven a los valores de `config.js`, apartado `pan`. **Captura 1920 × 800** usa siempre una cámara de referencia independiente del paneo. El diagnóstico `camera` describe la pose viva y `cameraPan` registra parámetros, desplazamiento, posición de referencia y punto de mirada.

## Implementación y validación

- `TyrellCameraPan.js`: referencia inmutable, traslación acotada, mirada fija, suavizado y reinicio.
- Entrada del proyecto: eventos de ratón/foco, actualización por fotograma, cambio de cámara, diagnóstico y captura de referencia.
- `TyrellUI.js`/`tyrell.css`: panel plegable con límites, unidades y botón de retorno.
- `tests/camera-pan.test.mjs`: dirección opuesta al ratón en una cámara rotada, límites, mirada fija, conservación de referencia, equivalencia a 60/120 FPS y reinicio al desactivar/cambiar de cámara.
- `npm run test:tyrell`: **15/15 correctas**; incluye las pruebas previas de captura y restauración.
- `npm run build`: correcto, Webpack 5.97.1, 42,479 s, tres advertencias de tamaño/rendimiento; sin errores. Registro local: `tyrell-build-pan.log`.

No se pudo realizar revisión visual en esta sesión: la herramienta de navegación devolvió **No browser is available**. Para revisarlo, ejecutar `npm run dev:local` y abrir `http://localhost:8080`; comprobar los cuatro bordes, los controles, el cambio CAM 01/CAM 02 y una captura fija. Esta entrega no incorpora colisiones de navegación: recorridos elevados pueden acercar la cámara a paredes o columnas. El valor inicial es deliberadamente corto.
