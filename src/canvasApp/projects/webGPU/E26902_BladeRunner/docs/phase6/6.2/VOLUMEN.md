# 6.2 · Haces solares y polvo suspendido

La observación del usuario sobre la escasa visibilidad de la bruma de 6.1 se aborda añadiendo dispersión iluminada, sin subir globalmente aquella capa. `TyrellLightVolume.js` integra muestras en un volumen interior y consulta el mapa de profundidad de la sombra solar existente. Se compone mediante TSL con `TyrellAtmosphere`, conservando las capas independientes de 6.1.

## Uso

En **Atmósfera**, activar **Haces de luz**. **Intensidad de haces** controla la dispersión de 0 a 2. **Polvo en suspensión** añade variación de densidad en coordenadas mundiales; **Movimiento del polvo** controla la deriva, y 0 la congela. No son sprites ni grano de pantalla: se representa polvo fino como densidad volumétrica continua.

El volumen puede activarse sin las dos capas de profundidad de 6.1. Todo arranca desactivado salvo la opción de polvo, que sólo tiene efecto cuando se activan los haces. R01, las luces, los materiales y los archivos Blender/GLB no se modifican.

## Implementación y coste

- Integración cámara–superficie visible, recortada por una caja en coordenadas mundiales. El límite de primer plano evita extender la bruma hasta la cámara general.
- 24/40/64 muestras en Baja/Media/Alta. Muestras centradas, sin jitter de pantalla ni acumulación temporal. Comparación de profundidad solar por muestra; aproximación de dispersión simple, con mayor aporte a contraluz.
- Dispersión y ligera extinción sobre el color lineal antes de AgX. El polvo varía lentamente en el espacio mundial y se pausa al desactivar el efecto. No incluye partículas individuales reconocibles.
- No crea geometría, texturas, mapas de sombras ni pasadas adicionales. Añade trabajo por fragmento, también al reflector. La deriva del polvo invalida la caché planar a 10 Hz; congelarlo permite reutilizar vistas quietas. Movimiento de cámara y cambios de escena mantienen la invalidación inmediata. El tiempo acumulado se limita a 50 ms por fotograma tras pausas, por lo que no es un reloj de reproducción absoluto.
- La sonda metal/vidrio se actualiza al cambiar controles, pero no cada fotograma del polvo. Es una aproximación deliberada para evitar seis renders continuos de la sala.
- Se reutilizan el mapa y la matriz del sol incluso cuando la calidad reemplaza la luz. El módulo no es dueño de esos recursos y no los libera.

Se ha consultado el código instalado de `GodraysNode`, `ShadowNode` y `VolumetricLightingModel` de Three.js 0.185.1. Este último excluye luces direccionales de su evaluación directa, por lo que se usa una integración propia que consulta la sombra direccional. No se instala ni actualiza ninguna dependencia.

## Parámetros y revisión

Caja: x ±9 m, y 0,08–8 m, z −14,4–2 m. Densidad base de integración 0,004 /m; escala de radiancia solar 0,18, multiplicada por la intensidad y color reales del sol. Variación de densidad del polvo ±28 %. Intensidad y velocidad de revisión: 1. El sol visible, la dirección de la luz y la exposición siguen siendo los de R01.

El primer ensayo (002) se descarta por lavar la piedra. La propuesta acotada (003–005) deja los primeros planos más oscuros y hace perceptible el aire detrás del mobiliario. Se conservan los reflejos largos del suelo. No se declara aún equivalencia con los fotogramas: falta afinar la forma de los haces, el halo y la gradación final.

La revisión de restauración descubrió un defecto previo de 6.1: los cambios de uniforms de niebla de escena no se refrescaban consistentemente en todas las mallas que compartían un material estándar. `NodeMaterialObserver.containsNode()` de r185 inspecciona nodos del material; los de `scene.fogNode` no bastan para marcar esa dependencia. Esto explica que la bruma indicada como activa resultase casi imperceptible en parte del modelo. El [diagnóstico del shader](shader-audit.json) ayudó a descartar valores incorrectos y doble composición.

