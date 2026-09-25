# Plan de optimización de la escena · p0, p1, p2 y recorridos

25/09/2026 · Revisión del código local en `a461322`. Estado: **plan y auditoría preliminar; optimizaciones pendientes de implementar y medir**.

**Metodología aceptada:** tres niveles geométricos por familia —Alto, Medio y Simplificado—, independientes de los acabados, con un piloto de una columna, un sector de celosías y un grupo de edificios 9.1 antes de extender la producción al escenario. Esta revisión incorpora esa decisión; el inventario conserva la auditoría de partida.

La propuesta es reducir primero el trabajo que no contribuye a la imagen y después simplificar las familias con mayor coste. La ciudad 9.1 merece una revisión específica, pero las columnas, celosías, pavimento y pasadas de reflejo requieren al menos la misma atención. Reducir triángulos no garantiza mejorar FPS si el límite está en sombreado, transparencias o capturas de entorno.

## 1. Alcance y condiciones de partida

- **p0 = `initial`**, asociado a la tecla 0; p1 y p2 corresponden a los estados del mismo nombre. No se propone cambiar sus posiciones ni encuadres.
- Se contemplan los seis recorridos dirigidos: p0→p1, p1→p0, p0→p2, p2→p0, p1→p2 y p2→p1. También las interrupciones de una transición para iniciar otra desde la posición actual.
- Se conservan paneo, animación del Voight-Kampff, movimiento de tráfico y efectos que contribuyan a las imágenes finales.
- Referencia principal: formato 2,4:1. La implementación deberá validar además los aspectos realmente permitidos en escritorio y móvil, incluido el encuadre sin bandas si sigue disponible.
- La cámara de desarrollo C debe desactivar las restricciones cinematográficas y recuperar el escenario completo. Si vuelve a ofrecerse navegación libre, necesitará la misma excepción.
- Se conserva la selección de calidad actual: GPU Score inicial y una comprobación en p1. Este plan no propone volver al ajuste continuo por FPS que se retiró en R05.

| Estado | Posición XYZ, metros | FOV vertical | Paneo horizontal / vertical máximo |
| --- | --- | ---: | --- |
| p0 (`initial`) | −0,120 / 1,550 / 10,300 | 22,92° | ±2 / ±0,5 m |
| p1 | 1,038 / 0,942 / −8,501 | 33,22° | ±0,5 / ±0,2 m |
| p2 | −8,745 / 1,902 / −3,968 | 33,00° | ±2 / ±0,5 m |

Fuentes: [cámaras exportadas](../../cameraStates.generated.json), [configuración manual](../../cameraStates.config.js) y `static/config/E26902_BladeRunner/gui.initial.json`.

## 2. Inventario real por familias

Se ha leído el GLB activo y ejecutado en Node los constructores procedurales actuales. Los recuentos siguientes son geometría almacenada o construida, **no triángulos efectivamente dibujados por fotograma**. Una pieza puede quedar fuera de cámara o dibujarse en varias pasadas. Las primitivas por material tampoco equivalen por sí solas al contador final de llamadas de dibujo.

### Modelo principal

GLB activo: `BladeRunner_5_6_High_v3_phase2.glb`, **40.502.716 bytes, 104 nodos con geometría, 142 primitivas y 337.941 triángulos contando las instancias**, antes de sustituciones y añadidos de ejecución. Son cifras actuales; algunos README y diagnósticos anteriores describen otras revisiones.

