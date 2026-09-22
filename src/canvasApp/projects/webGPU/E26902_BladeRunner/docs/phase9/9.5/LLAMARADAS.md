# 9.5 · Llamaradas industriales

Revisión r03 del 21/09/2026. Se corrige la morfología a petición del usuario: boca estrecha, crecimiento ascendente y expansión más ancha a mayor altura. La altura visible inicial es aproximadamente doble que en r02. El GUI incorpora «Crecimiento vertical», de 1× a 3×, inicialmente 2×. El halo se eleva y los lóbulos se ensanchan progresivamente durante su ascenso. Referencia: `_Fuentes/Edificios ciudad/fondo ciudad y llamaradas.mp4`. Historial: [r01](LLAMARADAS-r01.md) y [r02](LLAMARADAS-r02.md).

## Composición y comportamiento

Se reutilizan las tres torres oscuras de 9.1: derecha (400, 28, −460), izquierda (−680, 24, −700) e izquierda más distante (−900, 15, −830). La torre derecha se desplaza 40 m hacia el exterior respecto a r01 para mantener la envolvente ampliada fuera de CAM01. No se eleva ni aclara la arquitectura.

Solo hay una emisión activa cada vez; dura hasta 4,4 s, con alimentación durante unos 2,6 s y extinción del material ascendente. El intervalo base es 4,5 s, con variación de ±15 % y alternancia irregular entre torres. La primera emisión se inicia a los 2,5 s. El tamaño inicial es 4,25×; la trayectoria asciende en proporción al tamaño y al nuevo crecimiento vertical. El chorro tiene una anchura de 1,1 unidades por tamaño, frente a las 3 de r02. Las izquierdas conservan una intensidad ligeramente menor por su distancia.

Un chorro cálido alimenta nueve lóbulos turbulentos que ascienden, se expanden y se apagan. Textura procedural con borde irregular y transparente, núcleo amarillo y periferia naranja; glow local tenue y bloom existente. No hay nuevas luces reales, sombras, humo persistente ni cambio de exposición global. Máximo de once sprites visibles y una sola textura compartida de 128 × 128. Los reflejos se actualizan como máximo a 8 Hz y el entorno a 1 Hz durante la emisión, más sus cambios de estado.

## Controles

En «Exterior — Fase 9»: activación, intervalo entre 2 y 60 s (inicial 4,5 s), tamaño entre 1× y 5× (inicial 4,25×), crecimiento vertical entre 1× y 3× (inicial 2×) e intensidad entre 0 y 1,5 (inicial 1,50). Intensidad cero y desactivación apagan todo el efecto. Ocultar los edificios bajos oculta también las emisiones para evitar fuego flotante sin torre.

## Comprobación de encuadre

La envolvente incluye el ascenso, la deriva y la diagonal máxima de todos los sprites. La auditoría combina tamaños 3,5×/5× y crecimientos 2×/3×: 1.681 muestras por torre, combinación y aspecto, en 2,4:1 y 16:9, con paneo horizontal y vertical de ±2 m y objetivo a 20 m. Todas dan cero intersecciones con CAM01 sin mover nuevamente las torres. No garantiza otros objetivos de paneo ni formatos más anchos.

La torre derecha tiene línea de visión desde Camera_D; las dos izquierdas, desde CAM02. Las columnas pueden ocultar parte de las emisiones desde otras posiciones. Revisión visual realizada en Camera_D y CAM02 con tamaño 3,5× e intervalo 4,5 s. CAM01 se observó durante varias emisiones y permaneció limpia.

## Validación

Doce pruebas conjuntas de ciudad, llamaradas, tráfico y comparación correctas. Incluyen diez minutos con una sola emisión simultánea, frecuencia aproximada de 4–5 s, ausencia de fuga de partículas, independencia de FPS, límites del GUI, apagado y borrado inmediato en las cachés de reflejos. Compilación correcta con los tres avisos de tamaño ya conocidos de webpack; sin errores de consola en la revisión WebGPU.

Validación r03: cuatro pruebas de llamaradas correctas, incluyendo la envolvente durante animación al máximo tamaño y crecimiento; compilación correcta con los tres avisos conocidos. Revisión visual en Camera_D y control de crecimiento comprobado en el GUI. Valores actuales: intervalo 4,5 s, tamaño 4,25×, crecimiento 2× e intensidad 1,50. Captura 9.5_010 en el [índice](../../capturas/INDEX.md). No se ha medido una comparación A/B formal de coste; queda en 9.6. Pendiente de valoración artística.
