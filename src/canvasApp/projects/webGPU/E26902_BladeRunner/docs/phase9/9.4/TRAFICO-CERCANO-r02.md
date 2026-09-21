# 9.4 · Tráfico cercano · Revisión r02

Propuesta revisada el 21/09/2026. El usuario rechaza la primera versión por tamaño excesivo, multiplicidad de vehículos, trayectoria e inclinación y falta del resplandor de las referencias. Se conserva el [estado r01](TRAFICO-CERCANO-r01.md) y sus capturas 001–004 como historial rechazado. La aproximación al hangar continúa eliminada.

## Comportamiento actual

Un solo vehículo cercano, al **25 % de la escala anterior**, realiza siempre el mismo trayecto. La ruta se proyecta desde la zona superior izquierda hacia el lateral derecho en Camera_E; pasa en primer término con un arco horizontal suave y cota constante de 10,5 m, superior al techo de las oficinas. CAM01 y otras vistas incluyen oclusiones por las columnas. Los extremos quedan fuera de los encuadres de referencia; al terminar se reinicia el mismo vehículo, sin nuevas instancias ni alternancia de rutas.

La orientación separa el rumbo horizontal de la inclinación lateral: **banking máximo de 3°**, sin cabeceo vertical. Se elimina el giro indeseado del método anterior que alineaba directamente dos vectores y podía introducir una gran inclinación al orientarse hacia −Z.

**Exterior — Fase 9** mantiene la activación independiente y cambia el control a **Duración del trayecto cercano**, de 5 a 30 s, inicial 10 s. Ahora regula la velocidad y duración del único recorrido completo; no crea vuelos solapados. Cambiarlo conserva la posición actual. Se repite al terminar, con una espera de 2 s solo al arrancar o reactivar.

## Luz y referencia

Se han vuelto a revisar `spinner volando alejandose de camara.jpg` y `spinner volando hacia camara.jpg`: núcleo brillante, halo cálido amplio y destello cruzado suave. El modelo reducido queda subordinado a ese resplandor.

La propuesta combina núcleo HDR blanco cálido, glow difuso y textura procedural de destello/halo óptico. Alimenta el bloom existente, conservando su ajuste global y el look de amanecer/atardecer. No añade lámparas sobre la escena. Los halos respetan la profundidad de la arquitectura; la pequeña carrocería no escribe profundidad sobre su propio resplandor. El efecto óptico es una aproximación mediante sprites orientados a cámara, no una simulación física de lente.

## Comprobaciones y registros

Ocho pruebas de tráfico y comparación correctas. Incluyen una única instancia durante diez minutos, escala 0,25, repetición de la misma ruta, apagado, cambio de duración sin salto de posición y movimiento independiente de FPS. Se comprueba altura constante y banking ≤3° en 1.001 muestras; casco conservador reducido de radio 0,866 m. La auditoría geométrica muestreada no encuentra intersecciones con el GLB. Los fundidos de los extremos no aparecen en Camera_E ni CAM01; la salida puede quedar tapada por columnas desde otras cámaras.

Compilación de producción correcta (tres avisos de tamaño de webpack). Revisada en WebGPU: un único paso repetido, glow cálido predominante y oclusiones por la arquitectura; sin errores de consola durante la revisión. Controles probados a 5/10/30 s y apagado independiente, dejando 10 s activo. El diagnóstico final registra una sola instancia y 32 ciclos iniciados; el apagado conserva los ocho vuelos lejanos. Capturas 9.4_005–008: GUI, entrada, halo y avance hacia la salida.

Registros r02: `tests-r02.log`, `routes-r02.json`, `build-r02.log`, `diagnostico-r02.json`; capturas desde 005 en el [índice](../../capturas/INDEX.md). La valoración artística de esta revisión queda pendiente del usuario. La fase 9.5 de llamaradas no se inicia en esta corrección.
