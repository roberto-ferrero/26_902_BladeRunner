# Registro cronológico de capturas

Formato: `PUNTO_NNN_AAAA-MM-DD_CAMxx.png`. Contador creciente por punto, también entre revisiones y cámaras. No sobrescribir. Próxima captura de 4.3: **007**; de 4.4: **006**; de 4.5: **010**; de 4.6: **011**; de 5.1: **008**; de 5.2: **008**; de 5.3: **012**; de 5.4: **008**; de 5.5: **006**; primera de 6.1: **001**. Guardar una nueva captura al completar cada punto y registrar su estado; un resultado rechazado reabre el punto.

## Entrega conjunta 5.3–5.5

09/09/2026. Horas UTC (Madrid +2 h). Todos son pantallazos 893 × 912, codificados como PNG desde la imagen entregada por el navegador, sin cambiar tamaño o contenido visual. Salvo 5.3/011, muestran el diálogo de captura fija 1920 × 800 reducido, sin paneo. Tyrell v1, luz 4.2 con balance R01, Base R01 indirecta, 0 EV y normales activas. Calidad Media salvo las excepciones indicadas. El reflector planar usa Piedra pulida 5.2.

### 5.3 · Cámaras

Reflejo planar activado, entorno de metal/vidrio desactivado. 001–010: compilación 5.2 con actualización continua; 011: compilación final con caché adaptativa.

| Orden | Hora | Archivo | Vista y estado |
| --- | --- | --- | --- |
| 5.3 / 001 | 19:31:09 | [CAM 01](5.3_001_2026-09-09_CAM01.png) | General |
| 5.3 / 002 | 19:31:50 | [CAM 03](5.3_002_2026-09-09_CAM03.png) | Columnas invertidas, poco suelo visible |
| 5.3 / 003 | 19:33:16 | [CAM 05](5.3_003_2026-09-09_CAM05.png) | Camera_B, fondo inverso pendiente |
| 5.3 / 004 | 19:35:22 | [CAM 06](5.3_004_2026-09-09_CAM06.png) | Camera_C, lateral inverso |
| 5.3 / 005 | 19:37:14 | [CAM 07](5.3_005_2026-09-09_CAM07.png) | Camera_D, mesa desde atrás |
| 5.3 / 006 | 19:37:52 | [CAM 08](5.3_006_2026-09-09_CAM08.png) | Camera_E, plano cerrado de mesa |
| 5.3 / 007 | 19:38:09 | [CAM 09](5.3_007_2026-09-09_CAM09.png) | Camera_F, fondo/cielo limitado |
| 5.3 / 008 | 19:38:24 | [CAM 10](5.3_008_2026-09-09_CAM10.png) | Camera_free, pose fija elevada |
| 5.3 / 009 | 19:38:43 | [CAM 02](5.3_009_2026-09-09_CAM02.png) | Mesa y juntas |
| 5.3 / 010 | 19:39:07 | [CAM 04](5.3_010_2026-09-09_CAM04.png) | Lateral de referencia |
| 5.3 / 011 | 19:47:52 | [CAM 01 en vivo](5.3_011_2026-09-09_CAM01.png) | Paneo activo; no es captura fija. [Diagnóstico](5.3_011_2026-09-09_CAM01.json) |

[Conclusiones y límites de las vistas inversas](../phase5/5.3/CAMARAS.md).

### 5.4 · Resolución y actualización

CAM 01, reflector activado y entorno de metal/vidrio desactivado.

