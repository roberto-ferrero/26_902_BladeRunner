# 6.4 · Bloom contenido y ajuste final del color

Propuesta de revisión del 10-09-2026. No sustituye el archivo de referencia R01 ni modifica luz, materiales, sol, sombras o densidad de la atmósfera.

## Cadena de imagen

Se utiliza `RenderPipeline` de Three.js r185 con un pase HDR de escena, bloom por umbral y una gradación suave en color lineal. La transformación AgX y la salida sRGB se aplican una vez, al final. Las sondas y reflejos conservan su cálculo de radiancia de escena: el posprocesado afecta sólo a la cámara final.

El visor incorpora un punto de extensión opcional `project.renderFrame(camera)`; los demás proyectos mantienen el render directo. La captura de referencia utiliza la misma función a 1920 × 800 y restaura el tamaño del visor. Los nodos de escena y bloom se actualizan por render para evitar reutilizar el resultado de otra cámara o resolución dentro del mismo fotograma. Un contador por invocación final limita la escena a una actualización: las consultas internas del bloom reutilizan esa textura. Sin esa protección, el quad de extracción provocaba otro render con su color de limpieza negro; el defecto era visible en CAM 02 y añadía trabajo. Corregido en las capturas 011 en adelante.

Documentación primaria contrastada con el código instalado: [RenderPipeline](https://threejs.org/docs/pages/RenderPipeline.html) y [BloomNode](https://threejs.org/docs/pages/BloomNode.html). No se actualizan dependencias.

## Parámetros y decisión visual

| Parámetro | Propuesta |
| --- | --- |
| Fuerza del bloom | 0,16 |
| Radio | 0,25 |
| Umbral de luminancia lineal | 1,5 |
| Límite suave de luminancia que entra en el halo | 4 |
| Resolución inicial del bloom | 25 % en Baja; 50 % en Media/Alta |
| Saturación de la gradación | 96 % |
| Balance de sombras RGB | 0,99 / 1,005 / 1,015 |
| Balance de luces RGB | 1,015 / 1,005 / 0,985 |
| Fuerza de gradación | 1 |
| Exposición | 0 EV; AgX de referencia |

El balance transita suavemente con la luminancia entre 0,03 y 0,6. No añade un valor constante a los negros ni aplica una curva agresiva de contraste.

Las capturas 002–003 conservan el primer ensayo descartado: el bloom sin límite de energía producía un destello excesivo sobre la mesa. La versión final comprime sólo la energía del halo mediante `RGB / (1 + luminancia / 4)` después de seleccionar las altas luces por su luminancia original. El reflejo original sigue presente y no se recorta. El halo solar queda contenido; la gradación reduce ligeramente la dominante y conserva el carácter cálido.

## Controles y coste

Panel **Acabado cinematográfico**: Bloom, Color cinematográfico, fuerza, radio, umbral y fuerza del color. Ambos efectos arrancan apagados. Apagar ambos vuelve al render directo y evita las pasadas de posprocesado. Sus recursos, una vez creados, se reutilizan hasta cerrar el proyecto.

Bloom usa cinco escalas con dos desenfoques cada una, extracción de altas luces, composición y salida: 13 pasadas de pantalla completa adicionales al pase de escena, muchas a resolución reducida. Sólo color añade una salida de pantalla completa. No hay render adicional de toda la geometría respecto a la imagen principal, aunque cambian el destino HDR y el trabajo asociado a reflejos/sombras. El coste real depende de resolución y escena.

## Validación y capturas

**40/40 pruebas correctas**. Incluyen bypass inicial, controles y límites, seguimiento de cámara, liberación de recursos, restauración de color ante fallo, captura y restauración de resolución, compatibilidad de proyectos sin posprocesado y una única actualización de escena ante lecturas anidadas. Compilación final Webpack 5.97.1 correcta en **36,990 s**, con tres advertencias existentes de tamaño. Compilación GPU y cambios de cámara/calidad revisados en el navegador.

Comparación del rectángulo de escena x 46–846, y 294–626: **001 = 014** al desactivar ambos efectos; **012 = 013** al repetir la captura estática. La propuesta 012 difiere de la base en una media absoluta RGB de 1,69 / 1,69 / 2,26 niveles de 255. Es una comprobación sobre el pantallazo reducido, no una medida de fidelidad cinematográfica. [Datos](pixel-comparison.json).

[Registro completo de capturas](../../capturas/INDEX.md): 001 base; 002–003 primer bloom descartado; 004 restauración; 005–010 ensayo con energía limitada anterior a corregir el render anidado; **011 CAM 02 definitiva**, **012–013 CAM 01 estática**, 014 restauración final, 015–016 Baja/Alta, **017 CAM 04 definitiva**, 018 paneo con polvo y diagnóstico, **019 entrega general con polvo animado**. Se conserva el histórico sin sobrescribir imágenes.

Diagnóstico 018, Media 893 × 372, reflejos, atmósfera, polvo, bloom y color activos: **60,1 FPS**, media RAF 16,65 ms, P95 20,3 ms (120 muestras). 142 geometrías y 68 texturas. El fotograma informado recalcula el reflejo: 370 dibujos, 763.401 triángulos/pasadas. Los contadores de render incluyen trabajo anidado y no equivalen al número de pases descrito arriba. No es tiempo GPU ni un benchmark a 1920 × 800; la comparación de coste controlada queda para 6.5.

## Límites y siguiente punto

Es una propuesta de acabado, pendiente de revisión visual del usuario. El bloom no reproduce destellos ópticos anamórficos ni corrige los límites de transmisión y muestreo del volumen descritos en 6.3. No se añade grano, viñeta ni desenfoque de campo. El siguiente punto es **6.5 · Comparación de aportación y coste de los efectos**.
