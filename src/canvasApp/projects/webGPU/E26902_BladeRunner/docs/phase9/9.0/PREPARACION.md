# 9.0 · Preparación del exterior

20-09-2026. **Completado como preparación.** Imágenes y secuencias de vídeo revisadas; exterior y cámaras auditados; distribución candidata definida; siete capturas y medición de la escena actual archivadas. No se han cambiado los archivos de ejecución, geometrías, luces, presets ni valores iniciales. Los controles usados durante la revisión se restauran al recargar. Siguiente: 9.1, sin iniciar.

## Dirección visual acordada

Conservar el aspecto actual de amanecer/atardecer, su luz ambiental, paleta y atmósfera. Las referencias nocturnas se usan para reconocer arquitectura, luces y efectos, sin reproducir su contraste nocturno ni la densidad de actividad. Las oficinas siguen siendo protagonistas. No cambiar exposición, cielo o iluminación general para forzar la visibilidad de nuevos efectos.

## Referencias revisadas

Las rutas de fuentes se refieren a la raíz del espacio de trabajo, dos niveles por encima de la raíz del repositorio. La carpeta real de iluminación se llama `Luces edificio piramide` (sin tilde). Los originales se conservan fuera del repositorio; las láminas siguientes son copias reducidas de consulta, no texturas de ejecución.

| Fuente | Observación visual | Aplicación prevista |
| --- | --- | --- |
| `_Fuentes/Edificios ciudad/Screenshot_2.jpg` | Cubiertas y terrazas escalonadas, bandas de detalle y construcciones bajas alrededor de grandes volúmenes | Referencia principal de geometría baja para 9.1 |
| `Screenshot_1.jpg` y `Screenshot_3.jpg` de esa carpeta | Vehículos iluminados sobre ciudad distante | Apoyo para escala y lectura de tráfico; no copiar densidad ni look nocturno |
| `Screenshot_4.jpg` y `Screenshot_5.jpg` de esa carpeta | Torres verticales, llamaradas y ciudad profunda | Silueta y distribución por profundidad de 9.5; reducir mucho su presencia |
| `_Fuentes/Luces edificio piramide/ejemplo iluminacion.jpg`, `ejemplo iluminacion 2.jpg`, `ejemplo iluminacion 3.jpg` | Ventanas agrupadas en superficies inclinadas y franjas estructurales; puntos luminosos de distinta escala | Patrón de ventanas adaptado a la arquitectura existente |
| `textura de luces y estructuras del edificio.jpg` | Repetición de ventanas en bandas verticales, huecos e instalaciones de gran escala, luces puntuales blancas y cálidas | Separar ventanas, focos y ascensores para conservar jerarquía visual |
| `luces-estroboscopicas.jpg` | Marcas verdes que sitúan balizas en vértices de volúmenes principales e inclinados | Localización de referencia; el color final de las balizas será blanco, según el usuario |
| `_Fuentes/Vehiculo aereo/Deckard.01__scaled_600.jpg` y `spinner_6_lge.jpg` | Cabina alargada acristalada, cuerpo bajo y dos volúmenes laterales delanteros | Rasgos mínimos para reconocer el vehículo cercano; no requiere réplica exacta |
| `p07tnm1h.jpg`, `spinner volando alejandose de camara.jpg`, `spinner volando hacia camara.jpg` | Lectura frontal/posterior dominada por silueta y puntos luminosos; diferencia de tamaño aparente con la distancia | Preparación de aproximación/alejamiento; temporización pendiente del vídeo |

Láminas revisadas: [ciudad](ciudad-referencias.jpg), [luces](luces-referencias.jpg), [vehículo](vehiculo-referencias.jpg).

Vídeos revisados mediante secuencias temporales extraídas del original en el navegador:

- `_Fuentes/Edificios ciudad/fondo ciudad y llamaradas.mp4`.
- `_Fuentes/Vehiculo aereo/spinner volando.mp4`.

Ver [llamaradas](llamaradas-secuencia.png) y [vehículo](vehiculo-secuencia.png). El análisis temporal y sus límites se recogen más abajo; no se deducen velocidades físicas ni frecuencia exacta de destellos de este muestreo.

## Carencias de las cinco capturas del usuario

Las capturas se identifican por el orden de su mensaje; no se les atribuyen cámaras concretas porque las imágenes no muestran el preset activo.

1. Final inferior claro de la pendiente, a la derecha de la pirámide, visible sobre la mesa.
2. Hueco de cielo bajo entre columnas y al lateral del volumen exterior.
3. Remate inferior de la pirámide y hueco lateral derecho junto al edificio inclinado.
4. Discontinuidades repartidas entre huecos de columnas y un tramo de cielo bajo a la derecha.
5. Vista más expuesta de grandes cajas y superficies sin detalle junto a la base derecha; carencia adicional en un hueco a la izquierda.

