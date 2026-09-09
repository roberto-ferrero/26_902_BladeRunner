# 4.1 · Primera composición de sol, cielo y contraste

09/09/2026. Fase 4 iniciada con una propuesta reversible de iluminación, **Tyrell · luz 4.1**, activa al arrancar. La luz direccional sigue la dirección del disco visible respecto al centro de la sala; se eleva y reduce el disco, aumenta moderadamente la emisión del cielo y se rebalancean los rellenos para conservar un interior oscuro con mayor lectura exterior.

La propuesta se ha revisado en WebGPU desde CAM 01/02/04. Es la base para la calibración de intensidades de 4.2, no la atmósfera final de la película. El brillo amplio del pavimento, los reflejos del mobiliario y la profundidad atmosférica siguen pendientes.

## Cambios y parámetros

| Parámetro | Provisional / fase 3 | Luz 4.1 |
| --- | --- | --- |
| Posición mundial del disco, metros | (2, 46, −650) | (2, 58, −650) |
| Escala local uniforme del disco | 0,77778 | 0,56: multiplicador 0,72 |
| Dirección solar | Orientación importada independiente | Vector normalizado desde (0, 1, −5) al disco |
| Elevación de la dirección solar | Aproximadamente 4,12° | Aproximadamente 5,05° |
| Posición de la luz para sombras | (0,3, 7,2, −100) | A 80 m del objetivo, en dirección al disco |
| Color solar sRGB | #ffffff, leído en ejecución | #ffd093 |
| Intensidad solar Three.js | 2,25 | 2,6 |
| Emisión RGB lineal del cielo | (0,6, 0,6, 0,6) | (0,75, 0,75, 0,75) |
| Intensidad hemisférica | 0,35 | 0,65 |
| Áreas: ventanal / frontal / izquierda / derecha | 2,4 / 0,7 / 1,1 / 1,3 | 0,65 / 0,22 / 0,45 / 0,45 |

Los números de intensidad son parámetros de los tipos de luz de Three.js; no una transferencia de vatios de Blender ni una calibración fotométrica terminada. Las posiciones, colores y tamaños de las áreas permanecen como en la base. La dirección solar se calcula geométricamente: el disco no ilumina por sí solo la escena. La luz se sitúa a 80 m para mantener el espacio de sombras acotado; no a los 650 m del disco.

Se conservan exposición 1,07 / 0 EV, AgX, materiales Tyrell v1 y textura de cielo. No se añade geometría, textura, volumen, bloom ni pasada de reflexión. El halo solar y la suavidad atmosférica de las referencias se abordarán en fase 6.

## Código y comparación

- `config.js`: `lightingProfile` y parámetros `lighting` de la propuesta; los valores provisionales siguen disponibles.
- `TyrellLighting.js`: aplica/restaura composición, dirección, emisión y rellenos sin acumular cambios ni sustituir materiales.
- `E26902_BladeRunner`: integra iluminación, diagnóstico y nombre de captura. El objetivo de la luz queda en la raíz del modelo, independiente del nodo de luz que se sustituye al cambiar calidad.
- `TyrellUI.js`: selector **Color y materiales → Iluminación**, con `Provisional · fase 3` y `Tyrell · luz 4.1`.
- `tests/lighting.test.mjs`: verifica alineación, restauración, conservación de mapas/geometría y sustitución de luz, incluso con padres transformados.

Para comparar: CAM 01, calidad Media, Tyrell v1, 0 EV, luz de estudio desactivada; alternar sólo **Iluminación**. Las capturas incluyen el identificador de iluminación. El modo estudio sigue ocultando sol, cielo y rellenos de escena, y al desactivarlo recupera el perfil seleccionado.

## Revisión visual y límites

- CAM 01: la pirámide recupera detalle en su superficie inclinada. El disco queda más alto y contenido; sigue siendo un disco de borde definido, sin halo. La sala mantiene contraluz cálido.
- CAM 02: mesa y cristal conservan lectura con un brillo menos blanco. La superficie de cuero aún resulta demasiado clara en el contraluz; requiere separar contribuciones de las luces en 4.2.
- CAM 04: se conserva la lectura lateral de columnas y del exterior. Los rellenos no sustituyen la luz indirecta ni el volumen de las referencias.
- El brillo central del suelo continúa ancho; no se declara corregido. Las sombras aún presentan dureza y pequeños puntos brillantes que deben revisarse en 4.4. No se ajustan sesgos para ocultarlos en esta entrega.

Las referencias utilizadas son las tres imágenes del usuario en `docs/reference images`. El ajuste busca su carácter de contraluz y contraste; no se han medido posiciones solares de una cámara fotográfica calibrada ni se afirma una coincidencia exacta de encuadre.

## Evidencias y validación

Capturas de interfaz de 1280 × 720 mostrando el render fijo 1920 × 800 reducido. No son los PNG originales a resolución completa:

- CAM 01: [provisional](cam01-provisional-ui.png) / [luz 4.1](cam01-luz41-ui.png).
- [CAM 02, luz 4.1](cam02-luz41-ui.png).
- [CAM 04, luz 4.1](cam04-luz41-ui.png).
- Diagnósticos: [provisional](runtime-provisional.json) / [luz 4.1](runtime-luz41.json).

**20/20 pruebas correctas.** Compilación de producción correcta: Webpack 5.97.1, 47,856 s, tres advertencias de tamaño/rendimiento. Registro local: `tyrell-build-phase4-1.log`. Navegador: WebGPU, Three r185, Chrome 152, NVIDIA Turing. Comprobados selector de iluminación, cámaras, captura, Baja → Media y modo estudio → escena. Sin errores de consola durante la revisión; persiste el aviso de deprecación de THREE.Clock. No es un benchmark de GPU.

```powershell
npm.cmd run test:tyrell
npm.cmd run build
```

GLB y Blender fuente intactos. Se conserva SHA-256 del GLB `bf2108bbe13d32df23bfa34e598c1d98085e2322e859fbf62354240f7e6b8fa2`, 148 Mesh y 339.381 triángulos de escena. El disco cambia únicamente de transformación en ejecución.

Siguiente: **4.2**, calibrar aportaciones e intensidades del sol y rellenos desde las mismas cámaras, en particular los brillos del pavimento y de la mesa. La fidelidad final del contraste se volverá a valorar después de sombras, luz indirecta, reflejos y atmósfera.
