# 9.2 · Luces de los edificios

## Revisión · carriles adheridos y oscuros · 21/09/2026

El usuario rechaza el soporte saliente porque parece un volumen pegado a la pirámide. Se elimina por completo la cuña, los perfiles y los marcos añadidos (tres mallas, 1.008 triángulos). La solución actual modifica exclusivamente el material de las fachadas originales: no añade mallas, no desplaza vértices y conserva sus pendientes, silueta y ocultaciones naturales.

La franja central queda sin emisión de ventanas, hangares ni baño cálido. Sobre su color y texturas originales se aplica un oscurecimiento moderado (18 % en color lineal), con trece carriles algo más oscuros (hasta 14 % adicional). Los límites se suavizan y los detalles se atenúan cuando no se resuelven en pantalla. El bajorrelieve se simula en las normales con una profundidad nominal de 2,5 cm: no es una excavación real de la malla. El material conserva el mapa de normales importado y la iluminación de amanecer/atardecer. La oscuridad y los surcos siguen presentes aunque «Luces de edificios» esté a cero.

Las pruebas específicas comprueban que las posiciones de todos los vértices y la caja del edificio son idénticas a las originales y que no aparece ningún objeto de soporte. También verifican aislamiento respecto al interior y restauración de materiales y geometrías. La revisión anterior y sus capturas 011–013 se conservan como propuesta rechazada.

Validación: dos pruebas aprobadas, compilación correcta en 95,9 s (tres avisos habituales de tamaño) y visor WebGPU sin errores registrados. Revisado en Camera_E con paneo, luces a cero y calidades Baja/Alta, además de CAM01. Capturas 014–017 y diagnóstico `diagnostico-92-r05.json`. El contraste es deliberadamente bajo y se atenúa con distancia/bruma. Pendiente de valoración artística del usuario.

## Revisión · carriles exteriores continuos

**Propuesta rechazada el 21/09/2026:** el soporte saliente altera visualmente el volumen de la pirámide. Sustituida por el acabado adherido descrito arriba; esta sección conserva el historial de la entrega 011–013.

El usuario aclara que la franja central es un banco de ascensores exteriores con nervios visibles, no una mancha luminosa. Referencias conservadas: [zona de la escena](zona-central-usuario.png) y [carriles de la película](referencia-carriles-usuario.png). Se sustituye visualmente el tramo iluminado corto por una pieza continua de arquitectura, desde la base de la fachada principal hasta su coronación.

`TyrellElevatorRails.js` coloca un fondo oscuro trapezoidal y trece perfiles elevados sobre los planos frontales medidos del GLB. Anchura 14 m en la base y 8 m arriba; altura mundial desde −5,8 hasta 32,6 m (38,4 m de desnivel). El soporte salva el volumen adelantado inferior y cambia de pendiente a la altura de su cornisa para enlazar con la coronación. Los dos tramos comparten sus extremos y conservan continuos los trece carriles. Cada perfil tiene pie, alma y cabeza, con canales oscuros entre carriles y marcos laterales. La geometría tapa las ventanas de esta banda y salva la división entre paneles del modelo original. Se conserva el estrechamiento hacia la coronación y el aspecto metálico envejecido.

La lectura de los nervios procede de su relieve, materiales y luz existente. Un aporte cálido débil desde abajo, controlado por «Luces de edificios», acompaña el volumen. En cero desaparece ese aporte, pero los carriles físicos siguen presentes. No hay nuevas tiras emisivas, vehículos de ascensor ni animación añadida. Los materiales de las fachadas circundantes y las balizas permanecen como en la revisión anterior.

Se añaden tres mallas y 1.008 triángulos, sin sombras nuevas; todos sus recursos se liberan con la escena. El GLB sigue intacto. Las dos pruebas específicas aprueban las comprobaciones de alcance desde base a coronación, posición exterior, datos geométricos finitos y permanencia al apagar luces, además del aislamiento y restauración de materiales. Revisión visual desde Camera_E con paneo lateral (banda despejada), CAM01 y CAM03; capturas 011–013. Compilación correcta en 69,9 s con los tres avisos habituales de tamaño; WebGPU sin errores registrados. Pendiente de valoración artística.

## Revisión · estructura de fachadas y márgenes

La referencia anotada por el usuario se conserva en [referencia-columnas-usuario.png](referencia-columnas-usuario.png). Se añaden agrupaciones en columnas, separaciones estructurales oscuras, una banda horizontal de servicio y márgenes laterales, superiores e inferiores. La pirámide tiene una zona central sin ventanas con un baño cálido ascendente: tres lóbulos suaves que se ensanchan y atenúan con la altura. Es una simulación de iluminación sobre la superficie, sin haces en el aire ni nuevos focos físicos. También responde a «Luces de edificios» y se apaga en cero. Las balizas mantienen el halo y los parámetros de la revisión anterior.

`TyrellFacadeLayout.js` obtiene envolventes convexas de las superficies planas del GLB y asigna coordenadas de fachada: los márgenes siguen los lados inclinados sin marcar la diagonal de los triángulos. La cuadrícula se orienta en el plano de cada fachada, con unas columnas de 7 m separadas por bandas oscuras. Los planos pequeños y cornisas quedan fuera de las ventanas. El GLB contiene 122 planos amplios utilizables; 21 cumplen el criterio de pirámide central. La selección por geometría aproxima la estructura de la referencia, no reconstruye literalmente su arquitectura. En la ciudad nueva, las coordenadas se generan al construir cada volumen, de modo que sus propias fachadas conservan márgenes.

