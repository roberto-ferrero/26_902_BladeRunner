# 7.4 · Tamaño, foco, pausa y dispositivos

13-09-2026. Se mantienen transición 4,5 s, calidad Baja, GUI oculta, cámara y acabado actuales.

## Comportamiento

- El contenedor se observa con ResizeObserver, además de los eventos de ventana del andamiaje. Cambiar su tamaño actualiza el renderer y la proyección. Un aspecto cero o no finito no sustituye la última proyección válida.
- Al perder foco, entrar en controles editables o pulsar la GUI, se liberan las teclas y la captura/arrastre del recorrido. La posición se conserva. Reanudar requiere Entrar al recorrido, nunca sucede automáticamente.
- Ocultar la pestaña desactiva el render del andamiaje. Al volver se reinician tiempos y estadísticas y se reactiva el render, manteniendo el recorrido pausado. También se contempla que la carga termine con la pestaña ya oculta.
- Salir del lienzo cancela el arrastre alternativo. Los atajos numéricos existentes siguen ignorando campos editables, modificadores y diálogos.
- Una pérdida del dispositivo WebGPU conserva el manejador de Three.js, detiene el visor y muestra un aviso con Recargar página. No se intenta reconstruir parcialmente recursos de GPU. Los listeners, observador y manejador se liberan/restauran al destruir el proyecto.

## Dispositivo objetivo

Ordenador con GPU dedicada, teclado y ratón, navegador con WebGPU disponible, servido por localhost o HTTPS. La calidad sigue en Baja por petición del usuario; Media/Alta quedan opcionales. El recorrido no incorpora joystick táctil ni gamepad. Una ventana estrecha permite revisar la GUI, pero esto no certifica rendimiento ni navegación táctil en móviles. La ausencia inicial de WebGPU mantiene el aviso de incompatibilidad y recarga ya existente.

## Validación y límites

58/58 pruebas correctas. Casos nuevos: ocultar/mostrar, carga en segundo plano, no reactivar tras fallo de GPU, blur/foco editable, eliminación de listeners y aspecto cero/NaN/Infinity. Las pruebas de fallo usan un estado simulado: no se ha provocado una pérdida real del dispositivo ni se ha certificado recuperación en distintas GPU. Se conserva el ensayo anterior con GPU dedicada como objetivo; esta entrega no constituye una matriz de rendimiento entre dispositivos.

Capturas y comprobación visual del visor registradas al finalizar. Pruebas automatizadas de visibilidad mediante eventos controlados, sin afirmar que la automatización del navegador haya reproducido una suspensión real del sistema operativo.

Validación final: build dist correcto en 74,127 s con tres avisos de tamaño existentes. En navegador WebGPU se verificó el cambio entre contenedor completo y encuadre 2,4:1, la pausa del recorrido al abrir GUI y que pulsar 5 con foco en el control de altura no selecciona Camera_B. Sin errores de consola. Capturas 7.4_001 y 7.4_002 indexadas con hora UTC. El visor queda en CAM01, encuadre 2,4:1, calidad Baja y GUI oculta.