Esto exige cubrir una franja de vistas y profundidades, no colocar un único elemento que oculte el defecto desde una sola pose. La revisión actual de CAM02/03/04 reproduce las mismas clases de carencias que las capturas 2/3/4, sin afirmar igualdad de pose o tamaño de ventana. La vista libre añade otra lectura de la base derecha.

## Distribución conceptual propuesta

Esta fue la distribución conceptual inicial. Derecha/izquierda se expresan desde CAM 01; las zonas mundiales candidatas calculadas durante el cierre figuran más abajo. Su composición definitiva se validará al implementar cada subfase.

| Zona | Propuesta | Comprobación necesaria |
| --- | --- | --- |
| Base de pirámide y extremos inferiores | Terrazas y edificios bajos en varios planos; siluetas escalonadas y detalle de cubiertas | Cubrir finales expuestos desde las cinco vistas sin tapar la silueta principal |
| Fondo urbano | Evaluar una capa distante de ciudad con contraste reducido por atmósfera | Sin borde visible contra cielo ni paralaje incoherente; decidir tras revisar cobertura 3D |
| Espacio aéreo lejano | Un corredor principal y un segundo opcional, con desvíos escasos hacia edificios | Trayectorias legibles entre huecos, ocultación correcta por arquitectura y baja densidad |
| Espacio sobre las oficinas | Pasos cercanos de ida/vuelta, con recorrido suficientemente largo para entrar y salir fuera de vista | No atravesar techo ni arquitectura; tamaño aparente y velocidad contrastados con vídeo |
| Laterales fuera de CAM 01 | Una torre a la derecha; una o dos a la izquierda a mayor distancia | Volumen completo de llamarada fuera del encuadre; revisar margen de paneo y visibilidad desde otras vistas |

No se incluyen edificios, vehículos, humo adicional ni iluminación ambiental nueva por el solo hecho de aparecer en las referencias. Los elementos se limitan al alcance recogido en el plan.

## Base técnica y visual localizada

- `config.js`: CAM 01 inicial, encuadre 2,4:1, exposición 1,07, acabado `tyrell-v1`, perfil `tyrell-light-v2`, calidad Baja; paneo horizontal 2 m, vertical 0,5 m y suavidad 1,4 s. Bloom, gradación, profundidad exterior, bruma interior, haces y reflejos activos. Son valores de código, no una nueva lectura del visor.
- `TyrellAtmosphere.js`: profundidad exterior analítica, frontera Z = −14,4 y densidad base 0,00025; considerar su integración al añadir materiales exteriores.
- Referencia histórica de acabado: [R01](../../acabados/R01/README.md), que no debe sobrescribirse. El aspecto posterior incorpora efectos y cielo; R01 sola no representa toda la escena actual.
- Última comparación documentada: [8.2](../../phase8/8.2/PERFORMANCE.md), CAM01, viewport 1920 × 1080, encuadre 2,4:1, NVIDIA Turing. Baja 59,9 FPS; Media optimizada 49,4; Alta optimizada 33. Son medidas históricas de otra sesión, **no mediciones de 9.0**.
- [Revisión de cámaras 5.3](../../phase5/5.3/CAMARAS.md): CAM01/04 generales y laterales, CAM02/03 de detalle; otras cámaras muestran límites del decorado. Revaluar cobertura con el recorrido libre actual.

## Lectura temporal de los vídeos

Ambos originales son 1920 × 1080. El de llamaradas dura 48,067 s y el de vehículo 17,133 s. Se extraen doce muestras de cada uno, separadas aproximadamente 4,01 s y 1,43 s respectivamente. Se corrigió la primera extracción, que repetía el primer fotograma: las secuencias archivadas corresponden a búsquedas temporales con servicio HTTP Range y actualización de imagen antes de copiar el fotograma. Algunos controles de reproducción y marcas ya están incluidos en el vídeo original.

| Referencia temporal | Lectura | Decisión para la fase |
| --- | --- | --- |
| Vehículo 0–7,14 s | Punto luminoso que se acerca y aumenta progresivamente de tamaño, desplazándose hacia el borde superior izquierdo | Aproximación continua, con aumento de tamaño por perspectiva y luz contenida |
| Vehículo 8,57–9,99 s | Salida por el borde izquierdo/superior y cambio de plano | No copiar el corte de montaje; la trayectoria 3D debe continuar fuera del encuadre |
| Vehículo 11,42–15,71 s | Vehículo visto alejándose sobre la pirámide, con luz posterior cálida y desplazamiento lateral | Referencia del paso de salida; geometría simplificada reconocible |
| Llamaradas 0–12,02 s | Emisiones verticales de diferentes tamaños y etapas; expansión irregular sobre las torres | Envolvente con arranque, crecimiento, deformación y extinción, sin sincronizar torres |
| Llamaradas 16,02–20,03 s | Emisiones previas se debilitan y aparecen otras en distintos puntos | Separar duración de una emisión del intervalo hasta la siguiente |
| Llamaradas 24,03–28,04 s | Rayo y una llamarada muy grande en primer término | No incorporar el rayo ni reproducir esa dominancia visual: exceden el alcance solicitado |
| Llamaradas 32,04–44,06 s | Alternancia de actividad distante y periodos menos intensos | Mantener pausas largas y muchos menos emisores que en el original |

