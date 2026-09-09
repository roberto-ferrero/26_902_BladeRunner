# Tyrell · R01 — Contraste equilibrado

Referencia registrada el **09/09/2026**, a petición del usuario. Identificador estable: **R01**. Corresponde al acabado actual de la captura **4.3_003**, posterior al ajuste de penumbra y contraste. Es una referencia de trabajo, no el cierre de 4.3 ni el acabado cinematográfico final.

## Estado conservado

- Materiales: **Tyrell v1**. Copia del ajuste en `TyrellLook.js`.
- Luz: **tyrell-light-v2**, con sol **2,5**, ambiente **0,86** y áreas **0,08 / 0,08 / 0,2 / 0,2**. Tamaños y orientación de las áreas de la base 4.2, no las áreas reducidas de la propuesta 4.3.
- Disco solar: **(8; 42,5; −650)**. Referencia independiente de dirección de luz: **(2; 58; −650)**.
- Exposición: **1,07**, compensación **0 EV**, AgX, salida sRGB.
- Normal del suelo activada, luz de estudio desactivada, composición completa.
- Referencia visual: **CAM 01, Media, 1920 × 800, sin paneo**. [Pantallazo archivado](CAM01.png), copia de 4.3_003; no es una nueva captura cronológica.
- [Diagnóstico completo](estado.json): materiales, luces, cámara, backend y recurso activo.

`config.js`, `TyrellLighting.js` y `TyrellLook.js` son copias históricas para consultar y recuperar parámetros, **no módulos de ejecución**. El GLB y la corrección de núcleos de columnas siguen siendo los del proyecto actual; no se duplican aquí. Esta carpeta no es un paquete autónomo del visor.

## Regla de versiones

**No modificar R01 cuando se cambie el acabado.** Guardar la próxima referencia como R02 y conservar estas copias y la captura. Para recuperar R01, aplicar los parámetros y lógica archivados sobre el visor, comprobar el diagnóstico y comparar con CAM01.png a la misma cámara, exposición y calidad. No reemplazar a ciegas todo el código por estas copias si la arquitectura ha cambiado.

El nombre del perfil de ejecución sigue siendo `tyrell-light-v2`; **R01 identifica esta instantánea concreta**, evitando confundirla con revisiones posteriores de ese perfil.
