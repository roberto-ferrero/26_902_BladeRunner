# 7.3 · Recorrido, colisiones y revisión de proximidad

13-09-2026. Transiciones: 4,5 s por defecto, GUI entre 0 y 10 s. La preferencia del sistema de reducir movimiento sigue desactivando las transiciones.

Recorrido a 1,4 m/s iniciales y ojos a 1,65 m; GUI regula velocidad y altura (1,20–1,90 m). Se retira el vuelo Q/E. En modo libre la cámara mantiene altura sobre el suelo principal y no atraviesa paredes, columnas ni mobiliario. Se conserva el modo de ratón con arrastre cuando Pointer Lock no está disponible.

## Colisiones

111 cajas XZ obtenidas del GLB, sin añadir geometría de render. Huella conservadora de 0,50 m de ancho; avance subdividido en pasos de hasta 5 cm y deslizamiento por ejes. Se excluyen suelo, cielo, exterior y elementos por encima de la cabeza. Límites de sala basados en paredes/pavimento: X ±8,9 m, Z −14,26 a 12 m, con margen de cuerpo. Los límites impiden salir por huecos hacia espacio sin recorrido preparado.

Entrar desde un preset en una pared, fuera del área o sobre un obstáculo coloca al visitante en el punto libre más próximo en una rejilla de 10 cm, a la altura configurada. Esto puede ajustar posición al entrar; los presets fijos no cambian. La plataforma elevada se trata como obstáculo: no se suben escaleras. Las cajas son conservadoras y pueden impedir acercarse a ciertos adornos o esquinas. Las transiciones cinematográficas siguen sin colisiones, para conservar sus destinos originales; no son recorridos peatonales.

## UV de proximidad

Auditoría reproducible: `node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/review-navigation.mjs`. Resultados en navigation-audit.json. Persisten 7 triángulos con UV colapsadas en Table_Slab y 3 en Wall_Side_L. Desde posiciones XZ próximas válidas, ojos 1,65 m, FOV 40 y 1920×800, máximos de área proyectada: 8,27 píxeles² (mesa) y 57,49 píxeles² (pared). La prueba no calcula oclusión ni recorte y no constituye prueba de visibilidad ni cota para todas las ópticas/alturas.

Se conservan las UV originales: no se declara corregido el defecto numérico. La pared exige especial atención en aproximaciones; las capturas documentan las vistas revisadas, no una certificación de ausencia de artefactos desde cualquier ángulo. No se modifican Blender, GLB, texturas ni acabado.

## Validación

54/54 pruebas correctas, incluidas colisiones sobre el GLB real contra mesa, silla, columna, pared, plataforma y límites; movimiento largo sin atravesar obstáculos, deslizamiento y entrada válida desde todas las cámaras. Build dist final correcto en 67,393 s, tres avisos de tamaño existentes. Las colisiones no añaden llamadas de dibujo. No se ha realizado un benchmark exhaustivo de CPU.

Revisión visual: recorrido desde CAM02 mirando la mesa y desde Camera_D girando hacia Wall_Side_L, con colisiones y altura fija activas. No se identifica una mancha dominante en estas vistas; no se afirma que los diez triángulos estén todos visibles. Capturas de ambas zonas guardadas; sin errores de consola. La prueba automática, no las pulsaciones breves del navegador, verifica el bloqueo de avance prolongado contra obstáculos.
