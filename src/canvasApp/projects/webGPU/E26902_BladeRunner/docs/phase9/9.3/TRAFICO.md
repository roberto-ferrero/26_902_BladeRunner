# 9.3 · Tráfico aéreo lejano

Implementado el 21/09/2026 como propuesta visual pendiente de valoración del usuario. Se conserva el acabado de amanecer/atardecer. La fase 9.4 continúa en su documento propio; 9.5 sigue pendiente.

## Revisión r06 · Retirada del hangar · 21/09/2026

El usuario descarta la maniobra del hangar. Se elimina su curva, la asignación inicial y el desvío en las siguientes regeneraciones: quedan únicamente los tres corredores de paso. Se conservan ocho vehículos de base, los tamaños y la cota reducida del corredor frontal. Las propuestas de hangar r04/r05 quedan **rechazadas y retiradas**, con sus capturas conservadas como historial.

Las pruebas de diez minutos confirman que todos los vehículos permanecen en su corredor después de regenerarse. La revisión WebGPU confirma tres rutas, ocho vehículos y ausencia del desvío. Captura 9.3_019 y diagnóstico de apagado de 9.4 (solo tráfico lejano activo). La validación conjunta se registra en [9.4](../9.4/TRAFICO-CERCANO.md).

## Revisión histórica r05 · Salida tras la pirámide y escala del hangar · 21/09/2026

El vehículo que se dirige al hangar se reduce al **25 % del tamaño que tenía en r04**, con su cuerpo y luces escalados juntos. Su escala absoluta pasa de 1,25 a 0,3125, igual a la del tráfico frontal. Los vuelos que permanecen en los corredores del fondo conservan 1,25. La escala se asigna al iniciar cada recorrido, cuando el vehículo está tapado o desvanecido; no cambia de tamaño durante el tramo visible.

La aproximación ahora comienza en (−120; 43; −850) m, detrás de la pirámide, y avanza oculta por su silueta. Sale a la vista hacia la derecha antes de realizar el giro y descenso ya definidos. Se elimina la entrada anterior desde el extremo izquierdo del cielo. La primera aproximación de la sesión también empieza en ese tramo oculto: no aparece directamente en mitad de la maniobra. Se conserva el destino detrás del bloque marcado y la cadencia de los tres corredores.

Seis pruebas correctas. La comprobación geométrica confirma que el casco queda tapado por la pirámide al 0, 10, 20, 30 y 40 % de la ruta desde Camera_E, CAM01 y CAM03; a continuación queda visible en la muestra del 45 % desde Camera_E. Se mantiene la prueba de trayectoria sin cruces y destino oculto. También se comprueba que las siguientes aproximaciones heredan el tamaño reducido y que la escala del tráfico lejano se restaura al cambiar de ruta fuera de vista. Las revisiones anteriores se conservan como historial.

Compilación correcta en 84,8 s con tres avisos de tamaño. Revisión en WebGPU, Camera_E, sin errores de consola registrados. El diagnóstico a 15,1 s confirma al vehículo de aproximación con escala 0,3125 y progreso 0,3885, todavía en el tramo oculto; el tráfico frontal conserva su escala 0,3125. Capturas 017–018 y registros `tests-93-r05.log`, `build-93-r05.log`, `diagnostico-r05.json`, `air-traffic-visibility-r05.json`. Sin nueva comparativa de rendimiento; la valoración global de 9.6 continúa pendiente.

## Revisión histórica r04 · Escala frontal y llegada al hangar · 21/09/2026

Referencia aportada por el usuario: [trazado rojo de aproximación y bloque de ocultación en verde](referencia-hangar-r04.png).

Se reduce únicamente el tráfico del corredor frontal al **25 % de su tamaño en r03**, incluyendo casco, separación de luces y halos. Su escala absoluta es 0,3125 respecto al modelo original; los vehículos del fondo y de aproximación conservan 1,25. La cota frontal baja **2,5 m**: ahora discurre aproximadamente entre 9,5 y 12,5 m, con el mismo sentido de derecha a izquierda y la misma cadencia.

