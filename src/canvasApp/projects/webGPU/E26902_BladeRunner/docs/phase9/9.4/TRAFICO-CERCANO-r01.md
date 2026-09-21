# 9.4 · Tráfico aéreo cercano

Propuesta implementada el 21/09/2026, pendiente de valoración artística. El vuelo al hangar de 9.3 se elimina por petición expresa del usuario; sus revisiones r04/r05 quedan archivadas como rechazadas. Se mantienen los tres corredores lejanos y sus tamaños actuales. La fase 9.5 de llamaradas sigue pendiente.

## Referencia y acabado

Se han revisado las láminas de imágenes y la secuencia del vídeo de `_Fuentes/Vehiculo aereo`, conservadas en [9.0](../9.0/PREPARACION.md). Se toma la cabina alargada acristalada, el cuerpo bajo y los dos volúmenes delanteros laterales. La aproximación aumenta de tamaño por perspectiva y sale por arriba; el alejamiento muestra una pequeña luz posterior cálida. No se copia el corte de montaje del vídeo.

El vehículo es una interpretación simplificada, de unos 4,3 m de ancho por 5,3 m de largo. Carrocería gris azulada oscura, bajos oscuros y vidrio opaco de brillo contenido. Dos luces delanteras claras, salida cálida y baliza blanca con doble destello suave. Sin cambio de exposición, cielo ni iluminación ambiental: conserva el amanecer/atardecer de la escena.

## Recorridos y GUI

Dos rutas alternas sobre las oficinas: aproximación desde el sector derecho de la ciudad y alejamiento ascendente sobre la pirámide. La salida usa una cota superior en la zona donde se cruzan sus proyecciones. Ambas pasan por encima del techo, cuya cota superior es 6,8 m. Los extremos próximos terminan detrás de la vista frontal de las oficinas; los lejanos se funden suavemente a unos 900 m de profundidad.

**Exterior — Fase 9** incorpora:

| Control | Inicial | Comportamiento |
| --- | --- | --- |
| Tráfico cercano | Activado | Apaga cuerpo y luces de todos los pasos cercanos; el tráfico lejano sigue activo |
| Intervalo entre pasos cercanos | 10 s | De 5 a 30 s; menor intervalo implica más frecuencia |

El intervalo regula los inicios de recorrido. El primer recorrido empieza tras 2 s y cada ruta completa dura 20 s; el tiempo visible depende de cámara, distancia y oclusión. Al modificar el intervalo se conserva la fracción pendiente hasta el siguiente inicio, sin cambiar la velocidad de los vehículos ya activos. Al apagar se cancelan sus vuelos; al reactivar comienza una nueva secuencia con una espera breve.

## Integración

`TyrellNearTraffic.js` construye geometrías compartidas por cinco vehículos reutilizables: 1.302 triángulos por vehículo, incluidos halos, cuatro acabados y cuatro sprites. No añade lámparas reales, sombras dinámicas ni pasadas de transmisión de vidrio. El casco recibe el tratamiento atmosférico común; los halos respetan la profundidad y se atenúan con la distancia.

Movimiento por longitud de arco y tiempo de simulación, con deltas de reanudación limitados a 0,1 s. Reflejo planar invalidado a 12 Hz y entorno especular a 2 Hz mientras hay movimiento, además de otras causas de actualización de la escena. Recursos liberados por el recorrido común de `disposeScene`. Diagnóstico y comparador incluyen activación, intervalo, rutas y posiciones.

Archivos de integración: `E26902_BladeRunner`, `TyrellUI.js`, `TyrellComparison.js`; retirada del hangar en `TyrellAirTraffic.js` y su auditoría/pruebas.

## Validación

- Ocho pruebas correctas: corredores lejanos sin desvío tras diez minutos, controles y reciclado, independencia de FPS, cadencia alterna cercana, apagado, límites y reutilización. Simulación cercana de diez minutos al intervalo mínimo: 120 inicios, sin pérdida de vehículos ni colisiones entre sus envolventes de 7 m.
- [Auditoría geométrica](routes.json): 401 muestras por ruta; esfera conservadora de radio 3,465 m alrededor del casco completo, comparada con triángulos del GLB. Sin intersecciones; margen adicional mínimo de 0,546 m en aproximación y 0,560 m en salida, ambos frente al techo. Ambos recorridos tienen muestras visibles en CAM01, CAM03, CAM04 y Camera_E.
- Compilación de producción correcta, con los tres avisos de tamaño habituales. [Pruebas](tests.log) y [compilación](build.log) archivadas.
- Revisión WebGPU en CAM01 y Camera_E; GUI verificada a 5, 10 y 30 s y apagado independiente. Diagnóstico a 5 s confirma cuatro vuelos cercanos activos y regeneración; apagado confirma cero cercanos y ocho lejanos. Sin errores de consola registrados.
- Capturas 9.4_001–004 y 9.3_019 en el [índice](../../capturas/INDEX.md). Secuencia de inspección a intervalo 10 s en [contacto visual](secuencia-10s.jpg), con recortes de capturas reales para comparar tamaño y posición; no es una imagen de referencia del filme.

La comprobación geométrica es muestreada, no continua. La visibilidad usa rayos al centro y no cubre todo el recorrido libre ni todos los paneos; la arquitectura puede ocultar naturalmente parte del vuelo. El fundido remoto puede verse como aparición gradual. No se ha realizado una nueva comparativa A/B de rendimiento: los valores del diagnóstico son muestras de funcionamiento, no una atribución de coste. La revisión global de rendimiento permanece en 9.6.