| Orden | Hora | Archivo | Estado |
| --- | --- | --- | --- |
| 5.4 / 001 | 19:40:56 | [Iteración inicial](5.4_001_2026-09-09_CAM01.png) | Caché sin reutilización, corregida después; [diagnóstico](5.4_001_2026-09-09_CAM01.json) |
| 5.4 / 002 | 19:46:04 | [Adaptativo corregido](5.4_002_2026-09-09_CAM01.png) | Auto/Media, 50 %; [1 render / 871 reutilizaciones](5.4_002_2026-09-09_CAM01.json) antes de capturar |
| 5.4 / 003 | 19:46:38 | [25 %](5.4_003_2026-09-09_CAM01.png) | Resolución manual 25 %, adaptativo |
| 5.4 / 004 | 19:47:15 | [100 %](5.4_004_2026-09-09_CAM01.png) | Resolución manual 100 %, adaptativo |
| 5.4 / 005 | 19:50:10 | [Continuo](5.4_005_2026-09-09_CAM01.png) | Auto/Media, cada render; [diagnóstico](5.4_005_2026-09-09_CAM01.json) |
| 5.4 / 006 | 19:50:35 | [Baja](5.4_006_2026-09-09_CAM01.png) | Auto/Baja, reflector 25 %, adaptativo |
| 5.4 / 007 | 19:50:51 | [Alta](5.4_007_2026-09-09_CAM01.png) | Auto/Alta, reflector 75 %, adaptativo |

[Parámetros, ahorro y limitaciones](../phase5/5.4/RENDIMIENTO.md). Media/Auto/adaptativo restaurados después.

### 5.5 · Metal y vidrio

Reflector planar activado, Media, Auto 50 %. 001–002 pertenecen a la primera compilación; 003–005 incluyen la caché corregida.

| Orden | Hora | Archivo | Estado |
| --- | --- | --- | --- |
| 5.5 / 001 | 19:41:14 | [CAM 02 sin entorno](5.5_001_2026-09-09_CAM02.png) | Comparación inicial |
| 5.5 / 002 | 19:43:27 | [CAM 02 con entorno](5.5_002_2026-09-09_CAM02.png) | Una captura local; [diagnóstico](5.5_002_2026-09-09_CAM02.json) |
| 5.5 / 003 | 19:52:14 | [CAM 02 final](5.5_003_2026-09-09_CAM02.png) | R01 restaurado después de estudio; tres capturas locales, [diagnóstico](5.5_003_2026-09-09_CAM02.json) |
| 5.5 / 004 | 19:53:37 | [CAM 04 final](5.5_004_2026-09-09_CAM04.png) | Ambos reflejos activados |
| 5.5 / 005 | 19:54:15 | [CAM 01 final](5.5_005_2026-09-09_CAM01.png) | Estado dejado para revisión; [diagnóstico final](5.5_005_2026-09-09_CAM01.json) |

[Fuente, coste y límites del entorno](../phase5/5.5/ENTORNO.md). 23 pantallazos nuevos en total; R01 archivado permanece intacto. Al recargar, los dos controles de reflexión arrancan desactivados.

## Entrega 5.2 · Reflejo de piedra pulida

09/09/2026. Horas UTC (Madrid +2 h). Media, Tyrell v1, luz 4.2 con balance R01, Base R01 indirecta, composición completa y 0 EV. Reflejo activado y cámara fija sin paneo. El render de referencia es 1920 × 800, mostrado reducido en la interfaz. El navegador entregó pantallazos JPEG, codificados como PNG sin cambiar tamaño ni contenido visual.

| Orden | Hora UTC | Archivo | Tamaño del pantallazo | Estado |
| --- | --- | --- | --- | --- |
| 5.2 / 001 | 19:16:32 | [CAM 01](5.2_001_2026-09-09_CAM01.png) | 1294 × 912 | Referencia: compilación anterior, ensayo uniforme 5.1 |
| 5.2 / 002 | 19:18:54 | [CAM 01](5.2_002_2026-09-09_CAM01.png) | 893 × 912 | Piedra 5.2, normales activas; [diagnóstico](5.2_002_2026-09-09_CAM01.json) |
| 5.2 / 003 | 19:19:16 | [CAM 04](5.2_003_2026-09-09_CAM04.png) | 893 × 912 | Piedra 5.2, normales activas |
| 5.2 / 004 | 19:19:58 | [CAM 04](5.2_004_2026-09-09_CAM04.png) | 893 × 912 | Comparador uniforme 5.1, normales activas |
| 5.2 / 005 | 19:20:36 | [CAM 04](5.2_005_2026-09-09_CAM04.png) | 893 × 912 | Piedra 5.2, normales desactivadas para comprobación |
| 5.2 / 006 | 19:22:15 | [CAM 04](5.2_006_2026-09-09_CAM04.png) | 893 × 912 | Compilación final, piedra 5.2 y normales activas |
| 5.2 / 007 | 19:23:31 | [CAM 01](5.2_007_2026-09-09_CAM01.png) | 893 × 912 | Final para revisión; [diagnóstico](5.2_007_2026-09-09_CAM01.json) |

