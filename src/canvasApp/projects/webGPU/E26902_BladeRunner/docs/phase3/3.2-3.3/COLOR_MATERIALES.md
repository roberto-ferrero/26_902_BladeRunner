# 3.2–3.3 · Color y primera propuesta de materiales

09/09/2026. **3.2 implementado y validado técnicamente. 3.3 dispone de una primera propuesta activa y reversible; permanece abierto hasta revisión visual en WebGPU.** La herramienta de navegación no tiene navegadores conectados en esta sesión. Los renders auxiliares de Blender no sustituyen esa comprobación.

También se ha numerado cada subtarea de las fases 0–8 en `PLAN.md`, conservando los identificadores 3.1–3.6. El paneo queda dentro de navegación como 7.6. Las decisiones generales de producto no son una fase y mantienen sus casillas sin número.

## 3.2 · Referencia de color

`applyColorReference` establece gestión de color activa, espacio de trabajo **Linear-sRGB**, transformación **AgX** y salida **sRGB**. Los mapas conservan los espacios auditados en 3.1. No se introduce gamma adicional ni corrección de color sobre mapas de datos.

Se mantiene **1,07 como exposición base**, para conservar la referencia de las capturas anteriores. El control de compensación varía de −2 a +2 EV: `exposición = 1,07 × 2^EV`. Por tanto, 0 EV significa la referencia del proyecto; no exposición numérica 1. El botón de restablecimiento retorna a 0 EV. Los diagnósticos registran base, compensación, exposición efectiva y espacios de color.

La referencia fija una comparación repetible antes de tocar las luces. No declara que AgX de Three r182 reproduzca exactamente el aspecto de Blender o la gradación de la película. La equivalencia artística requiere comparación en el visor con las tres [imágenes del usuario](<../../reference images/README.md>).

## 3.3 · Materiales Tyrell v1

La propuesta se aplica en ejecución y mantiene intactos el GLB, el `.blend`, las imágenes y las UV. Afecta a 14 materiales por nombre. Cada material compartido se ajusta una vez a partir de su estado importado; alternar perfiles no acumula tintes y restaura los valores originales.

| Familia | Ajuste de esta propuesta | Intención de acabado |
| --- | --- | --- |
| Caliza ocre/aristas | Multiplicadores RGB lineales 0,96/1/0,92 y 0,98/1/0,94; normales 0,28 y 0,26 | Matiz ligeramente más oliva y relieve fino contenido, tomando como guía las imágenes 1 y 3 |
| Piedra negra del suelo | Multiplicador 0,94/0,98/0,94; normal 0,025 | Conservar base oscura y desgaste. Las reflexiones largas y el brillo excesivo requieren 3.4 y fases 4–5 |
| Nogal/raíz | Multiplicadores suaves entre 1 y 1,05; normales 0,16/0,22 | Mantener profundidad oscura y moderar el relieve de la veta; referencia de mesa, imagen 2 |
| Cuero | Multiplicador 0,94/0,98/1; normales 0,22/0,32 | Oscuridad profunda y grano menos dominante en los brillos de las sillas |
| Bronce patinado | Multiplicador 0,96/1/0,94; metalicidad 0,72; normales 0,18/0,28 | Brillos contenidos y variación suave; referencia lateral, imagen 3 |
| Latón | Rugosidad constante 0,34 en envejecido y 0,28 en brillos; metalicidad 0,80/0,82 | Reducir brillos demasiado duros sin apagar completamente los cantos |
| Cristal | Color neutro 1/1/1; rugosidad 0,035; transmisión 1; espesor óptico aproximado 0,006 m | Primera prueba de mayor claridad. IOR 1,46 conservado; el espesor es una aproximación óptica uniforme, no una medición de las paredes de cada vaso |

Los mapas de rugosidad permanecen conectados a G, con sus factores originales; no se sustituyen por constantes para homogeneizar superficies. La diferenciación de relieve se conserva entre materiales que comparten imágenes. Los tintes son multiplicadores lineales, no muestras de píxeles extraídas de los fotogramas. Todos los valores exactos están en [look.json](look.json), generado desde el código de ejecución.

El hormigón exterior se conserva: su oscuridad actual requiere revisar la iluminación y la profundidad atmosférica. Las UV colapsadas localizadas en 3.1 tampoco se remapean automáticamente; se mantiene su revisión como condición de cierre visual de 3.3. Esta propuesta no acredita todavía su ausencia de defectos en primeros planos.

## Comparación en el GUI

Abrir **Color y materiales** en el panel inferior. Permite seleccionar **Importado del GLB** o **Tyrell v1 · en revisión**, cambiar EV y activar **Luz de estudio**. Los ajustes se mantienen durante cambios de cámara; al recargar vuelven a Tyrell v1, 0 EV y luz de escena.

La luz de estudio usa un hemisferio neutro y dos áreas blancas amplias, fijas respecto a la sala. Desactiva temporalmente sol y rellenos de escena y oculta cielo/disco solar para separar el color de los materiales de las fuentes ámbar. Volver a luz de escena recupera el montaje provisional. No se ha calibrado aún el sol de la película ni añadido reflejos o atmósfera. El diagnóstico identifica el modo de revisión.

Las capturas mantienen 1920 × 800 y cámara de referencia sin paneo, pero conservan el acabado, la luz y EV seleccionados. El nombre incluye esos parámetros para evitar mezclar comparaciones. Para una revisión comparable usar Media, 0 EV y CAM 01, 02 y 04, alternando un único parámetro por vez.

## Evidencia disponible

- Pruebas: **17/17 correctas**, incluidas conversión de EV, restauración exacta, ajustes repetidos sin acumulación, conservación de mapas y materiales compartidos, y las pruebas previas de carga, cámara, paneo y captura.
- Compilación final: **correcta**, Webpack 5.97.1, 53,796 s, tres advertencias de tamaño/rendimiento y ningún error. Registro local ignorado por Git: `tyrell-build-phase3-3.log`.
- Previsualizaciones auxiliares: [importado](blender-imported.png) y [Tyrell v1](blender-tyrell-v1.png), CAM 02, 1280 × 533, Cycles 16 muestras con denoising, iluminación neutra idéntica entre imágenes. Se aprecia una diferencia contenida de grano y brillos, sin cambios de silueta.
- **Límite de estas imágenes:** Blender utiliza su AgX con Medium High Contrast, exposición 0 y luces en vatios; no replica las intensidades de Three ni el espesor óptico glTF. No demuestra que se haya resuelto la cristalería blanquecina en WebGPU. Se conserva el contraste entre ambos motores como asunto pendiente.
- Blender guardó ambas previsualizaciones, verificadas visualmente. Emitió el aviso conocido de caché de extensiones sin permiso de escritura y avisos de deprecación; no se guardó ni alteró el archivo fuente.
- No se ha obtenido una captura ni medido rendimiento WebGPU de esta entrega por falta de navegador conectado. El estado de 3.3 se mantiene abierto por ese motivo.

## Reproducir

Desde la raíz del repositorio:

```powershell
npm run test:tyrell
npm run build
npm run dev:local
# Receta y previsualizaciones auxiliares, sin guardar ningún Blender:
node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/export-look.mjs
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --factory-startup --disable-autoexec --python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/render-look.py
```

Abrir `http://localhost:8080`. Revisar materiales con las referencias 1–3 y descargar diagnóstico/capturas. Tras esa comprobación se podrá corregir lo que revele el visor y cerrar 3.3; 3.4 y las fases 4–6 continúan pendientes.
