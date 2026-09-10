# 6.5 · Aportación y coste de los efectos

Los siete efectos conservan interruptores independientes. El panel **Comparar efectos y coste** permite medir la configuración activa, retener las últimas 12 mediciones y exportarlas a JSON. La exportación incluye los parámetros efectivos de luz, cámara, paneo, materiales, atmósfera, volumen, reflejos y posprocesado; no sólo los nombres de los interruptores.

## Uso

1. Elegir cámara, calidad y encuadre. Fijar exposición y luz.
2. Pulsar **Medir configuración**: centra la cámara, descarta 60 fotogramas y registra una ventana de 120 intervalos RAF.
3. Cambiar un efecto y repetir. Los cambios de configuración, movimiento del puntero sobre la escena, captura o pérdida de visibilidad cancelan una medición pendiente para evitar mezclar estados.
4. Comparar FPS, media y P95, conservando las mismas condiciones. Exportar antes de recargar: el registro es de sesión.

No calcula diferencias automáticas entre filas porque podrían tener cámaras o resoluciones distintas. Los FPS pueden estar limitados por la pantalla. Cerca de 60 FPS no se puede deducir que un efecto sea gratuito; estas mediciones no son tiempos GPU ni una garantía de rendimiento a pantalla completa. Un fotograma aislado de dibujos/triángulos no representa todo el ciclo del reflector adaptativo.

## Aportación y trabajo esperado

| Efecto | Aportación visual | Trabajo |
| --- | --- | --- |
| Profundidad exterior | Separa el edificio lejano | Cálculo analítico por fragmento; sin pase adicional |
| Bruma interior | Hace legible el aire de la sala | Cálculo analítico por fragmento; sin pase adicional |
| Haces de luz | Dispersión solar ocluida | 24/40/64 consultas de sombra en el volumen según calidad; también afecta al reflejo |
| Polvo | Variación lenta de densidad | Función procedural; refresco planar a 10 Hz durante animación |
| Reflejo del suelo | Reflejo largo del interior | Render planar adicional cuando cambia la vista/escena; reutilización adaptativa |
| Metal y vidrio | Reflejos locales en objetos seleccionados | Sonda de seis caras al invalidarse; no cada fotograma |
| Bloom | Halo de altas luces | Extracción, diez desenfoques, composición y salida; resolución reducida |
| Color | Balance y saturación suaves | Operaciones en la salida; una salida adicional si se usa sin bloom |

Las preferencias de arranque del usuario siguen activas: calidad Media, siete efectos ON, paneo H/V 1,1 m y suavidad 0,75 s. Los FPS siguen visibles con la GUI oculta.

## Medición de esta entrega

CAM 01, Media, 893 × 372, exposición 0 EV, luz `tyrell-light-v2`, mismos materiales y cámara centrada. Polvo animado salvo al apagar haces. Se verificó que los nueve registros conservan cámara, resolución, calidad, exposición, luz y materiales.

| Configuración | FPS | Media RAF ms | P95 ms |
| --- | --- | --- | --- |
| Completa | 60 | 16.67 | 19.8 |
| Sin bloom | 60.2 | 16.62 | 20 |
| Sin color | 59.9 | 16.69 | 19.9 |
| Sin profundidad exterior | 59.9 | 16.7 | 20.2 |
| Sin bruma interior | 60 | 16.68 | 19.9 |
| Sin haces (sin polvo efectivo) | 60 | 16.66 | 18.3 |
| Sin reflejo del suelo | 60 | 16.66 | 20.1 |
| Sin sonda metal/vidrio | 59.5 | 16.81 | 21.5 |
| Completa repetida | 60 | 16.66 | 20.3 |

El rango 59,5–60,2 FPS está próximo al refresco de pantalla. No permite ordenar con fiabilidad el coste GPU. Que la fila sin sonda resulte más lenta no prueba un coste negativo de la sonda: es variación de una ventana corta. La comparación se centra aquí en controles, trazabilidad y comportamiento; la optimización profunda sigue en fase 8.

[Registro JSON completo](../../capturas/6.5_003_2026-09-10_comparacion.json). Capturas 6.5/001 sin haces, 002 sin reflejo planar, 003 exportación, 004 composición completa restaurada. La contribución especular original del suelo sigue existiendo al apagar el reflejo planar; su brillo no implica que el interruptor falle.

**41/41 pruebas correctas**; build en **54,337 s** con tres advertencias existentes de tamaño. Comprobados en navegador el registro de nueve filas, exportación, cambios de efectos y cancelación al cambiar calidad durante una medición. Registro limitado a 12 filas, copias independientes de los ajustes y rechazo de ventanas incompletas cubiertos por prueba.
