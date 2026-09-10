# 6.8 · Óptica solar sutil

Preferencias confirmadas: solo el sol visible; halo cálido tenue y pequeños destellos ópticos; activo al arrancar con intensidad baja y controles en GUI.

## Implementación

`TyrellLensFlare.js` proyecta la esfera envolvente del disco solar con la cámara final. Crea un halo gaussiano cálido y tres destellos pequeños sobre el eje sol-centro de imagen. Intensidad inicial 0,18; tamaño 1. Controles independientes en **Acabado cinematográfico**: Lens flare solar, Intensidad (0–0,6), Tamaño (0,5–2).

La visibilidad se calcula en GPU con trece consultas a la profundidad de la escena repartidas sobre el disco. Los objetos situados delante bloquean las muestras correspondientes; se permite un margen de 1–3 metros en la profundidad solar para no interpretar el propio disco como oclusor. La cobertura parcial produce intensidades intermedias. Al aproximarse al borde de la pantalla se atenúa con una curva suave en el 8 % exterior. Fuera de pantalla, detrás de la cámara, en estudio o sin sol activo, su energía es cero.

Se añade a la pasada final HDR antes de la gradación y la conversión AgX/sRGB. No alimenta el bloom ni modifica luces, cielo, materiales, sonda o espejo planar. Reutiliza la profundidad de la escena; no necesita geometría, imágenes generadas ni otra captura de escena. Con bloom/gradación ya activos no añade pasadas de pantalla; si se usa solo, necesita la pasada final de composición.

La captura 1920 × 800 usa la misma proyección y tamaño relativo que el visor; el nombre del archivo y el diagnóstico registran la intensidad. El registro de comparación conserva los ajustes dentro de `postProcessing.flare`.

## Límites

Es una aproximación artística de óptica, no una simulación de lentes. Las trece muestras discretizan la cobertura: no se promete oclusión temporal continua ni exactitud para siluetas subpíxel. No usa historial temporal para evitar destellos residuales al cambiar de cámara o capturar. La profundidad representa superficies opacas; no modela transmisión óptica del vidrio ni atenuación por bruma. El efecto se limita a la contribución del sol, no a otros reflejos brillantes.

El coste incluye trece lecturas de profundidad por fragmento de composición. No se interpreta la ausencia de pasadas adicionales como coste cero. Validación visual y coste de ejecución se registran al finalizar la prueba.

## Validación · 10-09-2026

44/44 pruebas correctas; después del ajuste que evita reconstruir el grafo al mover deslizadores se repiten las cuatro pruebas de posprocesado, todas correctas. Compilación final: 86,546 s, tres avisos de tamaño de Webpack. Activación/desactivación elimina o incorpora el cálculo óptico al grafo; intensidad y tamaño usan uniformes.

WebGPU revisado en CAM01, CAM02 y CAM03, más Baja/Media/Alta. CAM01 y CAM03 muestran el disco parcialmente tapado por el edificio inclinado; CAM02 no muestra destellos con el sol fuera de campo. No se ha hecho un barrido exhaustivo de todas las oclusiones ni una medición instrumental de la estabilidad durante el paneo.

Comparación 001/002 sin polvo animado: diferencia media RGB de 0,024 / 0,025 / 0,028 sobre 255 en el área de imagen; en la región del sol, 1,79 / 1,84 / 2,04, con máximo de 19. El efecto se concentra alrededor del disco y en pequeños destellos; no aclara globalmente la sala. Son capturas de interfaz reducidas, originalmente JPEG y almacenadas como PNG, no diferencias de render targets HDR.

Capturas numeradas en [el índice](../../capturas/INDEX.md). 001: activo; 002: desactivado; 003: CAM02 fuera de campo; 004: CAM03; 005/006: Baja/Alta. La intensidad estética final queda a revisión del usuario.

007 registra dos ventanas de 120 muestras RAF tras calentamiento, CAM01 / Media / 893 × 372, polvo desactivado: con flare 50,9 FPS, media 19,65 ms y P95 41,7 ms; sin flare 46 FPS, media 21,73 ms y P95 54 ms. La inversión y la dispersión impiden atribuir una diferencia fiable de coste al efecto. No se declara ahorro ni coste GPU aislado. Registro visible en [medicion-ui.txt](medicion-ui.txt). La prueba preliminar realizada mientras compilaba no se utiliza.

008 guarda el estado final: Media, CAM01, flare 0,18 / tamaño 1, polvo y efectos habituales activos. El plan se marca implementado; quedan la valoración estética del usuario y una comprobación exhaustiva de oclusiones/paneo para futuras revisiones.