El antiguo desvío que regresaba al corredor se transforma en una aproximación al hangar supuesto del dibujo del usuario. Parte del corredor alto hacia la derecha, describe una curva amplia mientras se acerca y desciende, regresa hacia la izquierda por delante del edificio inclinado y termina detrás del bloque saliente de la pirámide marcado en verde. Se conserva su carácter ocasional: cada vehículo del corredor principal toma el desvío una vez cada tres vueltas. El hangar queda sugerido por el recorrido, sin añadir geometría de puerta o edificio.

El vuelo conserva toda su opacidad durante el descenso; la arquitectura lo oculta al final. El reciclado ocurre cuando el casco está tapado. El destino mundial es aproximadamente (−8; 10,7; −224) m. La comprobación con el GLB cubre 600 segmentos de la trayectoria sin cruces del eje con la pirámide/inclinados, y comprueba ocho esquinas que envuelven el casco al llegar: quedan ocultas desde Camera_E, CAM01 y CAM03. Desde Camera_E, el objeto que lo tapa es el bloque frontal de la pirámide, a unos −194 m en Z. La auditoría añade la proyección de la curva sobre Camera_E para comparar su forma con el dibujo; las comprobaciones son geométricas y no sustituyen la valoración artística.

Seis pruebas de tráfico y comparación correctas, incluyendo repetición durante diez minutos, escala relativa, altura frontal, ausencia de desvanecimiento anticipado y ocultación del destino. Base de ocho vehículos, GUI al 80 % y recursos compartidos conservados. Registros anteriores sin sobrescribir.

Compilación correcta en 90,5 s, con los tres avisos de tamaño habituales. Revisión WebGPU en Camera_E: diagnóstico con ocho vuelos activos, escala 0,3125 en los dos frontales y 1,25 en los demás; aproximación activa y sin errores de consola registrados. Capturas 013–016 en distintos momentos del recorrido y registros `tests-93-r04.log`, `build-93-r04.log`, `diagnostico-r04.json`, `air-traffic-visibility-r04.json`. La auditoría de cámara fija estima actividad visible el 76,8 % del tiempo en CAM01, el 87,7 % en CAM03 y el 97,6 % en Camera_E; son medidas geométricas aproximadas, no de legibilidad ni rendimiento. No se repite la comparativa de coste; 9.6 continúa pendiente.

## Revisión histórica r03 · Cruce ante las fachadas y tamaño · 21/09/2026

A petición del usuario, se añade un tercer corredor por delante de la pirámide y los edificios inclinados, de derecha a izquierda. Pasa a unos 155–163 m de profundidad y 12–15 m de altura: queda entre las oficinas y la fachada más próxima de la pirámide, por encima de los edificios bajos y por debajo de la cima. La curva conserva más de seis metros de margen respecto al vértice más próximo de la pirámide, incluyendo holgura para el vehículo ampliado.

Los ocho vehículos de base se reparten en 3 + 3 + 2; cinco circulan de derecha a izquierda. Los dos cruces nuevos están separados medio ciclo de 40 s, de modo que el corredor repite cada 20 s. Los corredores anteriores conservan sus periodos de 60/68 s y los desvíos. El control general de densidad gobierna los tres corredores y sigue arrancando al 80 %.

Todos los vehículos aumentan un **25 %** mediante una escala uniforme de 1,25 aplicada al grupo completo: silueta, separación de luces y halos. La intensidad de las luces no cambia. El casco pasa de 2,3 × 0,48 × 2,9 m a 2,875 × 0,60 × 3,625 m. Se mantiene el modelo mínimo propio de 9.3; la geometría y los sobrevuelos próximos de 9.4 siguen pendientes.

Cinco pruebas de tráfico/comparación correctas, incluida la circulación de diez minutos, el sentido del nuevo corredor y su separación respecto a las fachadas. La auditoría `air-traffic-visibility-r03.json` confirma puntos visibles con la pirámide detrás del vehículo en CAM01–04 y Camera_E/Camera_free. Para CAM01, la simulación geométrica estima tráfico visible el 75,2 % de las muestras y una pausa máxima de 6,2 s; CAM02 gana cobertura hasta el 56,4 %. Estas cifras no miden legibilidad y dependen de cámara fija, sin paneo. Los registros r02 quedan conservados como estado anterior.

