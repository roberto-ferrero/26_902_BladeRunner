# 7.2 · Transiciones y restauración del encuadre

13-09-2026. Transiciones de posición, orientación y óptica entre las cámaras de película, tanto desde el selector como desde los atajos 1–9/0. Duración inicial 1,2 s; regulable de 0 a 3 s en GUI > Navegación. 0 cambia instantáneamente. Se respeta la preferencia del sistema de reducir movimiento. La carga inicial sigue mostrando directamente CAM01.

Restaurar encuadre de referencia vuelve a la cámara seleccionada, saliendo del recorrido libre y eliminando el desplazamiento del paneo. El botón Volver al centro del paneo usa ahora esa misma transición. Entrar al recorrido durante una transición la interrumpe en la vista actual. Elegir otra cámara durante una transición comienza desde la pose interpolada, sin saltar al destino anterior.

Interpolación de posición con entrada/salida suaves y quaternion por slerp. Se conservan la identidad de cámara usada por los reflejos, la escala unitaria y el aspecto de la ventana. El paneo se suspende durante la transición y se reactiva centrado al terminar; el siguiente movimiento del ratón vuelve a controlarlo. Las capturas del modo fijo usan el destino de referencia, incluso si se solicitan durante la transición. En modo libre siguen capturando la vista actual.

## Límites

Las trayectorias son directas entre cámaras, sin evitar columnas o muebles. El control de colisiones queda en 7.3. La duración mide tiempo activo con delta limitado a 0,1 s para evitar saltos tras una pausa del navegador. La geometría, cielo, iluminación, materiales y activos anteriores se mantienen.

## Validación

Pruebas de interpolación, destino, identidad, óptica, cambios rápidos, redimensionado, escala de cámaras de Blender y cancelación. Compilación y capturas del visor registradas al finalizar.

Resultado: 51/51 pruebas correctas. Build dist completado en 105,791 s con los tres avisos de tamaño existentes. En WebGPU se comprobaron el paso de CAM01 a CAM02 (vista intermedia y llegada), duración 0, retorno a 1,2 s y restauración de CAM01 tras girar con arrastre en modo libre. Sin errores de consola. Capturas 7.2_001 y 7.2_002 guardadas con fecha y orden en docs/capturas/INDEX.md. Las pruebas automáticas cubren cambios rápidos y redimensionado; no se ha hecho una revisión visual exhaustiva de todas las trayectorias.