| Familia | Elementos presentes | Triángulos del GLB | Propuesta |
| --- | --- | ---: | --- |
| Columnas / pilares de sala | 18 columnas, 01–18; 36 primitivas | **138.745** | Visibilidad individual; versiones simplificadas según tamaño en pantalla; conservar perfiles y juntas próximas |
| Relieves y celosías | 11 sectores | **63.543** | Ocultación por sector; hornear relieves interiores donde no afecten a silueta, huecos o sombras |
| Pavimento | 21 sectores | **55.220** | Conservar sectorización; simplificar biseles y juntas subpíxel, manteniendo planos, contactos y reflejo |
| Exterior original | `Tyrell_Corporation_Pyramid`, una malla combinada | **39.654** | Separar piezas espaciales identificables antes de seleccionar ocultaciones; proteger pirámide y edificios inclinados |
| Sillones | 4 sillones, 6 primitivas por sillón | **24.032** | Ya comparten 6 geometrías; estudiar instancias por material y LOD solo si la medición lo justifica |
| Pedestales y ornamentos | 17 piezas: `Base*`, `Postament*`, `Vase_Big*`, `Sphere*`, `Zylinder*`, `Foot`, `Foot_2`, `Stand` | **10.478** | Clasificación visual pendiente; ocultación por grupo y simplificación de curvas lejanas |
| Cristalería antigua | Licorera, tapón y 2 vasos originales | **1.984** | Ya se oculta al sustituirla; no contabilizarla como ahorro nuevo de render |
| Arquitectura restante | 2 muros, 2 alas, parapeto, dintel, techo, podio, alféizar y viga | **1.513** | Bajo coste geométrico; revisar sombras y oclusión antes de retirar piezas |
| Mesa y soportes | Tablero, 2 pies y 9 piezas de acabado | **1.241** | Mantener detalle próximo y apoyos; baja prioridad de reducción |
| Puerta | `Door_Frame`, 1 marco | **1.122** | Candidato por cámara, pero puede entrar en p2; no se ha identificado una hoja de puerta independiente |
| Carpeta y papel | 2 piezas | **331** | Mantener salvo ocultación demostrada |
| Cielo y sol originales | Fondo y disco | **66** | El coste principal es cobertura/material, no geometría |
| Mortero | 1 base bajo pavimento | **12** | Mantener mientras cumpla su función visual |

Columnas, celosías y pavimento reúnen **257.508 triángulos: el 76,2 % del modelo principal**. Es el principal bloque geométrico a estudiar, aunque su participación efectiva depende de las vistas y pasadas.

No aparece una familia independiente denominada «pilares»: las 18 columnas son la familia estructural identificada. No conviene inventar esa distinción sin comprobar el modelo visualmente.

### Elementos añadidos o sustituidos durante la ejecución

| Familia | Elementos y coste comprobado | Implicación |
| --- | --- | --- |
| Núcleos de columnas | 18 respaldos fusionados en 1 malla; **7.944 triángulos añadidos**. Otros 211 triángulos se trasladan de las columnas a esta malla | Evitan fugas de luz en juntas. Sectorizar junto a sus columnas; no borrar la reparación |
| Ciudad 9.1 | **97 edificios: 22 cercanos, 42 intermedios y 33 lejanos**; 3 chimeneas/torres; reparación de cubierta y 3 grupos de remates | Todo está fusionado por material en 3 mallas: **17.754 triángulos**, 1.478 cajas y 18 triángulos de revestimiento |
| Chimeneas | Derecha: (400, −460), altura superior 28; izquierda: (−680, −700), altura 24; izquierda lejana: (−900, −830), altura 15 | Coordenadas XZ y cota Y. Su geometría está incluida en ciudad; separarlas permitiría control individual |
| Fuegos / llamaradas | 3 emisores × 11 sprites preparados; **máximo 1 emisor simultáneo**; sin luces reales | Priorizar cobertura transparente, simulación e invalidaciones de reflejos, más que polígonos |
| Luces de edificios | Emisión procedural en 4 mallas receptoras y **5 balizas**; nervios de ascensor generados en material | No son cientos de lámparas. Su coste se concentra en shader, sprites y actualizaciones |
| Tráfico lejano | Capacidad 10 vehículos; densidad por defecto 0,8, equivalente a 8 activos; 3 corredores | 14 triángulos de cuerpo por vehículo, más sprites. Ya es geométricamente económico |
| Tráfico próximo | 1 vehículo, 1 ruta; diagnóstico de **1.308 triángulos por vehículo**, incluidos sus planos auxiliares | Optimizar visibilidad/cadencia; menor prioridad de simplificación geométrica |
| Cristalería importada | Licorera 17.152, tapón 3.840, vaso 5.520 triángulos; el vaso se usa dos veces | **32.032 triángulos colocados**, frente a 26.512 únicos en el GLB. 3 materiales físicos, transmisión y 3 contactos planos adicionales |
| Voight-Kampff | 16 piezas, **14.891 triángulos** en el asset, más óptica/halo creados en código | Mantener calidad en p1 y animación; LOD de silueta para p0 si aporta ahorro |
| Reflejos | Planar del suelo, sonda de sala 128² por cara y sonda de cristal 512² por cara | Una actualización conjunta de las dos sondas puede requerir **12 vistas de escena**, además de la vista principal |
| Atmósfera y acabado | Bruma exterior/interior, volumen solar y polvo, cielo panorámico, bloom, flare y gradación | Medir GPU, píxeles cubiertos y pasadas. No se valoran por número de objetos |

