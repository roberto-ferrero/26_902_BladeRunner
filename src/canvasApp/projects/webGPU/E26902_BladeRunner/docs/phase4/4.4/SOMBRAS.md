# 4.4 · Sombras solares y cristalería

09/09/2026. Se conserva la luz, exposición y geometría de R01. La entrega ajusta la cámara del mapa de sombras, el filtrado PCF y la atenuación del vidrio. La carpeta archivada R01 no se modifica.

## Parámetros

| Parámetro | R01 | 4.4 |
| --- | --- | --- |
| Cobertura horizontal en espacio de luz | −18 a 18 m | −14 a 14 m |
| Cobertura vertical en espacio de luz | −12 a 12 m | −4 a 10 m |
| Profundidad near/far | 0,1 / 150 m | 50 / 115 m |
| Resolución Baja / Media / Alta | 1024 / 2048 / 2048 | Igual |
| Bias / normalBias | −0,00015 / 0,025 | Igual |
| Radio PCF | 1 | 1,5 |
| Sombra del material Crystal | Opaca | Atenuación nominal 0,22 |

La región proyectada pasa de 864 a 392 m² a la misma resolución. En Media, la huella del texel pasa de aproximadamente 17,6 × 11,7 mm a 13,7 × 6,8 mm. La prueba verifica que las ocho esquinas del volumen de sala x=±12, y=0..8, z=−16..14 permanecen dentro de la cámara para las direcciones calibradas. Es un volumen fijo: no sigue al ratón, evitando saltos por reajustes de encuadre. No se intenta cubrir el exterior lejano. Los modos de cámaras actuales se han revisado; ampliar la sala o incorporar nuevos objetos fuera de ese volumen requiere revisar la cobertura.

Se mantienen los sesgos que no producían acne visible en R01; no se reducen para ganar contraste. El radio PCF suaviza moderadamente los bordes. No representa una penumbra física variable con la distancia ni sustituye la difusión atmosférica pendiente.

## Sombra del vidrio

Three.js r185 ofrece `renderer.shadowMap.transmitted` y `material.castShadowNode`. Se activa la primera opción y se asigna `vec4(0, 0, 0, 0.22)` sólo al material compartido **Crystal**. El adaptador de materiales de WebGPU conserva esta propiedad al crear el material de nodos. La cristalería sigue proyectando sombra, pero deja de parecer un objeto opaco. No se modifica su transmisión, albedo, rugosidad, geometría ni el material visible de los demás objetos.

Es una aproximación artística de atenuación uniforme en el mapa; no calcula espesor óptico, refracción, acumulación de varias capas ni cáusticas. Se conserva la sombra opaca de caja, mesa y sillas. Esta técnica utiliza el color del mapa de sombras en el muestreo y añade ese coste al shader receptor, sin nuevas luces ni pasadas de render. No se afirma coste GPU nulo.

## Verificación y capturas

**24/24 pruebas correctas.** Compilación Webpack 5.97.1 en **55,456 s**, sin errores y con tres advertencias de empaquetado. Código instalado consultado: `ShadowNode.js`, `ShadowFilterNode.js`, `NodeMaterial.js` y `NodeLibrary.js`. GLB y Blender fuente intactos.

Chrome 152, WebGPU, Three.js r185, NVIDIA Turing. Revisados CAM 01/02/04, captura fija, paneo y Baja → Alta → Media. El diagnóstico final confirma `step: 4.4`, sombras transmitidas y mapa 2048. No es un benchmark: las métricas incluyen presentación y múltiples pasadas.

| Comparación | Capturas |
| --- | --- |
| Plano general | [001 · base anterior](../../capturas/4.4_001_2026-09-09_CAM01.png) / [004 · 4.4](../../capturas/4.4_004_2026-09-09_CAM01.png) |
| Cristalería y mesa | [002 · base anterior](../../capturas/4.4_002_2026-09-09_CAM02.png) / [003 · 4.4](../../capturas/4.4_003_2026-09-09_CAM02.png) |
| Cobertura lateral | [005 · CAM 04](../../capturas/4.4_005_2026-09-09_CAM04.png) |
| Diagnóstico | [Estado final CAM 01](../../capturas/4.4_004_2026-09-09_CAM01.json) |

001 y 002 mostraban la página anterior en caché (`step: 4.3`), por lo que se conservan como antes de la corrección. Se forzó una navegación nueva y se comprobó `step: 4.4` antes de 003–005. No se sobrescribió ninguna imagen. Pantallazos de interfaz 1294 × 912 con captura fija 1920 × 800 reducida; sin paneo dentro de la captura. El JSON final registra el visor después de probar paneo, no la pose neutral de la imagen.

CAM 02 muestra sombras tenues bajo el vidrio y sombras opacas conservadas en la caja. CAM 01 mantiene el sol junto al pico, la cara de pirámide iluminada y la sombra del mobiliario en el pavimento. CAM 04 no muestra cortes del límite de sombras en las superficies revisadas. Las zonas de suelo alcanzadas por pequeñas fugas o reflejos solares pueden cambiar al aumentar precisión; contactos/fugas globales quedan en 4.6.

Para volver al comportamiento de sombras R01: usar la cámara y radio de la columna R01, desactivar `shadowMap.transmitted` y retirar `castShadowNode` de Crystal antes de construir el renderer. Intensidades y exposición ya coinciden con R01. El siguiente punto es **4.5 · Iluminación indirecta**.