Para prototipar 9.5 se propone una envolvente de 3–6 s con pausas de 15–35 s por torre, como **decisión artística inicial**, no como duración medida de la película; ajustar al ver el efecto. El paso cercano mantiene el intervalo solicitado de 10 s entre apariciones. La duración visible del recorrido y el ritmo de estroboscopia se calibrarán en 9.3/9.4; el muestreo actual no resuelve destellos rápidos ni equivale a análisis fotograma a fotograma.

## Coordenadas y zonas candidatas

[Auditoría del GLB](geometry-audit.json), metros, Y vertical. CAM01 está en (−0,12; 1,55; 10,30), mira hacia −Z y tiene FOV vertical 22,9175°. Por tanto +X es derecha y −X izquierda desde esa cámara.

La malla `Tyrell_Corporation_Pyramid` ocupa X [−141,42; 42,94], Y [−24,21; 37,60], Z [−356,91; −172,65]. El exterior principal está agrupado en esa malla, por lo que 9.2 necesitará identificar regiones/superficies; no debe suponer un objeto independiente por fachada. El plano de cielo original aparece en el GLB a Z −900, pero el diagnóstico actual confirma el panorama 360 × 180 de fase 6.7 activo y ese plano oculto: no usar el plano antiguo como límite del entorno.

| Elemento | Zona o puntos iniciales en el mundo | Alcance de la comprobación |
| --- | --- | --- |
| Edificios bajos | Franja X [−260; 210], Z [−430; −150], bases hacia Y −90 y cubiertas escalonadas inicialmente entre Y −25 y −8 | Propuesta alrededor de los límites medidos; ajustar alturas para tapar cajas sin ocultar siluetas ni bloquear ventanas |
| Ciudad distante | Detrás de la geometría principal, aproximadamente Z −650 a −850; silueta baja | Textura todavía opcional; comprobar continuidad lateral y atmósfera antes de decidir |
| Corredor lejano principal | De (−400; 70; −600) a (400; 70; −600) | Por encima del máximo Y de la malla actual; propuesta, no ruta animada validada |
| Segundo corredor opcional | De (350; 85; −780) a (−350; 85; −700) | Profundidad distinta y densidad baja; desvío hacia edificio a diseñar sin atravesarlo |
| Paso cercano | (−60; 65; −420) → (15; 65; −160) → (2; 18; −45) → (0; 14; 25), y recorrido inverso | Guía de altura que sobrevuela el volumen exterior; revisar curva, tamaño del vehículo y separación del techo al implementarla |
| Torre derecha + envolvente máxima de efecto | X [340; 380], Y [−80; 55], Z [−480; −440] | Fuera del frustum CAM01 en las 451 muestras; intersecta el frustum de CAM04 y Camera_D |
| Torre izquierda 1 + envolvente | X [−540; −500], Y [−100; 50], Z [−720; −680] | Fuera del frustum CAM01 en las 451 muestras; entra en frusta de CAM02/03 y otras vistas laterales |
| Torre izquierda 2 opcional + envolvente | X [−660; −620], Y [−120; 40], Z [−850; −810] | También fuera de CAM01 en las muestras, a mayor profundidad |

[Cálculo de zonas](zones.json): 41 posiciones horizontales × 11 verticales, offsets ±2 m y ±0,5 m, mirada hacia el objetivo a 20 m del preset, aspecto 2,4:1. Cero intersecciones para las tres cajas completas. Es una comprobación de frustum muestreada, sin oclusión por columnas; no prueba continuidad matemática entre muestras, otros ajustes de paneo ni pantallas más anchas sin bandas. La amplitud final de las llamaradas deberá caber dentro de esas envolventes o recalcularse. Intersectar otro frustum tampoco garantiza visibilidad a través de las ventanas.

Reproducción desde la raíz del repositorio: `node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-exterior.mjs`. Sólo lee el GLB y escribe los dos JSON documentales; no crea geometría de ejecución.

## Revisión del visor y capturas

WebGPU, Three.js r185, Windows, navegador integrado Chrome 153, adaptador NVIDIA Turing. Viewport temporal 1920 × 1080, aspecto 2,4:1, calidad Baja optimizada 8.2, exposición 1,07, perfil `tyrell-light-v2`, acabado `tyrell-v1`, efectos iniciales activos. Se restaura el viewport normal al terminar. Sin errores de consola registrados en la revisión.