El tamaño de ventana cambió entre 001 y 002; no comparar píxeles directamente entre ellas. 003/004 permiten comparar ambos acabados a igual tamaño. [Parámetros, validación y límites](../phase5/5.2/MATERIAL.md). R01 archivado intacto; no se registra una nueva versión de acabado.

## Entrega 5.1 · Ensayo de reflejo planar

09/09/2026, sesión desde 18:53 UTC (20:53 Madrid). Media, Tyrell v1, luz 4.2 con balance R01, Base R01 indirecta, composición completa y 0 EV. Cámara fija sin paneo. Pantallazos de interfaz 1294 × 912 con render 1920 × 800 reducido. No son PNG nativos de 1920 × 800.

| Orden | Archivo | Estado |
| --- | --- | --- |
| 5.1 / 001 | [CAM 01](5.1_001_2026-09-09_CAM01.png) | Sin reflejo planar; [diagnóstico base](5.1_001_2026-09-09_CAM01.json) |
| 5.1 / 002 | [CAM 01](5.1_002_2026-09-09_CAM01.png) | Ensayo activado, primera compilación; [coste observado](5.1_002_2026-09-09_CAM01.json) |
| 5.1 / 003 | [CAM 04](5.1_003_2026-09-09_CAM04.png) | Ensayo lateral, primera compilación |
| 5.1 / 004 | [CAM 04](5.1_004_2026-09-09_CAM04.png) | Compilación final, cámaras reutilizadas; reflejo activado |
| 5.1 / 005 | [CAM 02](5.1_005_2026-09-09_CAM02.png) | Compilación final, reflejo activado |
| 5.1 / 006 | [CAM 01](5.1_006_2026-09-09_CAM01.png) | Vuelta a R01 sin reflejo planar; [diagnóstico](5.1_006_2026-09-09_CAM01.json), 277 dibujos y tres targets retenidos |
| 5.1 / 007 | [CAM 01](5.1_007_2026-09-09_CAM01.png) | Ensayo final activado para revisión; [diagnóstico](5.1_007_2026-09-09_CAM01.json), se mantienen tres targets tras repetir capturas |

[Informe, alcance y siguiente ajuste](../phase5/5.1/REFLECTOR.md). Se trata de un prototipo aditivo, no de una nueva referencia de acabado. R01 permanece como inicio al recargar.

## Entrega 4.6 · Fugas y contactos

09/09/2026. Horas UTC (Madrid: +2 h). Todas usan Tyrell v1, luz 4.2 con balance R01, Base R01 indirecta, composición completa, 0 EV y cámara de referencia sin paneo. Pantallazos de interfaz 1294 × 912 con render 1920 × 800 reducido.

| Orden | Hora UTC | Archivo | Calidad | Estado |
| --- | --- | --- | --- | --- |
| 4.6 / 001 | 18:09:53 | [CAM 01](4.6_001_2026-09-09_CAM01.png) | Media | Antes, base 4.5 |
| 4.6 / 002 | 18:10:33 | [CAM 02](4.6_002_2026-09-09_CAM02.png) | Media | Antes, base 4.5 |
| 4.6 / 003 | 18:14:27 | [CAM 01](4.6_003_2026-09-09_CAM01.png) | Media | Ensayo descartado: normalBias 10 mm y maletín apoyado |
| 4.6 / 004 | 18:15:01 | [CAM 02](4.6_004_2026-09-09_CAM02.png) | Media | Ensayo descartado; [diagnóstico](4.6_004_2026-09-09_CAM02.json) |
| 4.6 / 005 | 18:17:12 | [CAM 04](4.6_005_2026-09-09_CAM04.png) | Media | Ensayo descartado |
| 4.6 / 006 | 18:18:07 | [CAM 02](4.6_006_2026-09-09_CAM02.png) | Baja | Ensayo descartado: bandas de autosombra sobre la mesa |
| 4.6 / 007 | 18:21:42 | [CAM 02](4.6_007_2026-09-09_CAM02.png) | Baja | Final: normalBias restaurado a 25 mm, bandas del ensayo eliminadas |
| 4.6 / 008 | 18:22:20 | [CAM 02](4.6_008_2026-09-09_CAM02.png) | Media | Final: maletín apoyado, sombras 4.4 |
| 4.6 / 009 | 18:22:37 | [CAM 04](4.6_009_2026-09-09_CAM04.png) | Media | Final: revisión lateral |
| 4.6 / 010 | 18:22:52 | [CAM 01](4.6_010_2026-09-09_CAM01.png) | Media | Final: general; [diagnóstico](4.6_010_2026-09-09_CAM01.json) |

