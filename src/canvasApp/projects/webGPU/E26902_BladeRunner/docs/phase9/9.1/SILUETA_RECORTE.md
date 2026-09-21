# Revisión de silueta y recorte — 2026-09-21

- Base de color revisada a `#42331d` bajo la pirámide, con transición suave por edificio hacia `#342816` en ambos extremos. Se toma la distancia lateral al centro de la huella auditada de la pirámide (X = -49,2357 m): zona central hasta 50 m y tono extremo desde 140 m (mitad del recorrido anterior), constante desde ahí hasta el final. Todos los módulos de un edificio comparten la muestra de su centro. Se mantienen los tres materiales compartidos y la misma geometría.
- Salida local tras niebla con variación direccional del 7% y aporte acotado de iluminación del 8%, antes de AgX y del etalonado global. Los hexadecimales son referencias de material, no una garantía de píxel idéntico con cualquier exposición.
- Emisión de ventanas conservada por separado al clonar los materiales de ciudad.
- Cuerpo de cada edificio de relleno limitado a 18 m bajo el arranque de las terrazas (unos 22–24 m hasta la cubierta). Se recorta por debajo, manteniendo azoteas, distribución y semilla. No se recorta la arquitectura original del GLB ni las torres de fuego.
- Eliminados cinco nervios menores por edificio: 485 cajas y 5.820 triángulos menos. Acortar una caja por sí solo no reduce sus polígonos.
- Pruebas generales: 91 aprobadas. Tras corregir el nodo de color se repitieron las tres pruebas de ciudad y luces: aprobadas.
- Revisión visual en navegador WebGPU: CAM01 y Camera_E, calidad Baja. Pendiente comparar el corte desde el encuadre libre exacto del croquis; estas cámaras comprueban la lectura desde la sala.