La ciudad ya omite cinco nervios pequeños por edificio: **5.820 triángulos retirados previamente**. Los 23.574 triángulos que aparecen en documentación histórica no son el punto de partida actual.

El [inventario JSON](inventory.json) enumera cada nodo de los tres GLB, sus materiales, geometría y huellas SHA-256. El [listado CSV](inventory.csv) contiene los 104 nodos del modelo principal y las tres envolventes de llamaradas, con clasificación y matriz de cámaras.

## 3. Primera matriz de visibilidad: qué merece probarse

Auditoría geométrica preliminar sobre cajas envolventes mundiales del GLB, aspecto 2,4:1, nueve posiciones de paneo por muestra y 101 posiciones interpoladas por pareja de cámaras. Las trayectorias completas comparten geometría en ambos sentidos, pero su comportamiento temporal debe validarse por separado.

**«Potencial» significa que la caja entra en algún encuadre muestreado; no demuestra que el objeto sea visible tras las paredes. «Fuera» tampoco certifica que pueda borrarse:** faltan oclusión real, muestras continuas, transiciones interrumpidas, otros aspectos, transformaciones de ejecución relevantes y contribuciones indirectas. Esta matriz sirve para seleccionar ensayos, no para activar ocultaciones automáticamente.

| Familia | p0 | p1 | p2 | p0↔p1 | p0↔p2 | p1↔p2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Columnas potenciales / 18 | 12 | 3 | 8 | 12 | 14 | 9 |
| Sectores de pavimento / 21 | 15 | 5 | 12 | 15 | 15 | 12 |
| Sectores de relieves/celosías / 11 | 4 | 1 | 3 | 4 | 6 | 4 |
| Sillones / 4 | 4 | 3 | 4 | 4 | 4 | 4 |
| Marco de puerta / 1 | 0 | 0 | 1 | 0 | 1 | 1 |
| Envolventes de llamaradas / 3 | 0 | 2 | 1 | 2 | 1 | 3 |

Hallazgos útiles para concretar los primeros ensayos:

- **p0:** ninguna envolvente de llamarada entra en las muestras. Candidato a suspender su trabajo visual directo; aún hay que comprobar reflejos.
- **p1:** las envolventes izquierdas pueden entrar; la derecha queda fuera. De las columnas, solo 04, 09 y 13 resultan potenciales en las muestras. El presupuesto debe concentrarse en mesa, VK y cristalería, sin asumir que todo el fondo puede desaparecer.
- **p2:** la llamarada derecha puede entrar y las izquierdas quedan fuera de las muestras. El marco de puerta puede aparecer. No reutilizar el conjunto de p0.
- **p1↔p2:** pueden entrar las tres llamaradas a lo largo del recorrido. Apagarlas según el destino provocaría desapariciones durante el movimiento.
- Las columnas **05, 06, 14 y 15**, seis sectores de pavimento y cinco sectores de relieves quedan fuera de todas las muestras. Son **15 nodos y 57.460 triángulos de geometría almacenada candidatos a estudiar**. No son 57.460 triángulos de ahorro de render: el motor puede estar descartándolos ya y pueden ser necesarios en sombras/reflejos.

Los seis sectores de pavimento son (3,0), (2,0), (1,0), (4,1), (0,2), (4,0). Los cinco de relieves son (1,2), (5,2), (5,1), (1,1), (0,2). Conservarlos en los archivos fuente hasta validar todas sus contribuciones.

## 4. Política de ocultación y efectos por cámara

### Separar contribuciones

Cada objeto o sector necesita registrar si participa en imagen principal, sombras, reflejo planar, sonda de sala, sonda de cristal y simulación. Un único `visible=false` global puede eliminar todas esas contribuciones.