El GLB original permanece intacto; durante la carga se crea una copia no indexada de la geometría exterior con los atributos necesarios (118.962 vértices, mismos 39.654 triángulos). La copia añade memoria de vértices, sin añadir caras ni pasadas de render; se libera y restaura al cerrar. El coste de memoria y shader se incluirá en la revisión conjunta 9.6. La preparación geométrica medida en Node tardó unos 242 ms, dato orientativo que no equivale a tiempo de carga en todos los equipos.

Propuesta revisada en CAM01–03; capturas 008–010. Las pruebas verifican que los márgenes siguen un trapecio girado sin crear cortes diagonales, además del aislamiento y restauración de geometrías/materiales compartidos, ciudad y halos. Compilación correcta con tres avisos habituales de tamaño; revisión WebGPU sin errores registrados. Pendiente de valoración artística.

Propuesta revisada, pendiente de valoración del usuario. La primera entrega (capturas 001–004) fue rechazada por ventanas bastas y grandes y balizas pequeñas y duras. Referencia: lámina `../9.0/luces-referencias.jpg` y fuentes de luces de la pirámide. Se conserva la exposición, el cielo, los materiales de base y la iluminación de amanecer/atardecer.

## Revisión · filas y halos

Ventanas de 0,118 × 0,063 m, distribuidas cada 0,42 m en horizontal y con 0,90 m entre plantas. Grupos de oficinas encendidas generan segmentos horizontales con interrupciones; la mayor separación vertical deja franjas oscuras entre plantas. Los acentos de ascensores y hangares también se estrechan. El filtro integra la cobertura de cada banda sobre la huella del píxel, tomando derivadas antes de la repetición: evita el ensanchamiento que causaba derivar `fract()` junto a sus discontinuidades.

Las cinco balizas pasan de esferas de borde duro a sprites con núcleo blanco y caída gaussiana. El halo ocupa 1,8 m, con borde transparente, mezcla aditiva y prueba de profundidad activa. Conservan el doble destello de 2,4 s y el control independiente; no añaden luces físicas. Comparten una textura de 64 × 64 y no escriben profundidad. Los recursos se liberan con la escena. La prueba específica verifica además el mapa compartido, la ocultación por profundidad, el borde transparente y el centro brillante.

Revisión comprobada en CAM01, CAM02 y CAM03 (capturas 005–007). Prueba específica de materiales/halos aprobada, compilación de producción en 50,9 s con los tres avisos habituales de tamaño y visor WebGPU sin errores registrados. Diagnóstico de la revisión en `diagnostico-92-r02.json`; las 66 pruebas citadas debajo pertenecen a la entrega inicial. Esta revisión mantiene abierto el punto para valoración artística.

## Implementación

`TyrellBuildingLights.js` añade máscaras emisivas procedurales en coordenadas métricas sobre la pirámide y los edificios inclinados del GLB y las tres mallas de ciudad. Ventanas dispersas y pequeñas, bandas ocasionales de hangares y acentos rojos/naranjas de ascensores. Las máscaras siguen las superficies y excluyen las caras casi horizontales; su suavizado usa derivadas de pantalla. No se añaden luces físicas ni mapas de sombras. Es una interpretación de las referencias: no un mapa literal de cada hangar o ascensor del modelo cinematográfico.

Los materiales se clonan exclusivamente en los objetos exteriores para no afectar a materiales compartidos de la sala. La desactivación devuelve emisión cero; el cierre restaura los materiales originales y libera las copias. La ciudad conserva su control de visibilidad.

Las balizas blancas se sitúan en vértices superiores reales del GLB, seleccionando máximos por bandas de 30 m de anchura. Tienen doble destello breve en un ciclo de 2,4 s, con desfases. Son pequeñas superficies visibles, sin iluminar físicamente la sala. Sus cambios invalidan los reflejos para evitar destellos congelados. Las torres laterales permanecen sin llamaradas.

## Controles

En **Exterior — Fase 9**: **Luces de edificios**, 0–2, inicial 0,22; **Balizas blancas**, 0–2, inicial 0,70. Cero apaga cada conjunto independientemente. Diagnóstico y comparación exportan ambos valores y número de balizas. La primera prueba de ventanas grandes/intensas se descartó a favor de una escala más fina y menor intensidad.

## Validación y límites

66 pruebas aprobadas; prueba específica de luces repetida tras la calibración. Comprueba aislamiento respecto a materiales compartidos del interior, apagado, destello, límites de parámetros y restauración de recursos. Compilación de producción con tres avisos habituales de tamaño. Revisión visual y capturas numeradas en `../../capturas/INDEX.md`.

No se considera cerrada la valoración artística. Las ventanas a distancia pueden quedar por debajo de un píxel en Baja; revisar también Media/Alta en 9.6. El coste de los destellos incluye las actualizaciones de reflejos cuando están activos; no se atribuye un coste GPU fijo sin una comparación medida. Siguiente punto: 9.3, tráfico aéreo lejano con control de densidad.
