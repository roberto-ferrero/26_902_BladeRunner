# 5.5 · Entorno local para bronces y cristalería

09/09/2026. Control **Reflejos en metal y vidrio** en Color y materiales. Captura la propia sala desde **[0, 1,4, −10,2] m**, junto a la mesa, mediante CubeCamera y un cubemap de seis caras de **128 × 128**, HalfFloat. El nombre `WebGLCubeRenderTarget` pertenece a la clase de Three.js, también utilizada aquí por el renderer WebGPU instalado; el backend verificado sigue siendo WebGPU.

La captura se asigna sólo a cinco materiales: `Brass | polished highlights`, `Bronze | patinated`, `PBR | Laton envejecido`, `PBR | Bronce patinado` y `Crystal`. Intensidad 0,6 en metales y 0,35 en vidrio. El pavimento y `scene.environment` conservan su configuración; no se repite el aclarado global del suelo del ensayo 4.5.

La fuente contiene la iluminación y geometría de la sala. Durante la captura se ocultan los receptores metálicos/de vidrio y se suspende la contribución planar del suelo para evitar autorreflexión y pasadas recursivas. Se restauran inmediatamente materiales y visibilidad. La captura se realiza al activar o cambiar iluminación/acabado/calidad, no cada fotograma ni al cambiar sólo de cámara. El renderer prepara el entorno filtrado para los materiales PBR.

La comparación CAM 02 muestra una aportación contenida en contornos y caras de vidrio/metal, conservando el brillo de la mesa y la penumbra. Se mantiene como control reversible, desactivado al arrancar junto al reflector planar; R01 archivado no se modifica. El visor de revisión se deja con ambos activados.

## Límites y coste

Es una única sonda local: no tiene corrección de paralaje para objetos alejados, no refleja al propio receptor y no sustituye reflejos ray traced ni caústicas. El cubemap refleja también las limitaciones del decorado vistas en 5.3. No se afirma una solución físicamente completa del vidrio.

Actualizar cuesta seis renders de sala más la preparación del entorno filtrado. Se conserva un cubemap, en lugar de crear uno por objeto. Los receptores comparten el mismo recurso y los originales se restauran al desactivar/destruir. Las pruebas comprueban selección de materiales, ausencia de cambios en el entorno global/piedra, captura sólo al invalidar y restauración de visibilidad y nodos incluso ante un fallo de captura.

[Comparación y diagnósticos](../../capturas/INDEX.md). El diagnóstico `specularEnvironment` registra activación, posición, materiales, capturas y estado pendiente. [Primer diagnóstico](../../capturas/5.5_002_2026-09-09_CAM02.json): una captura completada, sin actualización pendiente.

[Diagnóstico final](../../capturas/5.5_005_2026-09-09_CAM01.json): tres capturas locales tras activar, pasar a estudio y restaurar R01. Cambiar luego de cámara no añade capturas de entorno. El reflector mantiene tres targets, modo adaptativo y escala 0,5. CAM 01 quieta registra 277 dibujos; los contadores internos de geometrías/texturas incluyen ahora los recursos de preparación del entorno, no nueva geometría del modelo. Resultado dejado en CAM 01/Media con ambos reflejos activos.

Validación conjunta 5.3–5.5: **32/32 pruebas correctas**, compilación Webpack 5.97.1 correcta en **85,609 s**, tres advertencias de empaquetado existentes. Fuentes contrastadas en las implementaciones instaladas de ReflectorNode, CubeCamera y MaterialNode (Three.js 0.185.1). Sin actualización de dependencias.

Siguiente punto: **6.1 · Profundidad atmosférica del exterior y bruma interior**.