Compilación correcta en 73,3 s con tres avisos de tamaño. Diagnóstico WebGPU: tres corredores, ocho vehículos y escala 1,25; tras 107,2 s, ambos vehículos del corredor frontal han completado tres vueltas. Sin errores de consola registrados. Revisión visual de CAM01, CAM03 y Camera_E; registros `tests-93-r03.log`, `build-93-r03.log`, `diagnostico-r03.json`, `diagnostico-r03-repeticion.json` y capturas 008–012. No se repite la comparativa de rendimiento en esta revisión; la evaluación global de 9.6 sigue pendiente.

## Revisión histórica r02 · Continuidad del tráfico · 21/09/2026

El usuario observó dos vehículos al inicio y pausas largas después, con posteriores pasos demasiado lejanos. La primera propuesta sí regeneraba los vuelos, pero dedicaba gran parte de sus recorridos a tramos laterales fuera de cuadro. Se duplica la base de cuatro a **ocho vehículos** (GUI inicial **80 %**), se recortan esos tramos y se aproxima el corredor secundario. Los tamaños y las luces mantienen su escala discreta.

Cada corredor mantiene cuatro vuelos separados un cuarto de ciclo. Las vueltas duran 60 y 68 segundos; incluso los desvíos conservan el periodo del corredor para evitar agrupaciones a medida que pasa el tiempo. Entre ambos corredores se renueva un vuelo aproximadamente cada ocho segundos de media. La prueba de diez minutos confirma al menos 70 renovaciones y ninguna pausa entre renovaciones superior a 15,1 s; esto no equivale al intervalo entre apariciones en pantalla.

Cinco pruebas de tráfico y comparación correctas; compilación correcta en 62 s con los tres avisos habituales de tamaño. La auditoría de diez minutos con rayos hacia el centro de los vehículos estima, para CAM01 fija, tráfico dentro del encuadre y sin oclusión durante el 84,5 % de las muestras y un intervalo vacío máximo de 2,7 s. En CAM03 son 96,2 % y 2,7 s. Son aproximaciones geométricas, no medidas de legibilidad: no incluyen paneo ni tamaño aparente y usan pasos de 1/200 de ruta. CAM02 tiene mucha menos cobertura; Camera_B/C y Camera_free no muestran estos corredores desde sus posiciones fijas.

Revisada la escena WebGPU en CAM01 y CAM03, con GUI a 80 %. El diagnóstico tras 123,8 s de simulación confirma ocho vehículos activos y entre una y tres vueltas completadas por vehículo; sin errores de consola registrados. Registros: `tests-93-r02.log`, `build-93-r02.log`, `air-traffic-visibility-r02.json`, `diagnostico-r02.json`; capturas 005–007. Se conservan los registros y capturas de la primera propuesta. No se ha repetido la comparativa de rendimiento en esta revisión.

## Comportamiento y control

Dos corredores cruzan el fondo en sentidos contrarios y a distinta altura/profundidad; un tercero pasa ante las fachadas de derecha a izquierda. La trayectoria utiliza distancia recorrida sobre curvas para mantener la velocidad durante cada pasada y un periodo común a cada corredor para conservar la separación. Los periodos son 60, 68 y 40 s respectivamente. Todos los vuelos repiten su corredor; no existe aproximación al hangar.

El corredor frontal usa escala 0,3125; los dos del fondo, 1,25. Cuerpos, separación de luces y halos comparten la escala de cada vehículo.

La GUI incorpora **Exterior — Fase 9 → Densidad de tráfico lejano**, de 0 a 100 %. El valor inicial es 80 %, equivalente a ocho vehículos repartidos por el exterior, no ocho simultáneamente visibles. Cero oculta todo el conjunto y detiene su reloj; 100 % limita el conjunto a diez vehículos. Las entradas y salidas del control se suavizan durante dos segundos, salvo el apagado a cero, que es inmediato. Los extremos de las rutas se desvanecen para evitar saltos visibles al repetirlas.

