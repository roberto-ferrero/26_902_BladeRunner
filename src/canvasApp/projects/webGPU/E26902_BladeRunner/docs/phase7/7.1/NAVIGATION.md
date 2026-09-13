# 7.1 · Recorrido libre y cámaras de película

13-09-2026. Implementado para revisión.

Abrir GUI > Navegación > Recorrido libre > Entrar al recorrido. Parte de la vista actual, sin saltar a otro preset. Velocidad inicial 2 m/s, regulable entre 0,25 y 5 m/s. WASD/flechas desplazan horizontalmente; Q/E bajan/suben. Ratón orienta la vista con límite vertical para evitar inversiones. Escape pausa y libera el cursor; Entrar reanuda. Si el navegador rechaza Pointer Lock, se activa arrastre con botón izquierdo sobre el lienzo para mirar, conservando el teclado. La GUI se oculta al entrar, cabecera y FPS permanecen visibles.

Seleccionar una cámara o pulsar 1–9/0 termina el recorrido y recupera su encuadre y paneo. Camera_free sigue siendo el preset importado asignado a 0; el modo de navegación es independiente. El paneo conserva sus valores (2/0,5/1,4), pero no interviene durante el recorrido. Las capturas en modo libre toman la vista actual; en modo fijo, la referencia sin paneo.

Se vacían las teclas al perder foco, visibilidad, captura del cursor o salir. Movimiento normalizado en diagonales y delta limitado a 0,1 s para evitar saltos al reanudar. Eventos eliminados al destruir el proyecto. No se modifica geometría, iluminación ni materiales. Continúan BladeRunner_5_6_High_v3.blend y BladeRunner_5_6_High_v3_phase2.glb.

## Límites

Exploración sin colisiones ni gravedad: se pueden atravesar muebles y paredes. Colisiones y calibración de altura corresponden a 7.3. Transiciones suaves corresponden a 7.2. El arrastre alternativo está limitado por los bordes de la ventana; soltar y volver a arrastrar permite continuar girando.

## Validación

Suite anterior y navegación: 47 pruebas correctas antes del ajuste de compatibilidad. Se añade una prueba específica de rechazo Pointer Lock y Escape. Compilación de producción y comprobación visual registradas al finalizar. El navegador integrado rechaza Pointer Lock; se valida en él la alternativa de arrastre. La captura nativa del cursor queda pendiente de prueba manual en un navegador externo compatible.

Validación final: las cuatro pruebas de navegación pasan, incluida la alternativa de arrastre. Build en dist correcto, con tres avisos de tamaño existentes. En el visor: modo libre, giro por arrastre, Escape, GUI automática, regreso a Camera_B con 5 y CAM01 con 1 verificados. Sin errores de consola. Capturas 7.1_001 y 7.1_002 en docs/capturas e INDEX con hora UTC. No se ha medido rendimiento durante un recorrido prolongado.
