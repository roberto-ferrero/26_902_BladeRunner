# Portfolio en la escena Tyrell

El build arranca directamente en **p1**, con el visor cerrado. Tras cargar y estabilizar la escena, un fundido desde negro de **1,5 s** revela la vista. Al finalizar se espera **1 s** y se despliega el Voight-Kampff (5 s). Cuando termine de abrirse, los haces aparecen durante 180 ms hacia la columna fuera de pantalla; después la columna entra por la derecha con easeOut cúbico (1,5 s). El GPU Score solo se mide al arrancar; la entrada y la navegación no se interrumpen con una segunda comprobación. La preferencia del sistema de movimiento reducido omite el fundido animado y la entrada lateral.

La rueda funciona sobre la escena y las franjas negras; los controles GUI conservan su propio scroll. También funcionan flechas, Inicio/Fin, RePág/AvPág y espacio. El paneo permanece activo sobre las cards. Salir de p1, pasar a cámara libre o cerrar el visor (V) oculta el portfolio, detiene los vídeos y conserva la posición vertical. El regreso repite la entrada desde la derecha.

## Contenido

`static/portfolio/` contiene una copia independiente de `assets/data.json`, `assets/experiments.json`, los 75 archivos de imagen necesarios, la biografía extraída de `#content_bio` y Asap descargada de Google Fonts. Los enlaces externos y los vídeos de YouTube siguen apuntando a sus destinos originales. No hay dependencia de rutas de disco del portfolio original.

Orden: About myself, 34 proyectos y 6 experimentos. Los ids DOM llevan un prefijo por catálogo, ya que `p_22504` está repetido en ambos JSON. Se mantiene el color de cada entrada. `media-sizes.json` reserva las dimensiones antes de cargar las imágenes y evita saltos del scroll.

Para actualizar la copia, sustituir los JSON, copiar las imágenes referenciadas y actualizar sus dimensiones en `media-sizes.json`; la biografía se actualiza en `bio.html`. No hay sincronización automática.

## Capas y haces

`TyrellPortfolio` coordina una capa Canvas2D y una columna HTML recortadas al rectángulo CSS real del canvas de Three.js. Quedan sobre la escena y bajo la GUI; el recorte mantiene libres las franjas negras. La columna no tiene rotación 3D.

El origen es el centro mundial de `vk.optics`, proyectado con la cámara final después del paneo y del movimiento mecánico. Los extremos usan las esquinas reales de `.card_black_area` y `.card_main_media`, también durante entrada y expansión. La biografía solo tiene cuatro extremos. No se limitan las coordenadas al viewport.

Se selecciona la card cuyo rectángulo está más cerca del centro vertical y sus vecinas inmediatas (máximo 24 haces). La intensidad de las vecinas cae suavemente después de salir del área visible, con distancias independientes arriba y abajo. Las partículas mantienen posiciones estables dentro de cada rayo y cambian de alpha suavemente; no son guiones que viajan hacia las cards.

**Abrir GUI → Revisión técnica → Portfolio · cards y láser** permite activar/desactivar la capa, ajustar opacidad, densidad, longitud, velocidad de variación, offsets de desvanecimiento, duración de entrada y mezcla Normal/Multiply. Los ajustes duran la sesión. Multiply se aplica entre trazos y a la capa sobre la escena.

El diagnóstico incluye número de cards/haces activos, origen en pantalla, posición de scroll y coste CPU suavizado del portfolio. No incluye el coste de composición del navegador ni sustituye una medición GPU.

## Verificación

`node --test src/canvasApp/projects/webGPU/E26902_BladeRunner/tests/portfolio.test.mjs` comprueba activación, conservación de scroll/vídeos, rueda global, selección de vecinas, extremos fuera de pantalla, proyección con paneo, polvo y disponibilidad de todos los recursos locales.

Prueba visual: esperar apertura en p1, desplazar desde la escena y las franjas, expandir/contraer See more, mover el puntero entre ambos lados, salir con 2 y volver con 1, cerrar/abrir con V, cambiar el encuadre y comparar las mezclas. La captura técnica existente exporta el render 3D; para capturar el portfolio completo se necesita una captura del navegador.

Primera versión orientada a escritorio. Hay ajustes básicos de anchura para ventanas pequeñas; la composición específica para móvil y el giro 3D del HTML quedan pendientes.
