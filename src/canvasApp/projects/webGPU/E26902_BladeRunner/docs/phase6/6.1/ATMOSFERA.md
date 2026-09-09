# 6.1 · Profundidad exterior y bruma interior

**Corrección posterior en 6.2:** se detectó que los cambios de bruma no refrescaban consistentemente todos los materiales compartidos. Se corrigió declarando la ruta de color como nodo, sin cambiar color ni mapas. Las capturas de esta página son históricas; la comparación con controles efectivos y la restauración verificada están en [6.2 · Volumen](../6.2/VOLUMEN.md).

Dos aportaciones independientes, reversibles, implementadas en `TyrellAtmosphere.js` con TSL y `scene.fogNode` de Three.js 0.185.1. Se conserva la exposición, iluminación y respuesta de los materiales de R01. Los archivos Blender/GLB y la referencia R01 archivada no cambian.

## Ajuste y reproducción

En **Atmósfera**, activar **Profundidad exterior** y/o **Bruma interior**. Cada una tiene intensidad de 0 a 2; valor de revisión 1. Al recargar ambas arrancan apagadas. Para reproducir las capturas de esta entrega, activar también Reflejo del suelo (Piedra pulida, resolución automática, actualización adaptativa) y Reflejos en metal y vidrio. Usar CAM 01, calidad Media, Tyrell v1, luz 4.2, Base R01 indirecta y 0 EV.

| Parámetro | Valor |
| --- | --- |
| Separación de profundidad | Plano mundial z = −14,4 m, aproximación al fondo de la sala |
| Densidad exterior base | 0,00025 /m |
| Densidad interior base | 0,0015 /m |
| Color exterior / interior | sRGB #ae8050 / #635344, convertidos a lineal |
| Recorrido interior máximo | 24 m |
| Mezcla máxima exterior / interior | 35 % / 6,5 % |

Se calcula qué fracción del segmento cámara–superficie pertenece al semiespacio exterior; el resto corresponde al interior, con recorrido limitado. La atenuación de cada tramo es `1 − exp(−densidad × distancia)`. Se mezcla primero el exterior y después la bruma interior. Se mantiene el alfa. El cálculo usa la cámara de cada render, incluyendo la cámara reflejada y las caras del cubemap; no depende de un encuadre fijo ni añade ruido temporal.

El cielo fotográfico y el sol están excluidos: su textura ya contiene perspectiva atmosférica. Las luces no cambian, por lo que la bruma no altera el shadow map. Los controles invalidan tanto la caché planar como la captura de metal/vidrio. El diagnóstico registra ajustes y densidades; el nombre de la captura exportada incorpora intensidades efectivas `ext` e `int`.

## Decisión visual

El primer exterior (densidad 0,002 /m, captura 002) aclaraba demasiado las caras del edificio y queda **descartado**. Se reduce ocho veces la densidad antes de la propuesta final. La bruma interior aislada (003) es deliberadamente sutil: conserva las sombras del mobiliario y el reflejo largo del pavimento.

La referencia cinematográfica sigue teniendo una dispersión más localizada, halo solar y haces suaves. Esta entrega separa las capas para poder trabajarlas; no declara fidelidad final ni crea una nueva versión R02.

## Validación

- `npm.cmd run test:tyrell`: **33/33** pruebas correctas, incluyendo activación independiente, límites de intensidad, exclusión del cielo y restauración. La compilación GPU de los nodos se comprueba en el navegador.
- `npm.cmd run build`: correcto en **39,597 s**, con las tres advertencias existentes de tamaño de empaquetado.
- WebGPU r185: captura fija y render vivo desde CAM 01, 02 y 04. Paneo observado con desplazamiento (+0,176; −0,100) m. Capturas 001–009 conservadas, incluyendo ensayo descartado y base restaurada.
- Diagnóstico 005: ambas capas a intensidad 1, reflejos activos, 59,9 FPS / 16,69 ms RAF a 893 × 372, Media; 277 dibujos y 603.323 triángulos/pasadas. Sin incremento de dibujos respecto a la base estática observada (277). No permite concluir un coste GPU exacto.
- Diagnóstico 008: sonda actualizada tres veces (activación y cambios atmosféricos), sin nuevas capturas por alternar cámaras. El reflector reutiliza vistas y vuelve a renderizar durante paneo.
- Base restaurada 009 frente a 001: píxeles idénticos en el rectángulo de escena del diálogo (x 46–846, y 294–626), excluyendo interfaz. Sin modificación visual en la conversión a PNG.

## Límites

- Es profundidad analítica, no transporte físico de luz ni un volumen cerrado. El plano y el límite de 24 m son una aproximación artística para las cámaras de revisión. Antes del recorrido libre hay que revisar los límites laterales y superiores.
- No produce haces, polvo, sombras dentro de la bruma ni oclusión volumétrica por columnas. Corresponden a 6.2 y 6.3; una niebla uniforme no los sustituye.
- El reflector conserva su aproximación aditiva de 5.2. La mezcla atmosférica en la imagen reflejada y en la superficie receptora no equivale a integrar exactamente un camino especular. La sonda local conserva su limitación sin paralaje.
- No añade geometría, texturas, render targets ni pasadas. Sí añade operaciones por fragmento mientras esté activada, también en capturas auxiliares. Las medidas RAF no son tiempo GPU.

Las capturas y estados se registran en [INDEX.md](../../capturas/INDEX.md). Siguiente punto: **6.2 · Haces de luz y polvo**.
