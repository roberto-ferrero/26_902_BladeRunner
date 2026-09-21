# 9.4 · Tráfico cercano · Revisión r03

Revisión del 21/09/2026 tras rechazar el paso demasiado rápido y el resplandor excesivo de r02. El [estado r02](TRAFICO-CERCANO-r02.md) y las capturas 005–008 se conservan como historial; r01 y las capturas 001–004 también permanecen archivados. La aproximación al hangar sigue retirada.

## Movimiento

Se conserva un único vehículo, al 25 % de la escala original, y el mismo recorrido repetido de arriba a la izquierda hacia el lateral derecho. La cota es constante (10,5 m) y el arco queda en el plano horizontal. La duración inicial pasa de 10 a **40 segundos**, equivalente al **25 % de la velocidad de r02**: aproximadamente 7,15 m/s en el recorrido de 286,10 m. Solo parte del recorrido queda dentro del encuadre; el ciclo se reinicia fuera de él. La GUI permite duraciones entre 20 y 60 s y activación independiente.

La inclinación lateral progresa suavemente y queda limitada a **20°**. El rumbo continúa separado del banking para evitar los giros de casi 90° de la propuesta inicial. La altura y trayectoria no cambian al inclinar el vehículo.

## Silueta y luz

La referencia adjunta `spinner volando alejandose de camara.jpg` muestra una masa oscura legible, con foco central cálido y resplandor alrededor. Se oscurecen carrocería, molduras y cristales, reduciendo sus reflejos. El núcleo luminoso baja de 7 a 2,2 unidades locales de diámetro; el glow pasa de 22 a 7,5 y el halo de 25 a 9, alrededor de una carrocería de unos 5,3 de longitud. Además baja la intensidad del halo y se elimina el destello cruzado amplio. El resplandor tiene borde difuso y un anillo tenue; deja visible la periferia del vehículo. Las pequeñas luces de posición se atenúan y el destello blanco de la cabina queda como acento secundario.

El núcleo cálido alimenta el bloom existente. No se altera la exposición, el cielo ni el ajuste global de bloom. El efecto sigue siendo una aproximación por sprites con prueba de profundidad frente a la arquitectura, no una simulación física de lente.

## Verificación

Ocho pruebas de tráfico y comparación correctas: velocidad al 25 %, escala conservada, una instancia durante diez minutos y 15 ciclos, altura constante, inclinación absoluta ≤20°, cambio de duración sin salto y apagado independiente. Auditoría del GLB con 401 muestras por ruta, sin colisiones; los reinicios quedan fuera de Camera_E y CAM01. Registros `tests-r03.log` y `routes-r03.json`.

Compilación de producción correcta (tres avisos de tamaño de webpack), sin errores de consola durante la revisión WebGPU. El diagnóstico registra cinco pasadas iniciadas, una única instancia y duración de 40 s. GUI comprobada a 20/40/60 s y restablecida a 40 s. La revisión visual de varios fotogramas confirma el foco cálido compacto y una silueta visible alrededor, con el halo reducido; capturas 9.4_009–012 en el [índice](../../capturas/INDEX.md). Registros adicionales: `build-r03.log` y `diagnostico-r03.json`. Pendiente de valoración artística del usuario. La fase 9.5 no se inicia en esta corrección.
