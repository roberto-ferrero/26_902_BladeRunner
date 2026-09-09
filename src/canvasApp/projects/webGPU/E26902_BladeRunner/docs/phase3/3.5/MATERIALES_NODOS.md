# 3.5 · Elección de materiales estándar y nodos

Completado el 09/09/2026. Se conservan los **19 MeshStandardMaterial y un MeshPhysicalMaterial** del GLB. La cristalería utiliza Physical por su transmisión; los demás acabados se resuelven con color, normal, rugosidad, metalicidad y emisión existentes. Esta entrega fija la estrategia y aporta una auditoría reproducible; no cambia la imagen ni añade pasadas de render.

## Decisión por superficie y efecto

| Superficie o efecto | Solución | Motivo y siguiente comprobación |
| --- | --- | --- |
| Caliza, aristas y juntas | MeshStandardMaterial importado | Color, desgaste y relieve ya están en los mapas. La revisión pendiente de UV de 3.3 no requiere otro shader. |
| Nogal, raíz de nogal y cuero | MeshStandardMaterial importado | Mantener mapas PBR y ajustes reversibles de Tyrell v1; revisar detalle en CAM 02. |
| Bronce y latón | MeshStandardMaterial importado | Rugosidad y metalicidad permiten calibrar los brillos. Su lectura depende también de iluminación y entorno. |
| Pavimento actual | MeshStandardMaterial importado | Mantener las juntas, desgaste y normal verificados en 3.4. |
| Cristalería | MeshPhysicalMaterial importado | Transmisión, IOR y espesor están disponibles sin un shader propio. No implica que su apariencia final ya esté aprobada. |
| Hormigón exterior, papel y cavidades | MeshStandardMaterial importado | Los parámetros actuales cubren el acabado; ajustar luz y profundidad atmosférica en sus fases. |
| Cielo y disco solar actuales | MeshStandardMaterial importado con emisión | Conservar la base hasta calibrar 4.1. No se justifica sustituirla sólo por usar WebGPU. |
| Reflejo planar del suelo, fase 5 | Probar MeshStandardNodeMaterial con ReflectorNode/TSL | Efecto concreto que necesita una entrada de reflexión propia. Un reflector compartido por el pavimento coplanar; conservar mapas, Fresnel y rugosidad. Evitar una conversión por baldosa y la suma incontrolada del brillo existente. |
| Bruma localizada y haces, fase 6 | Evaluar VolumeNodeMaterial | Control espacial de densidad/dispersión y oclusión. Medir pasos, estabilidad y coste antes de adoptarlo. No convertir materiales de muebles o columnas a volumen. |
| Bloom y acabado final, fase 6 | Nodos de posprocesado | Operan sobre la imagen; no requieren reemplazar los materiales PBR de la escena. |

Las referencias de la película piden piedra con variación mineral, reflejos largos y contraluz ámbar. La elección del tipo de material se hace por el efecto necesario; su fidelidad se comprobará con las cámaras de referencia. No se incorporan clearcoat, anisotropía ni parallax sin una necesidad visual comprobada.

## Compatibilidad comprobada

La auditoría [material-strategy.json](material-strategy.json) carga el GLB activo con GLTFLoader y consulta la biblioteca de nodos **instalada, r185 / paquete 0.185.1**. Identifica 20 materiales, ningún NodeMaterial explícito y una implementación WebGPU disponible para todos:

- MeshStandardMaterial → MeshStandardNodeMaterial: 19 materiales.
- MeshPhysicalMaterial → MeshPhysicalNodeMaterial: un material, `Crystal`.
- La adaptación conserva por identidad los mapas y mantiene rugosidad, metalicidad, transmisión, espesor e IOR.

WebGPURenderer adapta internamente estos materiales. Escribir manualmente esa conversión ahora no añade un efecto visual necesario. `TyrellLook` continúa ajustando los objetos importados y mantiene sus texturas compartidas.

Código local consultado, relativo a la raíz del repositorio:

- `node_modules/three/src/renderers/webgpu/nodes/StandardNodeLibrary.js`: correspondencias entre materiales estándar y nodos.
- `node_modules/three/src/renderers/common/nodes/NodeLibrary.js`: adaptación y transferencia de propiedades.
- `node_modules/three/src/nodes/utils/ReflectorNode.js`: reflector, `resolutionScale`, `generateMipmaps`, `bounces` y liberación. En fase 5 se deberá probar `bounces: false` para evitar reflejos recursivos; los mipmaps por sí solos no garantizan un reflejo rugoso físicamente correcto.
- `node_modules/three/src/materials/nodes/VolumeNodeMaterial.js`: `steps`, `offsetNode` y `scatteringNode`. Su existencia no constituye validación de calidad o coste del volumen.

Estos detalles pertenecen a la versión inspeccionada. La auditoría importa una clase interna sólo en un script de desarrollo; el visor no adquiere esa dependencia. No se actualiza Three.js ni se modifica el lockfile.

## Reproducción y límites

Desde la raíz del repositorio:

```powershell
node src/canvasApp/projects/webGPU/E26902_BladeRunner/scripts/audit-material-strategy.mjs
```

Resultado: **20/20 materiales con adaptación disponible y propiedades conservadas**, ejecución correcta. SHA-256 del GLB: `bf2108bbe13d32df23bfa34e598c1d98085e2322e859fbf62354240f7e6b8fa2`.

La auditoría sustituye la decodificación de PNG por sus dimensiones para ejecutarse en Node; no valida píxeles, compilación GPU ni rendimiento. Las evidencias WebGPU del estado visual conservado están en [3.4](../3.4/SUELO.md). No se repite compilación ni se generan capturas idénticas porque esta entrega sólo añade el script, el informe y documentación.

Siguiente punto: **3.6**, verificar la conservación de recursos compartidos entre sillas y los cambios de acabado. La revisión artística global de **3.3 sigue abierta**. Los nodos específicos se implementarán y medirán al abordar sus efectos en fases 5 y 6.
