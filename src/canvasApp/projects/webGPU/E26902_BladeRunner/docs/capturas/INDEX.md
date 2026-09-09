# Registro cronológico de capturas

Formato: `PUNTO_NNN_AAAA-MM-DD_CAMxx.png`. Contador creciente por punto, también entre revisiones y cámaras. No sobrescribir. Próxima captura de 4.3: **007**; primera de 4.4: **001**. Guardar una nueva captura al completar cada punto y registrar su estado; un resultado rechazado reabre el punto.

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