[Mediciones, corrección y límites](../phase4/4.6/CONTACTOS.md). Resultado listo para revisión del usuario; no constituye una nueva versión de acabado ni aprobación de fidelidad final. R01 archivado intacto.

## Entrega 4.5 · Iluminación indirecta

09/09/2026, sesión aproximadamente 17:12–17:16 UTC (19:12–19:16 Madrid). Todas en Media, Tyrell v1, luz 4.2 con parámetros R01, 0 EV, composición completa y cámara de referencia sin paneo. Pantallazos de interfaz 1294 × 912 con render 1920 × 800 reducido; no son PNG nativos de 1920 × 800.

| Orden | Archivo | Estado |
| --- | --- | --- |
| 4.5 / 001 | [CAM 01](4.5_001_2026-09-09_CAM01.png) | Base R01, antes de los ensayos |
| 4.5 / 002 | [CAM 01](4.5_002_2026-09-09_CAM01.png) | Sonda difusa · ensayo |
| 4.5 / 003 | [CAM 01](4.5_003_2026-09-09_CAM01.png) | Entorno · ensayo |
| 4.5 / 004 | [CAM 02](4.5_004_2026-09-09_CAM02.png) | Entorno · ensayo |
| 4.5 / 005 | [CAM 02](4.5_005_2026-09-09_CAM02.png) | Sonda difusa · ensayo |
| 4.5 / 006 | [CAM 02](4.5_006_2026-09-09_CAM02.png) | Base R01 |
| 4.5 / 007 | [CAM 04](4.5_007_2026-09-09_CAM04.png) | Sonda difusa · ensayo |
| 4.5 / 008 | [CAM 04](4.5_008_2026-09-09_CAM04.png) | Entorno · ensayo |
| 4.5 / 009 | [CAM 04](4.5_009_2026-09-09_CAM04.png) | Base R01 restaurada |

Se conserva Base R01 como resultado. [Informe y validación](../phase4/4.5/INDIRECTA.md). Diagnósticos: [sonda CAM 04](4.5_007_2026-09-09_CAM04.json), [entorno CAM 04](4.5_008_2026-09-09_CAM04.json) y [Base R01 CAM 01](4.5_001_2026-09-09_CAM01.json). Este último se guardó al finalizar la sesión, tras restaurar la base; acompaña a 001 pero no es simultáneo a esa captura. Archivo R01 intacto.

## Entrega 4.4 · Sombras

09/09/2026, sesión 17:00–17:04 UTC. Todas en Media, Tyrell v1, luz R01, 0 EV, composición completa, cámara de referencia sin paneo. Interfaz 1294 × 912 con render 1920 × 800 reducido.

