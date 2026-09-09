# 3.6 · Recursos compartidos entre sillas

Completado el 09/09/2026. Las cuatro sillas conservan geometrías, materiales y texturas compartidos después de cargar el GLB y cambiar de acabado. No se ha encontrado una duplicación que requiera modificar el visor o el modelo. Se añade una auditoría reproducible y una prueba de regresión sobre el recurso real.

## Resultado

| Recurso | Resultado |
| --- | ---: |
| Sillas | 4 |
| Objetos Mesh de sillas | 24: seis partes por silla |
| Geometrías únicas de las sillas | 6, compartidas entre las cuatro |
| Materiales únicos de las sillas | 6, compartidos entre las cuatro |
| Texturas únicas de las sillas | 12, compartidas |
| Ciclos de comparación de acabado | 10 |
| Recursos de la escena liberados exactamente una vez | 175 |
| Imágenes cerradas exactamente una vez | 25 |

Los seis materiales corresponden a nogal, cuero, raíz de nogal, latón, bronce y cavidades. La comprobación usa identidad de objetos JavaScript, no sólo igualdad de nombres o valores. Los cuatro nodos de silla del GLB hacen referencia al mismo mesh 67; GLTFLoader conserva las referencias compartidas de sus seis primitivas.

Cada ciclo aplica Tyrell v1, desactiva la normal del pavimento, vuelve al acabado importado y reactiva la normal. Se comprueba que todos los Mesh de la escena mantienen geometría, material, posición, orientación y escala; las conexiones de texturas y sus versiones no cambian, y los colores importados se recuperan sin acumulación de tintes.

La limpieza usa el `disposeScene` real del proyecto: se cuentan los eventos de liberación de 130 geometrías, 20 materiales y 25 texturas del GLB. Cada uno se libera una sola vez, aunque esté referenciado por varios objetos. Las 25 imágenes simuladas también reciben una única llamada a `close()`.

Compartir recursos **no equivale a instanciar el dibujo en GPU**: siguen existiendo 24 objetos Mesh de sillas. No se afirma una reducción de llamadas de dibujo o una mejora de FPS. Una posible agrupación o instanciación corresponde a 8.4 y deberá conservar materiales, sombras y control de objetos.

## Reproducción

Desde la raíz del repositorio:

```powershell
node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-shared-chairs.mjs
npm.cmd run test:tyrell
```

- [shared-chairs.json](shared-chairs.json): informe de esta ejecución.
- `scripts/audit-shared-chairs.mjs`: carga real de GLTFLoader, aplicación de TyrellLook y limpieza de TyrellAssets.
- `tests/shared-chairs.test.mjs`: incorpora la comprobación al conjunto de pruebas del proyecto.

**Validación: 19/19 pruebas correctas**, incluida la nueva regresión con las cuatro sillas reales.

Motor inspeccionado: Three.js r185. GLB activo sin cambios, SHA-256 `bf2108bbe13d32df23bfa34e598c1d98085e2322e859fbf62354240f7e6b8fa2`. Los archivos Blender y mapas originales se conservan.

La auditoría se ejecuta en Node y sustituye la decodificación de imágenes por objetos con dimensiones PNG y contador de cierre. Comprueba conexiones, identidad y ciclo de vida del código, no memoria GPU, decodificación real ni fidelidad visual. No se cambia código de ejecución ni apariencia; se conservan las evidencias WebGPU de 3.4 y no hace falta recompilar para esta entrega.

## Continuidad del plan

**3.6 cerrado. La fase 3 aún no está cerrada:** falta la revisión general de acabados y de las UV colapsadas de otros materiales en **3.3**. Ese es el siguiente paso recomendado antes de comenzar **4.1**, dirección del sol, cielo y contraste interior/exterior.