| Captura | Observación |
| --- | --- |
| [001 · CAM01](../../capturas/9.0_001_2026-09-20_CAM01.png) | Base del aspecto actual; hueco bajo y extremo de la pendiente parcialmente ocultos por la mesa/silla |
| [002 · CAM02](../../capturas/9.0_002_2026-09-20_CAM02.png) | Hueco de cielo bajo a la izquierda entre columnas; coincide con el tipo de problema de la captura 2 del usuario |
| [003 · CAM03](../../capturas/9.0_003_2026-09-20_CAM03.png) | Corte de la pendiente y zona lateral inferior expuestos |
| [004 · CAM04](../../capturas/9.0_004_2026-09-20_CAM04.png) | Base clara y vacíos bajo los volúmenes inclinados; referencia prioritaria de cobertura para 9.1 |
| [005 · Paneo CAM01](../../capturas/9.0_005_2026-09-20_CAM01-paneo.png) | Puntero cerca del extremo superior izquierdo; desplazamiento hacia +X/−Y y otra oclusión de la pirámide |
| [006 · Paneo CAM01 opuesto](../../capturas/9.0_006_2026-09-20_CAM01-paneo.png) | Extremo inferior derecho; reaparecen las cajas claras junto a la base derecha |
| [007 · Vista libre](../../capturas/9.0_007_2026-09-20_libre.png) | Entrada desde CAM02, altura 1,65 m y giro por arrastre hacia la pirámide; base derecha y gran fachada visibles |

Son PNG de pantalla de 1920 × 1080, escena de 1920 × 800 entre bandas y render interno de Baja 1440 × 600, con cabecera/FPS. No son exportaciones nativas 1920 × 800. [Índice cronológico](../../capturas/INDEX.md). La pose libre queda guardada en [su diagnóstico](libre-diagnostico.json); sus etiquetas internas `phase:8/step:8.2` proceden del visor sin modificar, no del estado del plan.

La revisión libre es una muestra de orientación junto a la mesa, no un barrido exhaustivo de posiciones transitables ni una prueba de colisiones. No se reproducen exactamente las cinco poses del usuario, que no incluían coordenadas. Se han confirmado sus tipos de carencia desde cámaras y paneo reproducibles.

## Medición base de esta sesión

[Datos completos](measurements.json), 20-09-2026 19:55:08 UTC, CAM01 centrada, `?profile=1`, Baja optimizada, todos los efectos iniciales activos, viewport 1920 × 1080. Protocolo de 8.2: 60 fotogramas de calentamiento y 120 intervalos RAF. No hubo cambios de escena durante la muestra.

| Indicador | Resultado |
| --- | ---: |
| FPS / RAF medio / P95 | 30,8 / 32,47 ms / 63,2 ms |
| CPU envío de render (120 muestras) | 8,92 ms |
| GPU pases (23 muestras asíncronas) | 26,71 ms |
| Resolución interna | 1440 × 600 |
| Dibujos / triángulos con pasadas | 289 / 605.317 |
| Geometrías / texturas del renderer | 143 / 55 |

Esta ventana es inferior a los 59,9 FPS históricos de Baja en 8.2. No se han alterado el runtime ni los presupuestos: la diferencia no se atribuye a la Fase 9 y no es una comparación A/B controlada entre sesiones. Navegador integrado, carga del sistema y condiciones de ejecución pueden influir; no se han aislado sus causas. No se mide VRAM. Antes de atribuir coste a futuros añadidos, medir desactivados/activados en la misma sesión. Media/Alta se revisarán al incorporar efectos y en 9.6; no se extrapolan desde Baja.

## Cierre y siguiente paso

9.0 queda cerrado como preparación y referencia previa a cambios. 9.1–9.6 permanecen pendientes. El siguiente trabajo es crear y validar los edificios bajos de 9.1 desde CAM02/03/04 y paneo CAM01, preservando el look registrado. Las zonas propuestas no son una aprobación visual de elementos todavía inexistentes. La Fase 8 sigue pendiente de sus revisiones finales y deberá incluir los recursos de Fase 9.

Para repetir la extracción de referencias desde la raíz del espacio de trabajo (la que contiene `_Fuentes`), ejecutar `python _Repo/26_902_BladeRunner/src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase9/9.0/serve-references.py` y abrir `http://127.0.0.1:8091/_Repo/26_902_BladeRunner/src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/phase9/9.0/referencias.html`. El servidor escucha sólo en localhost y admite rangos de vídeo; las láminas se generan pulsando los botones de extracción con la pestaña visible. No modifica los vídeos originales.