El motor ya dispone de descarte por frustum. El trabajo nuevo debe centrarse en mallas demasiado grandes, oclusión por arquitectura, pasadas secundarias y actualizaciones que siguen ejecutándose fuera de cámara. Las capas permiten seleccionar objetos por cámara, pero su integración con las cámaras de sombra, cubo y reflector debe comprobarse en esta versión. [Object3D](https://threejs.org/docs/pages/Object3D.html), [Layers](https://threejs.org/docs/pages/Layers.html).

### Durante el recorrido

1. Resolver primero la pose real, incluido paneo, FOV y offset; después decidir visibilidad y actualizar efectos. Actualmente parte de los efectos y las sondas se actualizan antes del movimiento de cámara en el bucle principal.
2. Empezar con conjuntos conservadores para cada recorrido completo. La unión de los dos encuadres extremos es insuficiente: una pieza puede verse solo a mitad del recorrido.
3. Incorporar margen de entrada y salida e histéresis. Reactivar antes de entrar en pantalla y ocultar después de salir. Dimensionar el margen con velocidad, suavizado y tamaño de pantalla; evitar un umbral de distancia universal.
4. Ante una transición interrumpida, usar la pose real y su nuevo trayecto. Mientras no exista una envolvente validada, recuperar el conjunto completo relevante; nunca seguir usando exclusivamente la etiqueta del destino.
5. Precargar geometrías y variantes necesarias antes del movimiento. No compilar materiales ni descargar assets al cruzar un umbral visible.
6. En la primera implementación, mantener para cada pieza un nivel geométrico suficiente para todo el trayecto, incluido el paneo. Prepararlo antes de iniciar el movimiento y conservarlo hasta terminar; no cambiar automáticamente de nivel al atravesar una distancia. Si el cambio inicial o final resulta perceptible, conservar el nivel compartido con la vista contigua. Las transiciones graduales de detalle se estudiarán después del piloto.

### Efectos y reflejos

- **Llamaradas y tráfico:** separar reloj lógico de trabajo visual. Mantener la fase con tiempo absoluto o actualización barata; omitir transformaciones de sprites y solicitudes de captura si no contribuyen a ninguna pasada activa. La reentrada debe continuar de forma coherente, sin reiniciar todas las explosiones.
- **Invalidaciones:** actualmente tráfico, llamaradas y balizas pueden ensuciar las sondas sin consultar la cámara principal. Crear motivos por efecto y por destino de captura; procesarlos solo si afectan a una contribución visible. Comprobar también cuánto de cada efecto aparece en el suelo o en vidrio.
- **Sondas:** medir por separado sala y cristalería. Probar caché para la parte estática y menor cadencia para cambios pequeños. Congelar completamente una sonda solo si la comparación confirma que no hay variación perceptible. Ya existe una cadencia mínima de 0,5 s en el modo de ahorro de detalle de p1; no atribuirla al nuevo plan.
- **Suelo:** desactivar la pasada planar únicamente si no tiene receptores visibles relevantes. En Baja/Extra baja de escritorio y en perfiles móviles ya se restringe por calidad; esos casos no ofrecen el mismo ahorro adicional que Alta.
- **Volumen y polvo:** probar menos pasos o una variante reducida para p1, midiendo a igual resolución. Conservar el carácter de los haces en p0/p2. La bruma puede seguir siendo necesaria aunque el exterior visible ocupe pocos píxeles.
- **Cristal:** evitar simplificar simultáneamente geometría, transmisión y sonda, porque sería imposible atribuir el ahorro o la pérdida visual. Comparar cada componente por separado.

## 5. Simplificación de geometrías

### Tres niveles geométricos por familia · metodología aceptada

Se producirán tres versiones equivalentes de las familias que se beneficien de simplificación. Cada pieza o sector podrá elegir su versión de manera independiente: un encuadre puede combinar VK y mesa en Alto, columnas en Medio y ciudad en Simplificado. Las piezas cuyo coste ya sea mínimo podrán compartir la misma geometría en los tres niveles.

| Nivel | Contenido geométrico | Aplicación prevista |
| --- | --- | --- |
| **Alto · LOD0** | Referencia actual, con perfiles, juntas, biseles, relieves y piezas pequeñas | Primeros planos, elementos protagonistas y referencia de comparación |
| **Medio · LOD1** | Misma silueta y volúmenes principales; menos subdivisiones, biseles y detalles pequeños | Vistas generales y tamaños intermedios en pantalla |
| **Simplificado · LOD2** | Contorno reconocible, huecos importantes, apoyos y volúmenes esenciales; reducción fuerte del detalle interior | Fondo, elementos pequeños en pantalla y presupuestos limitados |

Los tres niveles son **catálogos de geometrías equivalentes**, no tres escenas completas que deban duplicar luces, materiales, texturas o animaciones. Solo se dibujará la variante seleccionada de cada pieza en cada pasada. Los porcentajes de reducción se fijarán por familia después del piloto: un mismo porcentaje no ofrece el mismo resultado en una celosía, una columna o una licorera.

**Contrato entre versiones:** conservar identificador estable de pieza/familia/sector, posición, escala, pivotes, dimensiones principales, apoyos y anclajes de animación. Mantener asignaciones de material y UV compatibles con el mismo acabado, y revisar normales y tangentes donde afecten al sombreado. Registrar por variante sus triángulos, primitivas, recursos compartidos, límites geométricos y revisión del archivo fuente. No es necesario que coincidan el número de vértices o la topología.

Los acabados se resolverán sobre ese contrato. La primera comparación de los tres niveles utilizará los mismos materiales, texturas, luces, resolución y efectos para aislar el cambio geométrico. Si una simplificación necesita hornear relieves en mapas, se documentará como una segunda variante combinada de geometría y acabado, con medición separada; ese horneado no se considerará una reducción puramente geométrica.

### Selección de nivel, visibilidad y continuidad

- **Visibilidad:** decidir si una pieza contribuye a la imagen principal, sombras o reflejos, según la sección 4.
- **Detalle:** para las contribuciones necesarias, elegir la versión por tamaño máximo en pantalla, importancia visual y presupuesto del equipo. La distancia será un dato auxiliar; FOV y resolución también afectan a la lectura del detalle.
- **Acabado y efectos:** mantener su configuración independiente. Los tres niveles de geometría no sustituyen los cinco perfiles de calidad existentes; su correspondencia se calibrará después de medir y podrá mezclar niveles dentro de un perfil.
- **Recorridos:** usar al principio una selección conservadora y estable por pieza para todo el trayecto. Ante una interrupción, reevaluar desde la pose real; conservar una variante suficiente ya preparada hasta poder cambiar sin salto visible. No degradar una pieza a mitad de un primer plano por haber cambiado la etiqueta de cámara.
- **Sombras y reflejos:** comenzar con el mismo nivel seleccionado para todas las pasadas relevantes. Probar versiones específicas por pasada solo si mejoran el coste y mantienen coherencia de siluetas, contactos y reflejos.
- **Carga:** compartir materiales y texturas; preparar el nivel activo y los necesarios para el siguiente recorrido. Medir memoria y carga para evitar que almacenar las tres versiones en GPU anule parte del beneficio. La descarga de una variante debe respetar los recursos compartidos.

### Piloto obligatorio antes de producir todas las variantes

Seleccionar, mediante revisión de p0/p1/p2 y sus recorridos, tres unidades identificadas en el catálogo. La muestra debe ser visible y suficientemente exigente para descubrir defectos; no elegir únicamente piezas que ya queden ocultas.

| Unidad piloto | Versiones | Qué debe resolver |
| --- | --- | --- |
| Una columna representativa | Alto, Medio y Simplificado, incluyendo el tratamiento de su núcleo | Lectura de juntas, perfil, sombras y ausencia de fugas de luz |
| Un sector de relieves/celosías | Alto, Medio y Simplificado | Qué relieve puede reducirse manteniendo huecos, contornos y sombras |
| Un grupo de edificios 9.1 | Alto, Medio y Simplificado con igual distribución y semilla | Qué terrazas, cornisas y equipos pueden retirarse sin alterar silueta, paralaje ni continuidad urbana |

El piloto entregará **nueve variantes lógicas**, con reutilización de recursos cuando proceda, y una tabla por unidad/nivel con triángulos, primitivas, tamaño de asset, memoria estimada y coste medido. La referencia Alto puede reutilizar directamente la geometría existente. Para la ciudad, mantener igual partición y acabado entre niveles durante la comparación; medir la sectorización en un ensayo separado.

Comparar cada unidad en contexto, primero con selección manual Alto/Medio/Simplificado y después con la combinación propuesta por cámara. Revisar p0, p1 y p2, los seis recorridos, paneo extremo, sombras y reflejos. Seguir el protocolo de la sección 8 para distinguir diferencias repetibles del ruido de medida.

**Criterio para extender la producción:** cada nivel debe tener un ámbito de uso visualmente válido y un beneficio verificable en geometría/memoria; su adopción en ejecución requiere comprobar también el rendimiento del conjunto. Si el ahorro de una sola unidad queda por debajo de la resolución de la medida, indicarlo y medir el coste agregado antes de atribuir una mejora de FPS. Fijar entonces los presupuestos por familia y las restricciones por cámara/recorrido. Si una variante pierde silueta, juntas, huecos o contactos, revisarla o reservarla a vistas menos exigentes. La aceptación de esta metodología no valida todavía las variantes que se produzcan.

### Ciudad 9.1

**Valoración:** candidata razonable de prioridad media, con mayor interés en sectorización y material que en reducción bruta. Sus 17.754 triángulos y tres mallas son modestos frente al interior; generar 97 objetos independientes podría empeorar el resultado.

Propuesta inicial de sectores: cercano izquierdo/centro/derecho, intermedio izquierdo/derecho, lejano izquierdo/centro/derecho, tres chimeneas y reparación de cubierta. Son **12 grupos lógicos como punto de partida**, con fusión por material dentro de cada sector. Ajustar el número según llamadas y tiempo GPU medidos.

| Capa | Tratamiento propuesto | Condición de conservación |
| --- | --- | --- |
| 22 edificios cercanos | Mantener terrazas, siluetas y remates visibles; retirar caras enterradas y solapes internos demostrados | No abrir huecos con el paneo ni alterar cubierta local |
| 42 intermedios | Reducir equipos, cornisas y bandas pequeñas; resolver detalle interior de fachada en textura/material | Mantener altura, distribución, solapes y lectura de ventanas |
| 33 lejanos | Probar volúmenes de 1–2 cuerpos; atlas o impostores solo como segunda alternativa | Validar paralaje en todos los recorridos y su imagen reflejada |
| 3 chimeneas | Separarlas; conservar contorno y boquilla; reducir montantes/plataformas de tamaño subpíxel | Cada fuego debe seguir unido a su chimenea y respetar oclusiones |
| Revestimiento de cubierta | Conservar inicialmente sus 18 triángulos y 3 grupos de remates | Su ahorro es mínimo y resuelve un defecto visual previo |

Después del piloto del grupo representativo, extender Alto/Medio/Simplificado a los sectores que lo justifiquen. La ciudad actual de **17.754 triángulos** será la referencia Alto; **12.000 y 8.000 triángulos** se mantienen solo como hipótesis iniciales para el conjunto en Medio y Simplificado, pendientes de ajustar con el piloto. No son presupuestos aprobados ni ganancias garantizadas. Cada nivel debe conservar semilla, posiciones, alturas y el tono artístico vigente. Al retirar piezas hay que seguir consumiendo las muestras aleatorias correspondientes para no desplazar los edificios posteriores, como ya hace la eliminación de nervios.

La sectorización exige actualizar `TyrellBuildingLights`: actualmente busca exactamente `City / 0`, `City / 1` y `City / 2`. Sustituir esa dependencia por metadatos estables de familia/sector, manteniendo `tyrellPanel`, `tyrellCentral`, rampas de color, offsets y UV métricas. Comprobar el límite de atributos de WebGPU al introducir instancias.

Comparar un material más sencillo con el `MeshPhysicalNodeMaterial` actual, manteniendo la salida artística y emisión. No sustituirlo a ciegas: la apariencia está corregida después del sombreado atmosférico. El modo llamado `lod` en el color de ciudad regula su color por calidad; **no es un LOD geométrico**.

### Interior y objetos próximos

| Familia | Ensayo propuesto | Riesgo a revisar |
| --- | --- | --- |
| Columnas | Alto actual; Medio y Simplificado calibrados en la columna piloto. El 60 % y 35 % de triángulos restantes son hipótesis de ensayo, no porcentajes obligatorios | Silueta, juntas, normales, sombras y reaparición de fugas de luz. Sectorizar núcleos de forma coherente |
| Relieves/celosías | Hornear relieve de superficie; conservar geometría en huecos y contornos; seleccionar por sector | Una normal no reproduce huecos, transparencias ni sombra proyectada |
| Pavimento | Comparar juntas/biseles simplificados o parcialmente horneados en sectores lejanos | Reflejo rasante, parpadeo, continuidad de juntas y contacto con muebles |
| Sillones | Probar instancias por las 6 familias de material; conservar detalle próximo | El ahorro potencial es de llamadas: ya comparten geometría y texturas. Cuatro sillas pueden no justificar la complejidad |
| Cristalería | LOD simplificado de cuerpos facetados en vistas alejadas; mantener alta calidad en primeros planos | Silueta, facetas, refracción y espesor; calibrar junto a la licorera escalada |
| VK | Mantener 16 piezas móviles y calidad próxima; simplificar tornillos/cables poco visibles en vista general | No fusionar piezas con articulaciones distintas ni romper la óptica |
| Exterior original | Identificar pirámide, edificios inclinados y base; dividir solo donde permita descartar sectores | Una sola caja envolvente mantiene potencialmente activa la malla completa; no recortar siluetas emblemáticas |

Instanciar tiene sentido para geometría/material realmente compartidos y transformaciones diferentes; no equivale a reducir triángulos visibles. Mantener agrupaciones espaciales pequeñas cuando una instancia global impediría el descarte útil. [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).

## 6. Texturas, carga y recursos

- Auditar dimensiones y uso por mapa. El GLB principal contiene 25 imágenes y el VK otras 4. Medir resolución necesaria según ocupación máxima en pantalla, especialmente p1.
- Valorar texturas comprimidas para GPU y reducción selectiva de resolución; comprobar soporte del pipeline y calidad de normales, roughness y atlas del VK. Separar ahorro de descarga, memoria y GPU: son objetivos distintos.
- Valorar compresión de geometría para distribución después de estabilizar los LOD. No presentarla como mejora automática de FPS.
- La cristalería antigua ya está oculta pero permanece en el asset y se utiliza para calcular apoyos. Para retirarla de una copia de distribución, exportar primero los anclajes y adaptar ese contrato de carga.
- Revisar assets históricos copiados a `dist`. Retirarlos del paquete de producción puede reducir publicación y almacenamiento, pero no acelera por sí mismo una escena que nunca los descarga.
- Mantener originales Blender/GLB y generar assets optimizados aparte, con revisión, hash y opción de comparación.

## 7. Orden de ejecución y entregables

| Paso | Trabajo | Prioridad / esfuerzo relativo | Entregable y criterio para avanzar |
| --- | --- | --- | --- |
| 0 | Congelar referencia y medir las tres vistas y todos los recorridos | Crítica / medio | Capturas, perfiles efectivos, hardware, timings por pasada y métricas repetibles |
| 1 | Completar catálogo semántico, contribuciones y contrato entre niveles | Alta / medio | Matriz por pieza/sector; validar los 15 candidatos; identificar las tres unidades piloto y sus recursos compartidos |
| 2 | Piloto Alto/Medio/Simplificado: una columna, un sector de celosías y un grupo de edificios 9.1 | Alta / medio-alto | Nueve variantes lógicas, comparación con idéntico acabado y reglas de uso por vista/recorrido; fijar presupuestos antes de producir el resto |
| 3 | Evitar actualizaciones e invalidaciones sin contribución; separar sondas | Alta / medio-alto | Comparación A/B a igual resolución y calidad; cero saltos de efectos o reflejos |
| 4 | Integrar visibilidad y selección estable de nivel por vista/recorrido | Alta / medio-alto | Sin desapariciones ni saltos de geometría en paneo, interrupciones o C; precarga y memoria comprobadas |
| 5 | Extender niveles a columnas y celosías; incorporar pavimento por sectores | Alta si geometría/sombras pesan / alto | Aplicar criterios del piloto y validar sin pérdida de perfiles, juntas ni contactos |
| 6 | Extender niveles y sectorización de ciudad 9.1; evaluar material por separado | Media / medio-alto | Presupuestos revisados tras el piloto; comparar geometría, sectorización y acabado de manera independiente |
| 7 | Cristal, VK y sillones según el perfil de p1 | Condicionada por medición / medio-alto | Mantener calidad del primer plano; ganancias separadas por geometría/material/sonda |
| 8 | Texturas, paquete y calibración final de perfiles | Media / medio | Correspondencia entre los tres niveles geométricos y los perfiles existentes; informe de carga/memoria y rendimiento en equipos objetivo |

Los esfuerzos son comparativos, no plazos. La duración dependerá especialmente de la revisión artística de LOD y de la disponibilidad de dispositivos reales.

**Primera intervención acordada sobre geometrías:** tras congelar la referencia y completar el catálogo, producir y comparar las tres unidades piloto en Alto, Medio y Simplificado. Extender las variantes al escenario solo después de establecer sus criterios de uso. El trabajo de sondas y visibilidad conserva su prioridad de rendimiento y se medirá por separado para no confundir sus ganancias con las del piloto. En ciudad, ensayar la separación de chimeneas y el coste de llamadas antes de sectorizar todo el conjunto.

## 8. Medición y aceptación

Propuesta de objetivo: 60 FPS estables en escritorio objetivo (16,7 ms por fotograma) y perfil móvil de 30 FPS (33,3 ms), pendiente de fijar hardware. No prometer esas tasas basándose en el score sintético ni en pruebas de una GPU distinta.

1. Medir en producción con misma resolución interna, calidad manual fija, aspecto, cámara, paneo y fase de animaciones. Registrar además una validación final en automático. Excluir compilación y benchmark inicial/secundario de las ventanas de rendimiento.
2. Calentar al menos 10 s; capturar tres ventanas de 30 s por vista, con p1 abierto y cerrado; cubrir ciclos de tráfico/llamaradas. Para rutas, tres repeticiones por sentido como mínimo, incluyendo paneo extremo e interrupciones al 25/50/75 %.
3. Registrar RAF medio, p95/p99 y máximos; CPU de envío; GPU por pasada cuando existan timestamps; llamadas y triángulos por pasada; frecuencia real de capturas de sondas/planar y motivos de invalidación. Si no hay timestamp GPU, señalar que la medida alternativa no es equivalente.
4. Usar las herramientas existentes: `TyrellPerformance`, `TyrellSustainedMeasurement`, comparación y diagnósticos. Añadir desglose por familia/contribución donde falte. El contador de geometrías/texturas no mide VRAM; bytes calculados de buffers/texturas serán una estimación, identificada como tal.
5. Comparar cada cambio individualmente y después combinado. Exigir mejora por encima de la variabilidad entre repeticiones, sin empeorar el p95 del recorrido. Un umbral inicial razonable para adoptar cambios complejos es una reducción repetible de alrededor del 10 % en la pasada afectada; no sustituye la evaluación del fotograma completo.
6. Capturas A/B con tiempo de animación congelado y video de los recorridos: revisar siluetas, juntas, sombras, reflexiones, refracción, halos, tonos de ciudad y detalle del VK. La aceptación de ocultación exige ausencia de saltos visibles, no solo mejores números.
7. Validar en GPU de escritorio e integrada y en móvil real si forman parte del destino. La simulación de viewport móvil no valida su GPU.
8. Para el piloto geométrico, mantener acabados y efectos idénticos al comparar Alto, Medio y Simplificado. Añadir recuentos de geometría única e instanciada, memoria estimada de variantes residentes y tiempo de preparación del recorrido. Validar después la mezcla de niveles por cámara y su continuidad, antes de ensayar cambios de acabado o niveles específicos para reflejos/sombras.

Para la implementación: añadir comprobaciones de selección por pasada, activación anticipada, restauración al usar C, transiciones interrumpidas, respeto de preferencias GUI/calidad y continuidad de efectos. Ejecutar las pruebas pertinentes y build cuando cambie el código de ejecución.

Cada entrega debe incluir captura de referencia, variante con interruptor A/B, resultado numérico y limitaciones. Si una simplificación baja triángulos pero no mejora tiempo o empeora la imagen, se descarta o se reserva al perfil que sí se beneficie.

## 9. Evidencia y límites de esta entrega

- Auditoría reproducible: `node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-optimization.mjs`, desde la raíz del repositorio.
- [Script](../../scripts/audit-optimization.mjs), [inventario y diagnósticos procedurales](inventory.json), [matriz por elemento](inventory.csv).
- Lectura del código actual de ciudad, efectos, calidad, cámaras, reflejos, cristalería y VK. La documentación histórica se usa como contexto, no como medida vigente.
- Revisión metodológica aceptada: tres niveles geométricos independientes de acabados y piloto previo a su producción general. Las cifras del inventario siguen describiendo la escena original auditada; todavía no existen los nuevos niveles Medio y Simplificado de este plan.
- La auditoría usa geometría real y constructores actuales; la decodificación de imágenes se sustituye para ejecutarla sin GPU. No valida materiales renderizados, oclusión real ni imágenes finales. El CSV no incluye una matriz espacial del VK animado, la cristalería recolocada o edificios individuales de la ciudad fusionada: esa ampliación pertenece al paso 1.
- **No se ha ejecutado una comparativa nueva de FPS ni se han aplicado ocultaciones o simplificaciones a la escena.** Esta entrega establece el inventario, los candidatos concretos, las prioridades y el procedimiento de aceptación. Las ganancias siguen pendientes de medición.
