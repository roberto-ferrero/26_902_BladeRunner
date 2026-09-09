# 4.5 · Comparación de iluminación indirecta

09/09/2026. **Decisión: conservar Base R01**, con las sombras de 4.4. Se implementan dos ensayos reversibles para comparar sonda difusa y entorno; ninguno mejora suficientemente el equilibrio de referencia para activarlo por defecto. No se modifica el archivo histórico R01.

## Qué se ha comparado

| Opción del GUI | Implementación | Resultado |
| --- | --- | --- |
| Base R01 | Ambiente hemisférico 0,86 y rellenos existentes | Conserva el contraste del pavimento y la lectura acordada |
| Sonda difusa · ensayo | LightProbe con nueve coeficientes SH RGB, intensidad 0,35; ambiente al 92 % | Variación contenida en piedra; mejora insuficiente para sustituir la base |
| Entorno · ensayo | Mismo campo de radiancia como textura equirectangular, intensidad 0,35; ambiente al 92 % | Aclara mucho el suelo y reduce contraste/contactos; descartado como base |

La fuente de ambos ensayos es un campo artístico lineal de 64 × 32, con componente cálida orientada al ventanal y componente superior tenue. **No procede de una captura de la sala ni calcula GI, oclusión o rebotes entre objetos.** La sonda integra ese campo sobre la esfera y sólo aporta difuso; el entorno usa la ruta de prefiltrado de WebGPU y afecta también a superficies especulares. No reproduce los reflejos geométricos de columnas y mobiliario previstos en fase 5. El cielo visible, sol, cámaras, materiales y exposición permanecen iguales.

## Decisión sobre horneado

No se hornea ni se añade un lightmap en esta entrega: estas comparaciones no demuestran aún una mejora espacial que lo justifique. Un horneado de indirecta real requeriría atlas UV sin solapamientos, separación de directa/indirecta y revisión del mobiliario repetido; añadirlo ahora sin esa validación puede fijar errores y dificultar cambios. No se concluye que un bake no pueda mejorar la escena. Reconsiderarlo si la revisión 4.6 demuestra que contactos y oclusión requieren rebotes espaciales, conservando una comparación contra R01 y midiendo tamaño/resolución.

## Integración y controles

**Color y materiales → Luz indirecta** contiene las tres opciones. El modo inicial es Base R01. `TyrellIndirect.js` conserva y restaura entorno e intensidad originales; cada cambio parte de las intensidades del perfil, sin acumular multiplicadores. Los ensayos se excluyen del modo estudio y de los aislamientos de sol/áreas; quedan disponibles con composición completa o sólo ambiente. Al volver del estudio se recupera la selección. Nombres de captura y diagnóstico incluyen el modo.

WebGPU r185 dispone de `LightProbeNode` en `StandardNodeLibrary`; usa SH sobre la normal mundial. El entorno equirectangular se procesa mediante la ruta de entorno del renderer. La textura fuente tiene 8192 bytes de píxeles; hay una sonda y sus 27 coeficientes. El entorno añade recursos de prefiltrado y muestreo cuando se usa. No se añade geometría ni una captura de cubo por fotograma. Los recursos de prefiltrado pueden permanecer en caché tras volver a Base R01; no se afirma coste cero. Al destruir el proyecto se restaura el entorno y se libera la textura fuente y la sonda.

## Evidencia

Capturas de interfaz 1294 × 912 con render de referencia 1920 × 800 reducido, Media, Tyrell v1, luz R01 con sombras 4.4, 0 EV, composición completa y sin paneo en la captura. Comparadas con las referencias del usuario: el entorno uniforme debilita el suelo oscuro y los contactos; ninguno añade profundidad atmosférica.

| Cámara | Base | Sonda | Entorno |
| --- | --- | --- | --- |
| CAM 01 | [001](../../capturas/4.5_001_2026-09-09_CAM01.png) | [002](../../capturas/4.5_002_2026-09-09_CAM01.png) | [003](../../capturas/4.5_003_2026-09-09_CAM01.png) |
| CAM 02 | [006](../../capturas/4.5_006_2026-09-09_CAM02.png) | [005](../../capturas/4.5_005_2026-09-09_CAM02.png) | [004](../../capturas/4.5_004_2026-09-09_CAM02.png) |
| CAM 04 | [009](../../capturas/4.5_009_2026-09-09_CAM04.png) | [007](../../capturas/4.5_007_2026-09-09_CAM04.png) | [008](../../capturas/4.5_008_2026-09-09_CAM04.png) |

Diagnósticos: [base restaurada](../../capturas/4.5_001_2026-09-09_CAM01.json), [sonda](../../capturas/4.5_007_2026-09-09_CAM04.json), [entorno](../../capturas/4.5_008_2026-09-09_CAM04.json). Son estados del visor, no benchmarks de GPU.

**25/25 pruebas correctas.** Restauración tras cinco ciclos, exclusión en estudio/aislamiento, irradiancia finita no negativa en los seis ejes y liberación comprobadas. Compilación Webpack 5.97.1 en **44,434 s**, sin errores y tres advertencias de empaquetado. Navegador Chrome 152, WebGPU r185, NVIDIA Turing. Revisados selectores, captura y regreso del modo estudio. El diagnóstico final confirma ambiente 0,86, sonda a cero y entorno experimental desactivado.

Siguiente: **4.6 · Fugas de luz, contactos y detalle en sombras**. La entrega cierra la comparación de opciones, no declara resuelta una solución de GI física.