Cada vehículo es una silueta de ocho triángulos, con dos luces blancas constantes y un estrobo blanco de doble destello, suave y desfasado entre vehículos. El periodo es 2,7 s; cada pulso dura 0,12 s. Los halos comparten una textura de 64 × 64 y respetan la profundidad de la escena. La silueta usa la atmósfera común; los halos tienen atenuación aproximada por distancia para evitar que la mezcla aditiva de bruma forme manchas. No se añaden lámparas reales ni sombras.

## Integración y límites

`TyrellAirTraffic.js` mantiene un conjunto reutilizable de diez vehículos, una geometría de casco y una textura compartidas. Cada vehículo completo suma 14 triángulos contando los tres sprites. Los recursos se liberan mediante el recorrido común de `disposeScene`. Movimiento y destellos usan tiempo de simulación; los saltos al recuperar foco se limitan a 0,1 s. Reflejo planar invalidado como máximo a 5 Hz por el tráfico; captura de metal/vidrio a 1 Hz, además de sus otras causas de actualización. Los diagnósticos y la comparación A/B incluyen densidad, rutas, posiciones y estado.

Los dos corredores del fondo mantienen Z menor que −350 m y más de diez metros de altura sobre el punto más alto de la pirámide original. El corredor frontal ocupa la franja Z −155 a −163 m y pasa por debajo de la cima, separado del edificio en profundidad. La auditoría histórica `air-traffic-visibility-r05.json` incluía la aproximación retirada y prueba 199 posiciones por ruta y cámara, con rayos hacia los centros y oclusión por el GLB. Hay tramos visibles desde CAM01–04, Camera_D/E/F y Camera_free; su cobertura varía con la cámara. Camera_B/C no muestran estos corredores en sus encuadres fijos actuales. La auditoría no cubre cada posición libre ni paneo. La separación temporal conserva una circulación estable, mientras la arquitectura sigue ocultando vehículos de forma natural.

## Validación histórica · Primera propuesta

Seis pruebas correctas: seguridad y desvío de rutas, movimiento independiente de FPS, apagado y reutilización del conjunto, repetición sin aparición brusca, estroboscopia y regresiones de luces/comparación. Compilación correcta en 59,5 s con los tres avisos habituales de tamaño. GUI verificada en 0 %, 35 % y 100 %; diagnóstico a 100 % confirma diez vehículos. Revisión visual en CAM01 y CAM03, con paso observado en la vista general y ocultación por arquitectura; sin errores WebGPU registrados. Capturas 001–004 conservadas en el índice.

Medición en la misma sesión, CAM01, Baja optimizada 8.2, viewport 1280 × 720 y render 960 × 399. Cada muestra descarta 60 fotogramas y recoge 120 intervalos RAF. Exposición 1,07, Tyrell v1, luz 4.2 y efectos iniciales activos.

| Orden | Densidad | FPS | Media ms | P95 ms |
| --- | --- | --- | --- | --- |
| 1 | 0 % | 47,4 | 21,11 | 34,4 |
| 2 | 35 % | 32,8 | 30,51 | 36 |
| 3 | 35 % | 59,8 | 16,72 | 22 |
| 4 | 0 % | 59,8 | 16,72 | 22,5 |

Se conservan las cuatro muestras en `measurements.json`. La variación inicial no se ha aislado; no se atribuye a una causa concreta ni se presenta la última pareja como prueba de coste cero. Las últimas muestras alcanzan el límite aproximado de pantalla. Sin tiempos CPU/GPU activados; no se mide VRAM. La comparación por calidades y del conjunto de Fase 9 corresponde a 9.6.

Registros: `tests.log`, `build.log`, diagnósticos de tráfico apagado/máximo/inicial y auditoría de visibilidad. Reproducir la auditoría desde la raíz del repositorio con `node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-air-traffic.mjs`.
