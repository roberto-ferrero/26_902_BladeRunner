# 9.5 · Llamaradas industriales

Revisión r02 del 21/09/2026. Referencia: `_Fuentes/Edificios ciudad/fondo ciudad y llamaradas.mp4`, revisada mediante la [secuencia extraída en 9.0](../9.0/llamaradas-secuencia.png). Se conserva el chorro estrecho que se abre en lóbulos de fuego y se extingue, adaptado al amanecer de la escena. La [propuesta inicial](LLAMARADAS-r01.md) queda preservada como historial.

## Composición y comportamiento

Se reutilizan las tres torres oscuras de 9.1: derecha (400, 28, −460), izquierda (−680, 24, −700) e izquierda más distante (−900, 15, −830). La torre derecha se desplaza 40 m hacia el exterior respecto a r01 para mantener la envolvente ampliada fuera de CAM01. No se eleva ni aclara la arquitectura.

Solo hay una emisión activa cada vez; dura hasta 4,4 s, con alimentación durante unos 2,6 s y extinción del material ascendente. El intervalo base es 4,5 s, con variación de ±15 % y alternancia irregular entre torres. La primera emisión se inicia a los 2,5 s. El tamaño base multiplica por 3,5 todas las capas visuales sin modificar la trayectoria. Las izquierdas conservan una intensidad ligeramente menor por su distancia.

Un chorro cálido alimenta nueve lóbulos turbulentos que ascienden, se expanden y se apagan. Textura procedural con borde irregular y transparente, núcleo amarillo y periferia naranja; glow local tenue y bloom existente. No hay nuevas luces reales, sombras, humo persistente ni cambio de exposición global. Máximo de once sprites visibles y una sola textura compartida de 128 × 128. Los reflejos se actualizan como máximo a 8 Hz y el entorno a 1 Hz durante la emisión, más sus cambios de estado.

## Controles

En «Exterior — Fase 9»: activación, intervalo entre 2 y 60 s (inicial 4,5 s), tamaño entre 1× y 5× (inicial 3,5×) e intensidad entre 0 y 1,5 (inicial 0,65). Intensidad cero y desactivación apagan todo el efecto. Ocultar los edificios bajos oculta también las emisiones para evitar fuego flotante sin torre.

## Comprobación de encuadre

La envolvente conservadora usa un radio X/Z de `13 × tamaño`; en el valor inicial equivale a ±45,5 m, con Y desde 45,5 m bajo la boca hasta 68,5 m encima. La auditoría comprueba tanto 3,5× como el máximo de GUI 5×: 1.681 muestras por torre, tamaño y aspecto, en 2,4:1 y 16:9, con paneo horizontal y vertical de ±2 m y objetivo a 20 m. Todas dan cero intersecciones con el frustum de CAM01. Este muestreo supera la amplitud vertical inicial de 0,5 m, pero no garantiza otros objetivos de paneo ni formatos más anchos.

La torre derecha tiene línea de visión desde Camera_D; las dos izquierdas, desde CAM02. Las columnas pueden ocultar parte de las emisiones desde otras posiciones. Revisión visual realizada en Camera_D y CAM02 con tamaño 3,5× e intervalo 4,5 s. CAM01 se observó durante varias emisiones y permaneció limpia.

## Validación

Doce pruebas conjuntas de ciudad, llamaradas, tráfico y comparación correctas. Incluyen diez minutos con una sola emisión simultánea, frecuencia aproximada de 4–5 s, ausencia de fuga de partículas, independencia de FPS, límites del GUI, apagado y borrado inmediato en las cachés de reflejos. Compilación correcta con los tres avisos de tamaño ya conocidos de webpack; sin errores de consola en la revisión WebGPU.

Valores finales: intervalo 4,5 s, tamaño 3,5× e intensidad 0,65. Capturas 9.5_006–009 en el [índice](../../capturas/INDEX.md). Registros r02: `tests-r02.log`, `build-r02.log`, `geometry-r02.json` y `diagnostico-r02.json`. No se ha medido una comparación A/B formal de coste; queda en 9.6. Pendiente de valoración artística.