| Orden | Archivo | Estado |
| --- | --- | --- |
| 4.4 / 001 | [CAM 01](4.4_001_2026-09-09_CAM01.png) | Antes: página en caché, sombras R01 |
| 4.4 / 002 | [CAM 02](4.4_002_2026-09-09_CAM02.png) | Antes: sombras opacas de vidrio; [diagnóstico 4.3](4.4_002_2026-09-09_CAM02.json) |
| 4.4 / 003 | [CAM 02](4.4_003_2026-09-09_CAM02.png) | Después: revisión 4.4 confirmada, vidrio con sombra parcial |
| 4.4 / 004 | [CAM 01](4.4_004_2026-09-09_CAM01.png) | Después: cobertura y mobiliario. [Diagnóstico final](4.4_004_2026-09-09_CAM01.json) tomado después de probar paneo |
| 4.4 / 005 | [CAM 04](4.4_005_2026-09-09_CAM04.png) | Después: cobertura lateral, 17:03:54 UTC |

Se conservaron las dos capturas iniciales al detectar que la página anterior seguía en caché. [Informe de la entrega](../phase4/4.4/SOMBRAS.md). R01 archivado sin cambios.

| Orden | Fecha/hora | Archivo | Perfil y condiciones | Estado |
| --- | --- | --- | --- | --- |
| 4.3 / 001 | 09/09/2026, anterior a 002; hora original no registrada | [4.3_001_2026-09-09_CAM01.png](4.3_001_2026-09-09_CAM01.png) | Luz 4.3, CAM 01, Media, Tyrell v1, 0 EV, composición completa | Rechazada: demasiado oscura. Copia histórica de `../phase4/4.3/cam01-43.png`, no una nueva captura |
| 4.3 / 002 | 09/09/2026 12:27 UTC (14:27 Madrid) | [4.3_002_2026-09-09_CAM01.png](4.3_002_2026-09-09_CAM01.png) | Luz 4.2 corregida, CAM 01, Media, Tyrell v1, 0 EV, composición completa | Base restaurada para revisión; no resultado final aprobado |
| 4.3 / 003 | 09/09/2026 12:34:46 UTC (14:34:46 Madrid) | [4.3_003_2026-09-09_CAM01.png](4.3_003_2026-09-09_CAM01.png) | Base 4.2, sol 2,5, ambiente 0,86, CAM 01, Media, Tyrell v1, 0 EV | Ajuste solicitado de penumbra y contraste; pendiente de revisión visual del usuario. [Diagnóstico](4.3_003_2026-09-09_CAM01.json) |
| 4.3 / 004 | 09/09/2026, sesión 16:50–16:51 UTC | [4.3_004_2026-09-09_CAM01.png](4.3_004_2026-09-09_CAM01.png) | R01, CAM 01, Media, 0 EV | Base conservada para continuar |
| 4.3 / 005 | 09/09/2026, sesión 16:50–16:51 UTC | [4.3_005_2026-09-09_CAM02.png](4.3_005_2026-09-09_CAM02.png) | R01, CAM 02, Media, 0 EV | Revisión de mesa; sombras de vidrio pendientes |
| 4.3 / 006 | 09/09/2026 16:51:04 UTC | [4.3_006_2026-09-09_CAM04.png](4.3_006_2026-09-09_CAM04.png) | R01, CAM 04, Media, 0 EV | Revisión lateral, continuidad hacia 4.4 |

004–006: interfaz 1294 × 912 con captura de referencia 1920 × 800 reducida, sin paneo y composición completa. Se mantienen los parámetros R01; se descarta la propuesta de áreas reducidas. No son una nueva versión de acabado ni aprobación final de fidelidad cinematográfica.

Ambas muestran el render fijo 1920 × 800 sin paneo dentro del diálogo de captura. Son pantallazos de interfaz: 001 tiene 1280 × 720 y 002 tiene 1294 × 912, por cambio del tamaño de la ventana. Para comparación de píxeles, usar el mismo tamaño de ventana en próximas capturas o guardar los PNG originales 1920 × 800. Se conserva todo el histórico.

Restauración compilada sin errores (Webpack, 33,667 s; tres advertencias de empaquetado). El único cambio de ejecución de esta revisión es el perfil inicial de luz. El punto 4.3 queda pendiente según la revisión del usuario.

003 tiene 1294 × 912, igual que 002, y muestra la misma captura fija sin paneo. Revisión de contraste compilada sin errores en 30,132 s (tres advertencias de empaquetado). Exposición y fuentes de relleno sin cambios.
