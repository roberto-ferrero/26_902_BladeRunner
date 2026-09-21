# 9.5 · Llamaradas industriales

Propuesta inicial del 21/09/2026. Referencia: `_Fuentes/Edificios ciudad/fondo ciudad y llamaradas.mp4`, revisada mediante la [secuencia extraída en 9.0](../9.0/llamaradas-secuencia.png). Se toma el chorro estrecho que se abre en lóbulos de fuego y se extingue; la frecuencia y el brillo se adaptan al amanecer de la escena.

## Composición y comportamiento

Se reutilizan las tres torres oscuras de 9.1: derecha (360, 28, −460), izquierda (−680, 24, −700) e izquierda más distante (−900, 15, −830). No se eleva ni aclara la arquitectura. Solo hay una emisión activa cada vez; dura hasta 4,4 s, con alimentación durante unos 2,6 s y extinción del material ascendente. Intervalo base de 26 s, con variación de ±15 % y alternancia irregular entre las torres. La primera emisión se inicia a los 6 s. Las izquierdas tienen una intensidad ligeramente menor por su distancia.

Un chorro cálido alimenta nueve lóbulos turbulentos que ascienden, se expanden y se apagan. Textura procedural con borde irregular y transparente, núcleo amarillo y periferia naranja; glow local tenue y bloom existente. No hay nuevas luces reales, sombras, humo persistente ni cambio de exposición global. Máximo de once sprites visibles y una sola textura compartida de 128 × 128. Recursos reutilizados y liberados por el recorrido de disposición de la escena. Los reflejos se actualizan como máximo a 8 Hz y el entorno a 1 Hz durante la emisión, más sus cambios de estado.

## Controles

En «Exterior — Fase 9»: activación de llamaradas, intervalo orientativo entre 12 y 60 s (inicial 26 s) e intensidad entre 0 y 1,5 (inicial 0,65). Intensidad cero y desactivación apagan todo el efecto. Ocultar los edificios bajos oculta también las emisiones para evitar fuego flotante sin torre.

## Comprobación de encuadre

Envolventes conservadoras por torre: X/Z ±18 m; Y desde 12 m bajo la boca hasta 34 m encima. Incluyen el tamaño y rotación máximos de todos los billboards. Auditoría del GLB: 1.681 muestras por torre y aspecto, en 2,4:1 y 16:9, con paneo horizontal y vertical de ±2 m y objetivo a 20 m. Cero intersecciones con el frustum de CAM01. Este muestreo supera la amplitud vertical inicial de 0,5 m, pero no garantiza otros objetivos de paneo ni formatos más anchos.

La torre derecha tiene línea de visión desde Camera_D; las dos izquierdas, desde CAM02. Las columnas pueden ocultar parte de las emisiones desde otras posiciones. Revisión visual realizada: llamarada derecha desde Camera_D y las dos izquierdas desde CAM02, con captura y diagnóstico de la más lejana. La captura de CAM01 y su diagnóstico coinciden con una emisión derecha activa y no muestran fuego en ese encuadre.

## Validación

Doce pruebas conjuntas de ciudad, llamaradas, tráfico y comparación correctas. Incluyen diez minutos sin superposición ni fuga de partículas de sus límites, independencia de FPS, controles de apagado y borrado inmediato de la última llamarada en las cachés de reflejos. Compilación correcta con tres avisos de tamaño de webpack; sin errores de consola en la revisión WebGPU. Controles de intensidad cero y desactivación verificados por diagnóstico; valores finales 26 s y 0,65. Capturas 9.5_001–005 en el [índice](../../capturas/INDEX.md). Las capturas laterales usan intervalo de revisión 12 s para observar los eventos; su tamaño, intensidad y duración son los iniciales. Registros: `tests.log`, `build.log`, `geometry.json` y diagnósticos. No se ha medido una comparación A/B formal de coste; queda en 9.6. Pendiente de valoración artística; 9.6 sigue pendiente para integración y coste global.
