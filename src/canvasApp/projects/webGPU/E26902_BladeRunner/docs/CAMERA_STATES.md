# Estados de cámara desde Blender

Fuente: `_Blender/20260914_BladeRunner_AUXILIAR.blend` (fuera del repositorio).
El visor inicia en `initial`. `0` activa `initial` y `1` activa `p1`; el GUI muestra todos los estados exportados y sus teclas.

## Añadir o modificar un estado

1. En el Blender auxiliar, crea una cámara perspectiva `cameraspot-miEstado` y un empty `cameratarget-miEstado`.
2. Añade a la cámara un **Track To** hacia ese empty: **Track -Z**, **Up Y**, influencia **1**, **Target Z desactivado**.
3. Ajusta la posición de ambos objetos y la lente/FOV de la cámara. Guarda el `.blend`.
4. Desde la raíz del repositorio, ejecuta `npm run export:camera-states`.
5. El nuevo estado aparece automáticamente en el selector del GUI, con `viewOffset` cero y el paneo `default`. Si quieres un atajo numérico, añade `"miEstado": "2"` a `camera.stateKeys` en `static/config/E26902_BladeRunner/gui.initial.json`.
6. En desarrollo, webpack recarga el visor al cambiar el archivo generado. Para distribución, ejecuta `npm run build`.

No se modifica ni guarda el Blender al exportar; tampoco se toca el GLB de geometría. Se genera `cameraStates.generated.json` con posiciones globales en metros, coordenadas Y arriba y FOV vertical en grados. El comando sincroniza además `vkPlacement.generated.json`, que usa el mismo Blender auxiliar. Se respetan jerarquías, transformaciones evaluadas y el sensor fit/aspect de render de Blender. La escala visual de la cámara no escala la vista. El FOV vertical puede diferir del FOV horizontal que muestre Blender.

El exportador busca Blender instalado en Windows, empezando por la versión más reciente. También admite `$env:BLENDER_BIN = 'C:\ruta\blender.exe'` o `blender` en PATH. Para otras rutas: `npm run export:camera-states -- --source RUTA --output RUTA`.

El ID de la cámara conserva mayúsculas/minúsculas y debe coincidir exactamente en la configuración. Se toleran diferencias de mayúsculas en el nombre del target, con aviso, siempre que el Track To apunte a ese empty. Los nombres originales quedan intactos. Una exportación inválida falla antes de sustituir el archivo generado.

## Configuración manual

`cameraStates.config.js` solo se usa para offsets y excepciones de transición; no hace falta editarlo al crear estados:

```js
export const CAMERA_STATES = {
    initial: 'initial',
    transition: { duration: 4.5, easing: 'smoothstep' },
    states: { p1: { viewOffset: { x: 0.1, y: -0.05 } } },
    transitions: {
        'initial->p1': { duration: 3, easing: 'easeInOutCubic' }
    }
}
```

El ejemplo de offset es ilustrativo: ambos estados incluidos usan cero. `viewOffset.x` se expresa como fracción del ancho; `y`, como fracción del alto. Un `x` positivo desplaza la ventana de proyección hacia la derecha (el contenido aparece más a la izquierda). Un `y` positivo desplaza la ventana hacia abajo (el contenido aparece más arriba). `0.1` equivale al 10 %. El offset no rota la cámara ni cambia el target y se conserva al redimensionar o capturar.

Si falta `viewOffset` o uno de sus ejes, vale cero. Un estado sin tecla sigue disponible en el GUI. Las teclas numéricas se asignan en `camera.stateKeys` del JSON, con el ID como clave: `"initial": "0", "p1": "1"`. Se ignoran mientras se escribe en campos, hay un diálogo abierto o se pulsan modificadores. `C` continúa reservada para la cámara de desarrollo y `V` abre o cierra el Voight-Kampff. El recorrido libre anterior ya no se ofrece en el GUI de navegación.

Las duraciones son segundos. Curvas disponibles: `linear`, `smoothstep`, `easeInOutCubic`. El GUI modifica los valores generales durante esa sesión; las excepciones `origen->destino` tienen prioridad. La ruta se identifica por el último estado seleccionado, incluso si su transición todavía no ha terminado. Duración cero aplica el estado inmediatamente; también se respeta la preferencia del sistema de movimiento reducido.

## Comportamiento e integración

La cámara base interpola posición, target, FOV, planos de recorte, ambos ejes del offset y los rangos/suavidad del paneo. Cada estado incorpora `mousePan`: se resuelve desde `camera.mousePan.default` y la excepción opcional `camera.mousePan.states[id]` de `static/config/E26902_BladeRunner/gui.initial.json`. El default actual tiene 2 m horizontales, 0,5 m verticales y 1,4 s de suavidad; `p1` sobrescribe los rangos horizontal y vertical con 0,5 m y 0,2 m. [Configuración del paneo](GUI_CONFIGURACION.md).

La cámara de render recibe el paneo en los ejes locales de esa base y sigue mirando al target interpolado. Se usa una base separada en vez de introducir un padre en el grafo: los reflejos, las capturas y las herramientas de desarrollo existentes consumen posiciones globales de la cámara.

Una nueva selección parte de los valores interpolados actuales, conservando el desplazamiento y la suavidad del ratón. Se garantiza continuidad de posición y encuadre, no de velocidad al cambiar de easing. Al pasar exactamente por un punto en que cámara y target coinciden, se conserva la última orientación válida de la base.

Las futuras formas de navegación pueden llamar a `project.selectCameraState('p1')`, o `project.selectCameraState('p1', { duration: 2, easing: 'linear' })`. La selección por ID devuelve `false` si no existe. GUI y teclas usan el mismo sistema.

Las cámaras antiguas permanecen dentro del GLB como referencias para efectos y herramientas de auditoría, pero no aparecen como destinos de navegación. Las capturas usan la vista base actual sin paneo, incluyendo FOV y offset. El diagnóstico incluye `cameraStateId`, el catálogo, target, offset y transición activa.

## Comprobaciones

`npm run test:tyrell` comprueba interpolación, interrupciones con paneo, curvas, validación del catálogo, configuración, proyección en distintos aspectos y compatibilidad con el visor existente.

Validación del 22/09/2026: **100/100 pruebas Node correctas**. El test `tests/export-camera-states.test.py`, ejecutado dentro de Blender 5.1 con `--background --disable-autoexec --python-exit-code 1 --python`, verifica coordenadas globales con jerarquía, unidades, escala visual, FOV y rechazo de configuraciones inválidas. Exportación real completada sin guardar el `.blend`. Compilación de producción correcta con los tres avisos de tamaño de recursos/bundle. Visor WebGPU revisado: selector GUI y teclas `0`/`1` operativos, nueva selección durante la transición y sin errores en la consola del navegador.
