# 4.6 · Fugas de luz y contactos

09/09/2026. Se corrige el apoyo del maletín sobre la mesa y se conserva la iluminación R01 con las sombras de 4.4. La reducción de `normalBias` ensayada se descarta al observar bandas en la mesa, especialmente en Baja. No se añade oclusión ambiental ni se oscurece globalmente la escena.

## Mediciones y corrección

La auditoría carga el GLB activo mediante GLTFLoader y lanza rayos sobre su geometría real en coordenadas mundiales. Las texturas son sustitutos para ejecutar en Node: el script no evalúa materiales ni iluminación. [Datos antes/después](contacts.json).

| Elemento | Medición | Decisión |
| --- | --- | --- |
| Maletín | Separación uniforme de 3,59995 mm en las cuatro esquinas; después 0 mm | Bajar cuerpo, tapa y ambos cierres como conjunto |
| Dos pies de la mesa | 16 muestras por pie, separación inferior a 0,000001 mm | Conservar |
| Cuatro sillas | Punto más bajo a aproximadamente 0,079 mm del suelo | Conservar; no equivale a comprobar cada rueda |
| Jarra y dos vasos | Bases apoyadas dentro del error numérico | Conservar la sombra parcial del vidrio |
| Carpeta | Separación de 0,36 mm | Conservar; no se aprecia flotación que justifique modificarla |
| Pavimento y mortero | 11.659 rayos verticales, paso 20 cm; ninguna muestra sin soporte | No añadir otra superficie al suelo |

Se revisan también las bases de las 18 columnas. Parte de su huella cae sobre mortero, 31 mm por debajo de la cota del pavimento, y algunos vértices de las prolongaciones traseras quedan fuera de las superficies de suelo muestreadas. No se interpreta esto como columnas flotantes ni se desplaza su geometría: las bases interiores tienen apoyo y las vistas revisadas no muestran una abertura que requiera reconstruirlas. El informe conserva tanto aciertos como muestras sin soporte. Los núcleos interiores añadidos anteriormente y su prueba de cierre de juntas siguen activos.

`TyrellContacts.js` aplica la corrección una vez durante la carga, después de comprobar cuatro apoyos uniformes y un hueco entre 0,2 y 5 mm. Si cambia el modelo y no cumple esas condiciones, no mueve el conjunto. La operación es idempotente y conserva geometrías, materiales y relaciones entre las cuatro piezas. No modifica el GLB ni el Blender original. El diagnóstico incluye `contactRepair` y la revisión `4.6`.

## Ensayo de sombras y lectura visual

Se comparó `normalBias = 0,010 m` frente a los `0,025 m` anteriores, conservando dirección solar, bias de profundidad, PCF, exposición y rellenos. Al ser rasante la luz, el desplazamiento normal puede separar visualmente los contactos. Sin embargo, reducirlo expuso bandas de autosombra sobre la mesa en Baja; no se conserva ese ensayo.

El resultado final recupera **0,025 m**. Se mantiene el brillo especular del pavimento, el contraluz y la lectura de piedra de R01. El cambio visible del maletín es pequeño y localizado; no se presenta como una nueva versión de acabado. La carpeta archivada R01 permanece intacta.

Respecto al fotograma de referencia, siguen faltando los reflejos largos de columnas/mobiliario y la profundidad atmosférica. Las sombras profundas conservan el balance acordado; subir el ambiente para revelar todo su detalle reduciría el contraste. Esas diferencias se abordarán en las fases 5 y 6.

## Alcance de la revisión

El muestreo vertical no demuestra ausencia de toda fuga: no examina todos los rayos solares, aberturas de pared o posiciones del futuro recorrido libre. El ambiente hemisférico y los rellenos de área siguen sin oclusión física. Esta entrega resuelve el contacto medido y valida las vistas de referencia; no implementa GI ni sombras de contacto adicionales. Si las próximas cámaras o reflejos revelan otro defecto, se reabre esta revisión.

## Evidencia y reproducción

Capturas cronológicas **4.6_001–006**: dos vistas anteriores y cuatro del ensayo descartado. **007–010** documentan el resultado final: Baja sin las bandas del ensayo y CAM 02/04/01 en Media. [Registro completo](../../capturas/INDEX.md) y [diagnóstico final](../../capturas/4.6_010_2026-09-09_CAM01.json). Son pantallazos de interfaz 1294 × 912 con el render fijo 1920 × 800 reducido; cámara sin paneo. Todas usan Tyrell v1, luz 4.2 con balance R01, Base R01 indirecta, composición completa y 0 EV.

Desde la raíz del repositorio:

```powershell
node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-contacts.mjs --write
npm.cmd run test:tyrell
npm.cmd run build
```

**26/26 pruebas correctas.** La prueba nueva comprueba el apoyo del GLB real, movimiento conjunto, conservación de los demás objetos/recursos e idempotencia. También continúan pasando las pruebas de juntas de columnas y cobertura solar. La corrección no añade mallas, triángulos, mapas ni pasadas de render; sólo cuatro transformaciones al cargar y ocho consultas de rayos sobre las dos superficies de apoyo.

Compilación final Webpack 5.97.1 correcta en **52,5 s**, con las tres advertencias de empaquetado existentes. Prueba de cobertura solar repetida correctamente después de restaurar normalBias. `git diff --check` sin errores. El visor queda en CAM 01, Media, Base R01, con diagnóstico 4.6 confirmado.

Siguiente entrega: **5.1 · Reflector planar del pavimento**. No se inicia en esta revisión.
