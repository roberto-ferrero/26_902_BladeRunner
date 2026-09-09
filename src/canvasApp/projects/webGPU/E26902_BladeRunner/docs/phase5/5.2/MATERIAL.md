# 5.2 · Reflejo de piedra pulida

09/09/2026. El reflejo se integra con la rugosidad, las normales y el ángulo de visión del pavimento. Se conserva el ensayo uniforme 5.1 en **Color y materiales → Acabado del reflejo** para comparar. Activar **Reflejo del suelo** y elegir **Piedra pulida · 5.2**. Al recargar sigue arrancando sin reflector para conservar la base R01.

## Respuesta del material

| Componente | Aplicación |
| --- | --- |
| Fresnel | Aproximación Schlick, F0=0,04, usando normal mapeada y dirección de vista; reduce la contribución al mirar más perpendicularmente |
| Rugosidad | Factor del material por canal G del mapa existente; LOD = clamp(10 × rugosidad, 0, 5) sobre mipmaps del reflector |
| Intensidad | Color reflejado × Fresnel × 0,32 × (1 − 0,65 × rugosidad) |
| Normales | Diferencia entre normal mapeada y geométrica en espacio de vista, aplicada a UV de pantalla con escala 0,045 y corrección horizontal del espejo |
| Juntas y cantos | Reflejo sólo sobre caras del pavimento con normal geométrica mundial Y > 0,99; mortero y huecos conservan sus materiales/geometría |

Se reutilizan mapas, UV y `normalScale` de la piedra. **Normal de piedra negra** desactiva también la distorsión mapeada del reflejo. Los mipmaps suavizan las siluetas según la rugosidad y el desgaste existentes, sin introducir otra textura ni un plano superpuesto. El modo **Ensayo uniforme · 5.1** mantiene la contribución constante de 0,18 para comparación.

La composición conserva la luz PBR directa y añade una contribución especular planar moderada a través del nodo de emisión. No representa luz emitida por el suelo ni una BRDF completa con conservación energética. El filtrado por mipmaps es una aproximación visual, no una convolución GGX ni una medida de la distancia de cada objeto reflejado. La calibración de resolución/frecuencia y sus efectos sobre la suavidad sigue en 5.4.

## Resultado y límites

CAM 01 conserva los brillos del pavimento y muestra reflejos menos uniformes. En CAM 04 se suavizan las siluetas del mobiliario y las columnas frente a 5.1. No se cambian exposición, sol, rellenos, sombras, GLB ni la referencia R01 archivada. No se crea R02.

El resultado acerca la respuesta del pavimento a piedra pulida, pero aún requiere la revisión de columnas y mobiliario desde otras cámaras en 5.3 y el acabado atmosférico de la fase 6. No se declara fidelidad final con el fotograma.

## Coste y comprobaciones

Se mantiene un reflector, un material compartido para 21 sectores y media resolución por eje. Se añaden generación de mipmaps y cálculos/sampling de material; no se añade geometría ni otra cámara de reflexión. Las texturas de render retenidas siguen acotadas por las tres identidades de cámara. Los mipmaps añaden aproximadamente un tercio al almacenamiento de color de cada target; esto no equivale a medir la memoria GPU total.

**29/29 pruebas correctas**, incluyendo alternancia de modos, activación, conservación de mapas/geometría y liberación. Compilación final Webpack 5.97.1 correcta en **57,095 s**, con las tres advertencias de empaquetado existentes. `git diff --check` sin errores. Se contrastaron las APIs con `ReflectorNode.js`, `TextureNode.js`, `MaterialNode.js` y `NodeMaterial.js` de Three.js 0.185.1 instalado.

La ventana cambió de tamaño durante la revisión. Por ello no se comparan los FPS con los de 5.1 como una medición de rendimiento equivalente. Las capturas usan siempre el render de referencia 1920 × 800, pero los pantallazos de interfaz lo muestran reducido a distintos tamaños. Ver dimensiones, orden y estados en el [registro cronológico](../../capturas/INDEX.md).

Se comprueban CAM 01 y CAM 04, comparación con el ensayo uniforme, normales desactivadas/activadas y compilación final. Diagnósticos y nombres de descarga incluyen el modo `stone` o `prototype`. El visor queda con Piedra pulida 5.2 activada para revisión; al recargar, R01 sin reflector.

[Diagnóstico final](../../capturas/5.2_007_2026-09-09_CAM01.json): 893 × 372 en vivo, 358 dibujos, 763.389 triángulos contando pasadas, 131 geometrías y tres targets. Se observaron 59,5 FPS / 16,82 ms de intervalo RAF medio; no es tiempo GPU ni una comparación equivalente con la ventana mayor de 5.1. Las siete imágenes de este punto están almacenadas en formato PNG.

Siguiente punto: **5.3 · Comprobar columnas y mobiliario reflejados al cambiar de cámara**.