Se declara `colorNode = materialColor` en los materiales que no tenían nodo de color. Es la misma ruta de color y mapa que usa el material estándar, pero el observador reconoce la dependencia dinámica. Se conservan las propiedades originales y se restauran al liberar la escena. Los controles actualizan uniforms; no se usan los reinicios de prueba, fotogramas intermedios ni renders de limpieza. Una vez creado, el grafo del volumen permanece disponible y el bucle se omite cuando su intensidad efectiva es cero. El origen se obtiene de la matriz mundial de la cámara de cada render.

Validación final: 027 y 029 (antes y después de activar/apagar haces) tienen **píxeles idénticos** en el rectángulo de escena del diálogo, x 46–846 / y 294–626. La base sin atmósfera 030 también coincide exactamente con 6.1/009. La profundidad activada ahora sí aplica ambos controles, por lo que la captura 027 difiere de la antigua 001, que sufría el defecto. La referencia R01 archivada no cambia. Propuesta de revisión final: **031–033**.

## Mediciones

Mismo visor, CAM 01, Media, 893 × 372, ambos reflejos activos y capas de 6.1 a intensidad 1. Intervalos RAF de 120 muestras tras calentamiento; no equivalen a tiempo GPU ni a rendimiento a 1920 × 800.

| Ensayo | FPS / media RAF | Dibujos en la muestra | Evidencia |
| --- | --- | --- | --- |
| Polvo animado, reflejo recalculado continuamente | 32,1 / 31,15 ms | 358 | `6.2_003_2026-09-09_CAM01.json` |
| Volumen sin polvo, vista estática | 50,9 / 19,63 ms | 277 | `6.2_006_2026-09-09_CAM01.json` |
| Polvo animado, actualización planar limitada | 59,9 / 16,70 ms | 277 en fotograma reutilizado | `6.2_009_2026-09-09_CAM01.json` |
| Entrega final, polvo animado y actualización de materiales corregida | 56,9 / 17,58 ms | 358 en fotograma con reflejo actualizado | `6.2_031_2026-09-10_CAM01.json` |

La versión limitada alterna renders del reflejo y reutilización; 277 no representa todos los fotogramas. Las tres primeras mediciones son ensayos anteriores a corregir el observador y se conservan como histórico, no como un benchmark controlado de la versión final. Se observaron variaciones entre vistas y durante compilación/capturas. Alta sigue teniendo un coste considerable: la captura 008 muestra unos 31,8 FPS a 1339 × 558 con polvo apagado. Los perfiles requieren más medición en fase 8; no se garantiza 60 FPS a pantalla completa.

Revisión visual en CAM 01/02/04, paneo y perfiles Baja/Alta. **35/35 pruebas correctas**: propiedad de recursos de sombra, inicio diferido, pausa del polvo, límites de tiempo, cadencia del reflector, sustitución de luz, detección de nodos por el observador real y restauración de materiales/grafos, además de las regresiones existentes. El navegador valida la compilación GPU, que no ejecutan las pruebas unitarias. Build final correcto en **38,127 s**, con las tres advertencias existentes de empaquetado.

Capturas originales y ensayos descartados se conservan en [el registro cronológico](../../capturas/INDEX.md).

## Límites que revisar en 6.3

La consulta de profundidad ya introduce oclusión geométrica, pero falta la auditoría de todas las columnas y encuadres, así como bandas, ruido y estabilidad temporal. Se usa la profundidad opaca de la sombra; la transmisión coloreada/parcial de cristalería no está integrada en la dispersión. La caja y el modelo de dispersión son artísticos; no simulan rebotes múltiples ni un medio físico calibrado. El cielo fotográfico y el disco siguen excluidos de la composición atmosférica. La combinación con el reflector aditivo de 5.2 conserva sus aproximaciones.

El punto 6.3 permanece abierto aunque el primer ensayo de oclusión funcione. Halo solar, bloom y gradación final pertenecen a 6.4. La revisión visual del usuario sigue siendo necesaria para fijar el acabado.
