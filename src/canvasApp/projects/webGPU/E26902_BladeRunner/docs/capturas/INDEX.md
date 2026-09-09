# Registro cronológico de capturas

Formato: `PUNTO_NNN_AAAA-MM-DD_CAMxx.png`. Contador creciente por punto, también entre revisiones y cámaras. No sobrescribir. Próxima captura de 4.3: **004**. Guardar una nueva captura al completar cada punto y registrar su estado; un resultado rechazado reabre el punto.

| Orden | Fecha/hora | Archivo | Perfil y condiciones | Estado |
| --- | --- | --- | --- | --- |
| 4.3 / 001 | 09/09/2026, anterior a 002; hora original no registrada | [4.3_001_2026-09-09_CAM01.png](4.3_001_2026-09-09_CAM01.png) | Luz 4.3, CAM 01, Media, Tyrell v1, 0 EV, composición completa | Rechazada: demasiado oscura. Copia histórica de `../phase4/4.3/cam01-43.png`, no una nueva captura |
| 4.3 / 002 | 09/09/2026 12:27 UTC (14:27 Madrid) | [4.3_002_2026-09-09_CAM01.png](4.3_002_2026-09-09_CAM01.png) | Luz 4.2 corregida, CAM 01, Media, Tyrell v1, 0 EV, composición completa | Base restaurada para revisión; no resultado final aprobado |
| 4.3 / 003 | 09/09/2026 12:34:46 UTC (14:34:46 Madrid) | [4.3_003_2026-09-09_CAM01.png](4.3_003_2026-09-09_CAM01.png) | Base 4.2, sol 2,5, ambiente 0,86, CAM 01, Media, Tyrell v1, 0 EV | Ajuste solicitado de penumbra y contraste; pendiente de revisión visual del usuario. [Diagnóstico](4.3_003_2026-09-09_CAM01.json) |

Ambas muestran el render fijo 1920 × 800 sin paneo dentro del diálogo de captura. Son pantallazos de interfaz: 001 tiene 1280 × 720 y 002 tiene 1294 × 912, por cambio del tamaño de la ventana. Para comparación de píxeles, usar el mismo tamaño de ventana en próximas capturas o guardar los PNG originales 1920 × 800. Se conserva todo el histórico.

Restauración compilada sin errores (Webpack, 33,667 s; tres advertencias de empaquetado). El único cambio de ejecución de esta revisión es el perfil inicial de luz. El punto 4.3 queda pendiente según la revisión del usuario.

003 tiene 1294 × 912, igual que 002, y muestra la misma captura fija sin paneo. Revisión de contraste compilada sin errores en 30,132 s (tres advertencias de empaquetado). Exposición y fuentes de relleno sin cambios.
