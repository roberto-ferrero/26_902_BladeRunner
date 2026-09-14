# 7.5 · Experiencia y revisión técnica

13-09-2026. Al abrir la GUI se muestran cámara, calidad, encuadre, Navegación y Paneo con el ratón. Revisión técnica queda plegada al arrancar y contiene Atmósfera, Acabado cinematográfico, Color y materiales, Captura 1920 × 800, Diagnóstico y Comparar efectos y coste.

Cabecera y FPS permanecen fuera del panel ocultable. La GUI sigue cerrada al cargar; Abrir GUI y Ocultar GUI conservan su comportamiento. Las cámaras y atajos siguen disponibles sin abrir la revisión técnica. Los avisos de carga, incompatibilidad WebGPU y recuperación no se ocultan dentro de la revisión técnica.

Se reubican los mismos nodos DOM: no se duplican controles, valores ni eventos. Abrir/cerrar paneles no cambia efectos, calidad, cámara ni ajustes. El estado de apertura y los valores se conservan durante la sesión, sin persistir entre recargas. La pausa de navegación al interactuar con la GUI sigue activa.

Valores conservados: calidad Baja; transición 4,5 s; recorrido 1,4 m/s y ojos 1,65 m; paneo 2/0,5/1,4; acabado y efectos actuales. Blender y GLB anteriores sin cambios.

## Validación

Cambio de organización DOM/CSS sin nueva lógica de render o navegación. Se valida mediante compilación y prueba de interfaz: panel inicial compacto, revisión técnica plegada, acceso a herramientas y conservación de ajustes al plegar/ocultar. No se añaden pruebas unitarias que reproduzcan el marcado HTML. Evidencias y resultado de compilación registrados al finalizar.

Resultado: build dist correcto en 104,507 s con tres avisos de tamaño existentes. Verificado arranque oculto, GUI compacta, acceso a revisión técnica y persistencia de intensidad de lens flare 0,20 tras plegar, ocultar y reabrir. Se restituye 0,18 y se deja la GUI oculta con revisión plegada. Sin errores de consola. Capturas 7.5_001 y 7.5_002 guardadas e indexadas con hora UTC. No se repite la suite de motor (58 pruebas correctas en 7.4), al no modificar su comportamiento.
