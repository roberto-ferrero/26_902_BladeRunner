# 6.7 · Prueba de cielo panorámico completo

## Revisión v3 · Recuperar la composición del cielo original

La v2 también fue rechazada: mantener la cámara no bastaba para mantener el encuadre visual. El panorama generado cambió el tamaño de las nubes y su inclinación 25° cambió su posición aparente. La afirmación anterior de encuadre conservado era demasiado amplia.

La v3 vuelve a muestrear la fotografía original mediante la intersección del rayo de cada cámara con el plano original (z = −900, x ±500, y −240…260). No aplica rotación ni cambio de escala a esa proyección. El plano físico permanece oculto: todo se dibuja en el fondo. El panorama v2 se utiliza fuera de la fotografía.

La unión se realiza **dentro** del perímetro de la foto: peso cero en el borde, uno al llegar al 12 % de su ancho/alto, con transición suave. A diferencia de v1, no hay plano superpuesto ni píxeles del borde prolongados hacia fuera. Esto conserva la región central y evita el corte duro; la franja periférica sí cambia y puede mostrar mezcla de formas. No es una nueva imagen generada ni se promete conservación exacta de toda la esfera. El control sigue recuperando el plano original para comparar.

Las secciones v1 y v2 siguientes se conservan como historial de resultados rechazados.

Validación v3: compilación correcta (75,730 s, tres avisos de tamaño), 42/42 pruebas correctas. Capturas 6.7/014–017: original y v3 en CAM01, más laterales D/F, con polvo desactivado. Las formas de las nubes del encuadre frontal vuelven a su posición y escala originales. La región central de comparación presenta diferencia media RGB de 0,69 / 0,63 / 0,85 sobre 255; no se afirma igualdad de píxeles. [Medición](comparison-v3.json) sobre capturas de interfaz reducidas, originalmente JPEG, almacenadas como PNG. D/F no muestran el corte duro de v1, aunque sigue siendo visible la diferencia de escala/detalle del panorama lateral generado. Queda pendiente de valoración visual; el visor se deja en CAM01, panorama y polvo activos.

## Revisión v2 · Sustitución por un único panorama

**La v1 descrita más abajo fue rechazada por el usuario.** Sus capturas laterales muestran límites rectangulares y nubes estiradas. La validación de tres cámaras fue insuficiente para detectar el problema. Se retira del render la combinación de plano original y prolongación por coordenadas UV limitadas.

La v2 usa una sola textura equirectangular de 360 × 180°, generada a partir del cielo original: `static/textures/E26902_BladeRunner/sky-panorama-v2.png`, 1774 × 887 píxeles. [Prompt exacto y procedencia](PROMPT-V2.md). Nuevos sectores de nubes mantienen la gama ámbar; no se añaden discos solares. El fondo se inclina 25° para encuadrar el banco de nubes. La unión posterior y los polos se suavizan en el shader; no hay mezcla con el rectángulo original ni prolongación estirada de sus bordes.

Con **Cielo panorámico** activo, el plano original está oculto. Al desactivarlo se recupera la fotografía original. Se conservan intactos el GLB, las cámaras, el disco solar y las luces. La sonda de metal/vidrio sigue capturando temporalmente el fondo original, incluida su visibilidad, y restaura el panorama incluso si la captura falla. El reflejo planar sí refleja el panorama nuevo.

Esta revisión conserva el encuadre geométrico y la posición del sol, pero **no conserva píxel a píxel las nubes originales**. El generador ha reconstruido las formas y su escala; la resolución angular del nuevo recurso es menor. La equivalencia visual exacta medida en v1 ya no aplica a v2. Se entrega como revisión para valorar su acabado.

### Validación v2

Compilación de producción correcta en 68,905 s, con tres avisos de tamaño de Webpack; 42/42 pruebas correctas en 31,319 s. La prueba de cielo comprueba ocultación/restauración del plano, conservación del recurso original, fondo de la sonda y restauración tras una excepción.

Revisadas en WebGPU CAM01, CAM02, Camera_D, Camera_E y Camera_F. D y F muestran los laterales de las capturas aportadas por el usuario: ya no aparecen los límites verticales del rectángulo ni las franjas estiradas. Se ha comprobado también que desactivar el panorama recupera el cielo original en CAM01. Esto no equivale a un barrido exhaustivo de cada dirección de la esfera.

Seis nuevas capturas, **6.7/008–013**, con calidad Media y efectos/polvo activos, añadidas al [índice cronológico](../../capturas/INDEX.md). 008: general; 009: D; 010: E; 011: F; 012: mesa; 013: original recuperado. La última es una comparación, no el estado final: el visor queda en CAM01 con panorama activo. Imagen v2: 1.742.308 bytes. No se ha medido su coste GPU de forma aislada.

## Historial v1 · Rechazado

