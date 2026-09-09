# Fase 3.1 · Mapas de color, normales y rugosidad

**Completada.** Se auditan las imágenes embebidas, los canales, las UV y las conexiones reales de materiales. No se han encontrado errores de espacio de color que requieran modificar el GLB. Se incorpora una auditoría de sólo lectura al diagnóstico del visor. El acabado artístico se ajustará tras fijar la referencia de color/exposición en 3.2.

Las tres imágenes nuevas del usuario quedan incorporadas como referencias continuadas: [criterios de acabado e iluminación](<../../reference images/README.md>). Screenshot 1 orienta el plano general y el suelo; Screenshot 2, la mesa/cristal/contraluz; Screenshot 3, piedra, bronce y luz lateral. Sus colores incluyen la luz y la gradación de la película: no se copian directamente como albedo ni se hornean halos o haces en las texturas.

## Resultado técnico

| Comprobación | Resultado |
| --- | --- |
| GLB activo | `_phase2.glb`, SHA-256 `bf2108bbe13d32df23bfa34e598c1d98085e2322e859fbf62354240f7e6b8fa2`; intacto |
| Imágenes embebidas decodificadas | 25: 8 colores de superficie + 1 cielo emisivo, 8 normales, 8 mapas empaquetados de rugosidad/metalicidad |
| Espacios de color | 9 imágenes sRGB; 16 imágenes de datos sin conversión de color |
| Materiales | 20 en el GLB y 20 correspondencias por nombre en el Blender fuente |
| Conexiones en navegador | 20 materiales, 25 texturas únicas, sin incidencias de espacio de color, imagen ausente, UV ausente o flipY inesperado |
| Mapas normales | 8 de 1024 × 1024; longitud de vectores decodificados entre 0,9959 y 1,0043; sin componente Z negativa; normales de espacio tangente |
| UV | 114 primitivas texturizadas con UV finitas presentes; todas usan UV0 |
| Muestreo | Repetición, filtro lineal y mipmaps trilineales del export; UV fuera de 0–1 usadas para repetición |

El color base y la emisión usan RGB sRGB; las normales, RGB de datos. La rugosidad usa **G** y la metalicidad **B**, multiplicadas por sus factores de material. Los ocho mapas empaquetados contienen B = 1: los materiales dieléctricos conservan metalicidad 0 y los dos bronces texturizados 0,70/0,72. El archivo se llama `*_roughness`, pero no debe tratarse como un mapa RGB genérico. Estas convenciones se contrastaron con [la especificación glTF 2.0, materiales](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#materials) y con `node_modules/three/examples/jsm/loaders/GLTFLoader.js` de la versión instalada r182.

GLTFLoader ya asignaba los espacios correctos; no se añade una segunda conversión ni se retaggean texturas compartidas. `normalScale.y` aparece negativo en ejecución porque el cargador adapta materiales de geometrías sin tangentes en `assignFinalMaterial`; no es evidencia de un canal verde invertido que deba corregirse manualmente. El archivo conserva las imágenes y normales originales.

## Rangos útiles para la calibración posterior

Valores medidos sobre G del mapa, multiplicado por el factor de rugosidad exportado (1 en estos materiales). Son rangos técnicos, no valores aprobados contra los fotogramas.

| Familia | Rugosidad efectiva mín.–máx. | Intensidad normal exportada |
| --- | --- | --- |
| Caliza ocre | 0,533–0,714 | 0,48 |
| Aristas de caliza | 0,514–0,690 | 0,40 |
| Piedra negra del suelo | 0,114–0,451 | 0,035 |
| Nogal | 0,212–0,420 | 0,20 / 0,65 según material |
| Raíz de nogal | 0,173–0,369 | 0,20 / 0,65 |
| Cuero | 0,306–0,475 | 0,30 / 0,65 |
| Bronce | 0,275–0,447 | 0,25 / 0,65 |
| Hormigón exterior | 0,663–0,827 | 0,30 |

Las variaciones de fuerza entre materiales que comparten imágenes proceden del Blender. El cristal, el papel y algunos metales usan factores constantes y no necesitan mapas por obligación. En particular, la cristalería blanquecina actual no se explica por una textura de color mal etiquetada: no tiene mapa de color. Su material, entorno y transmisión se revisarán en 3.3.

## Hallazgo de UV y límites

Se localizan **236 triángulos con área UV inferior a 10⁻¹²**, repartidos entre 29 primitivas. Suman **0,003052 m² (30,52 cm²)** de superficie local en mallas únicas; el mayor tiene unos **7,32 cm²**. Se conserva cada caso con nombre de mesh/material y área en `texture-audit.json`. Afectan principalmente a arquitectura y bordes; las caras de cuero de la mesa señaladas tienen área geométrica casi nula.

No se remapean automáticamente esas caras: alterar una proyección sin inspeccionar su continuidad puede introducir costuras. Es una limitación conocida para revisar de cerca en 3.3 si se aprecian estiramientos, especialmente antes de aprobar el recorrido libre. La ausencia de errores de conexión no significa que todas las UV sean perfectas ni que el normal mapping sea uniforme sobre esas caras.

La revisión de las láminas confirma variación suave en piedra, veta de madera, cuero oscuro y desgaste localizado del suelo. El brillo amplio del pavimento, la oscuridad del exterior y el aspecto lechoso del cristal siguen pendientes de calibración. La fase 3.1 no valida iluminación final, reflejos ni atmósfera. Para contrastar el aspecto con las nuevas referencias se conservan las capturas de [fase 2](../../phase2/CIERRE.md), incluido [el detalle de referencia](../../phase2/surfaces/clean/cam02.png). No se archivó una nueva captura de detalle en 3.1.

## Evidencia y reproducción

- [texture-audit.json](texture-audit.json): SHA de cada imagen, dimensiones, estadística de canales, roles por material y UV.
- [blender-materials.json](blender-materials.json): SHA del `.blend` fuente, imágenes/espacios, enlaces de nodos y fuerzas normales; lectura sin guardar el archivo.
- [Lámina 1](texture-sheet-1.png) y [lámina 2](texture-sheet-2.png): normales RGB, color RGB y rugosidad G. Son vistas de inspección, no nuevas texturas de ejecución.
- [runtime.json](runtime.json): diagnóstico real de WebGPU con `materialAudit`. Los 25 recursos de textura permanecen compartidos; el análisis no los clona ni cambia sus versiones.
- `npm run test:tyrell`: **13/13 correctas**. Las pruebas nuevas usan GLTFLoader real sobre el GLB activo; en Node se sustituye sólo la decodificación de imágenes por sus dimensiones, y los píxeles se validan por separado con Pillow y el navegador. También se comprueba que la auditoría detecta un recurso usado incorrectamente como color y datos y no lo modifica.
- `npm run build`: correcto, Webpack 5.97.1, **79,752 s**, tres advertencias de tamaño/rendimiento, sin errores. Registro local ignorado: `tyrell-build-phase3-1.log`.

Desde la raíz del repositorio:

```powershell
# Python con Pillow y NumPy; utilizado el runtime local de Codex.
python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-textures.py
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --factory-startup --disable-autoexec --python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-blender-materials.py
npm run test:tyrell
npm run build
```

Los scripts guardan informes e imágenes en esta carpeta; no editan el GLB o Blender. Para el runtime usado aquí, el ejecutable Python con ambas dependencias es `C:/Users/elsur/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`. Tras compilar, recargar producción y abrir **Diagnóstico**. Siguiente entrega: **3.2, gestión de color, AgX y exposición de referencia**.
