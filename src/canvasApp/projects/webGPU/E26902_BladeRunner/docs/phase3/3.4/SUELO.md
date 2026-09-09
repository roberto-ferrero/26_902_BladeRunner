# 3.4 · Pavimento: juntas, desgaste y normal

Revisión técnica completada el 09/09/2026. Las juntas siguen visibles desde CAM 01 y CAM 04 y se conserva el mapa de desgaste. La comparación en WebGPU con normal activada/desactivada no muestra ondulaciones apreciables a la escala de revisión. El gran brillo central permanece en ambas variantes; esta comprobación no cierra la calibración de iluminación ni los reflejos de fases 4 y 5.

## Cambios

- Control **Color y materiales → Normal de piedra negra**, activado al arrancar. Desactivarlo pone `normalScale` a cero; reactivarlo recupera 0,025 para Tyrell v1 o la intensidad original del GLB. Conserva el signo del eje Y importado.
- El control persiste al alternar acabados. No elimina mapas, clona materiales ni modifica UV, geometría o rugosidad.
- Las capturas añaden `normalon`/`normaloff` al nombre; el diagnóstico incluye `materialLook.floorNormal` y paso 3.4.
- El rótulo de Three.js utiliza ahora la revisión real del motor. En esta sesión está instalada **0.185.1**, aunque las primeras fases se validaron con r182. No se cambiaron dependencias en esta entrega.

## Auditoría del recurso

[floor-audit.json](floor-audit.json) registra 21 primitivas de pavimento, 21 nodos y **cero triángulos con UV colapsadas** en este material. El GLB mantiene SHA-256 `bf2108bbe13d32df23bfa34e598c1d98085e2322e859fbf62354240f7e6b8fa2`; originales Blender, geometría y texturas permanecen intactos.

| Normal | Desviación máxima | Percentil 95 |
| --- | ---: | ---: |
| Desactivada | 0° | 0° |
| Tyrell v1, 0,025 | 0,1045° | 0,0397° |
| Importada, 0,035 | 0,1463° | 0,0556° |

Ángulos calculados sobre los píxeles del mapa en un marco tangente plano; no representan la normal mundial completa de la malla. El canal G de rugosidad varía entre 0,1137 y 0,4510, con mediana 0,1882. [roughness-G.png](roughness-G.png) conserva arañazos dispersos y variación mineral: no se reemplaza por una rugosidad uniforme.

Reproducción desde la raíz del repositorio, con Python, Pillow y NumPy instalados:

```powershell
python src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-floor.py
npm.cmd run test:tyrell
npm.cmd run build
```

## Evidencia WebGPU

Calidad Media, Tyrell v1, 0 EV, luz provisional. Chrome 152, Windows, adaptador NVIDIA Turing. Las siguientes imágenes son capturas de la **interfaz mostrando el resultado 1920 × 800 reducido**; no son los PNG originales a resolución completa. La comparación visual queda limitada a esa escala.

- [CAM 01 normal activada](cam01-normal-on-ui.png).
- [CAM 01 normal desactivada](cam01-normal-off-ui.png).
- [CAM 04 normal activada](cam04-normal-on-ui.png).
- [Diagnóstico CAM 04](runtime-cam04.json): WebGPU, 20 materiales, 25 texturas auditadas, sin incidencias de conexiones, normal del suelo `[0.025, -0.025]`.

Las juntas permanecen rectas y el brillo amplio cambia muy poco al anular la normal. Se mantiene la intensidad 0,025 de Tyrell v1. La lectura todavía demasiado clara del centro y la falta de reflejos del mobiliario requieren trabajar luces y reflexión; no se consideran resueltas aquí.

**Validación:** 18/18 pruebas correctas; compilación de producción correcta con tres advertencias de tamaño/rendimiento. La consola del visor no presenta errores durante la revisión; advierte de la deprecación de `THREE.Clock` en el motor instalado. Las métricas de CAM 04 corresponden a 824 × 343 y no son un benchmark a 1920 × 800.

Siguiente entrega: **3.5**, decidir qué materiales estándar conservar y dónde será necesario un material de nodos. **3.3 permanece abierto** para la revisión completa de acabados y de las UV colapsadas de otros materiales.