Ampliación de la fase 6 solicitada por el usuario para cubrir las direcciones donde terminaba el fondo de nubes. Se conserva el plano original de 1.000 × 500 m, x ±500, y −240…260, z −900; no se modifican sus vértices, UV, textura, material ni posición. El disco solar y la luz direccional siguen separados.

## Implementación

Fondo esférico de Three.js WebGPU mediante `scene.backgroundNode`: se dibuja al fondo, sin recorte por distancia ni iluminación/fog de la sala. El panorama generado ocupa las direcciones que antes mostraban el color de limpieza. El rectángulo original sigue delante y aporta las nubes exactas del encuadre existente.

En el borde se proyecta la textura original usando la intersección del rayo de cada cámara con z = −900. Una banda de transición exterior, de anchura 0,18 en UV, conecta el color del borde con el panorama. Dentro del rectángulo el fondo reutiliza esa misma proyección, aunque normalmente queda tapado por el plano original. Los extremos longitudinales del panorama se mezclan en un 2,5 % y los polos en un 4 % para evitar cortes de textura. La banda puede suavizar/estirar detalle de borde: es una solución de continuidad para esta prueba, no una reconstrucción de las nubes fuera de la foto.

El panorama mantiene la escala emisiva del material original. No se asigna a `scene.environment` ni se introduce otra luz. La sonda de metal/vidrio se calcula temporalmente con el fondo anterior; el reflejo planar puede recoger cielo en regiones que antes no lo tenían. El modo de estudio oculta la extensión, igual que el cielo original.

Control **Atmósfera → Cielo panorámico**, activo al arrancar. Desactivarlo restaura el fondo anterior; la escena original no se elimina. La ampliación se libera al cerrar el proyecto sin disponer la textura original prestada.

## Recursos

- `static/textures/E26902_BladeRunner/sky-original.png`: extracción exacta de la imagen embebida `amber_clouds`, guardada como referencia para la generación; el render sigue usando la textura del GLB.
- `static/textures/E26902_BladeRunner/sky-panorama-v1.png`: imagen generada con la habilidad imagegen, usando el cielo original como referencia. 1774 × 887 píxeles, proporción 2:1, 1.618.070 bytes. No contiene otro disco solar. Se pidió un panorama mayor, pero se conserva y declara la resolución realmente entregada.
- Proyección y mezcla en `TyrellSky.js`. Se reutiliza la esfera de fondo de baja densidad del renderizador; no se modifica ni reexporta el GLB.

La generación amplía el entorno visual, no sustituye la región aprobada. Los bordes se resuelven en el shader, sin pintar sobre el original. La [documentación de Scene](https://threejs.org/docs/pages/Scene.html) distingue fondo y entorno de iluminación; la implementación concreta se contrastó con `Background.js` de Three.js r185 instalado.

## Alcance

Prueba reversible, pendiente de revisión visual del usuario. El fondo da cobertura 360 × 180°; no añade edificios donde no existen y tampoco convierte el panorama de resolución moderada en un HDR físico. Su detalle fuera de la región original es menor y debe valorarse durante el futuro recorrido libre. R01 archivado permanece intacto.

## Validación · 10-09-2026

- WebGPU, calidad Media, siete efectos activos. Polvo desactivado para las comparaciones 001–006 y restaurado en 007. Revisadas CAM01, CAM02 y CAM04; no se ha realizado un barrido visual exhaustivo de todas las direcciones.
- CAM02: el hueco oscuro situado en la ventana superior izquierda se cubre con cielo; desactivar el control lo reproduce. Comparación directa: capturas 004 y 005.
- CAM01: se conserva el encuadre. Comparación 001/003 sobre el área de imagen reducida: diferencia absoluta media por canal de 0,00163 sobre 255; región central del cielo sin diferencias. Son capturas de interfaz originalmente codificadas como JPEG y después almacenadas en PNG, no una prueba de igualdad de los render targets HDR. Regiones y resultados en [comparison.json](comparison.json).
- CAM04: continuidad visual revisada desde la vista lateral. La banda de prolongación muestra menos detalle que la fotografía; queda a valoración del usuario.
- Capturas cronológicas 6.7/001–007 registradas en [el índice](../../capturas/INDEX.md). El visor queda en CAM01, Media, panorama y polvo activos.
- 42/42 pruebas correctas (`npm run test:tyrell`), incluidas conservación del original, conmutación, aislamiento de la sonda y liberación de la nueva textura. Compilación de producción correcta, 84,610 s, con tres avisos de tamaño de Webpack.
- CAM02 sin/con panorama: 233 dibujos en ambos casos; 432.281 → 434.265 triángulos por pasadas en la lectura de interfaz. Esto no constituye una medición controlada del coste GPU; el recurso añade 1,62 MB de descarga y una evaluación del fondo.
