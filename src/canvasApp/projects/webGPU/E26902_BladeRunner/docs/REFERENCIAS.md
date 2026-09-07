# Referencias de la película · objetivo de atmósfera e iluminación

El usuario aportó tres fotogramas en [`movie_screenshots/`](../movie_screenshots) el 07/09/2026 y los señaló como **la atmósfera y la iluminación fina deseadas**. Este documento fija qué exige cada uno y en qué fase del [plan](../PLAN.md) se resuelve. No es una descripción del estado actual; es el destino.

Los renders de Blender (`_Blender/v3_renders/`) siguen siendo la referencia de **geometría, encuadre y composición**. Los fotogramas de la película son la referencia de **luz, color y atmósfera**. Cuando ambos discrepen, manda el fotograma para el acabado y el render para la forma.

## Lectura de los tres fotogramas

**Screenshot_1 · plano general, equivalente a CAM 01.** El interior está prácticamente en negro. Las columnas se leen por su borde iluminado, no por su volumen. El pavimento actúa como espejo oscuro y devuelve reflejos verticales largos de las columnas y del vano. El sol es un núcleo cálido difuso, sin disco duro, con halo que invade las nubes. La sala tiene bruma tenue que separa los planos. Las negras están cerradas y la piedra tiende a oliva, no a naranja.

**Screenshot_2 · mesa a contraluz, equivalente a CAM 02.** El fondo entero se convierte en una masa ámbar de bruma. Las pirámides apenas se distinguen a través de ella. El respaldo de la silla, los bonsáis y las figuras quedan en silueta con un filo cálido. El tablero recoge un brillo especular alargado. El contraste alto vive entre silueta y fondo, no dentro del fondo.

**Screenshot_3 · vista lateral, equivalente a CAM 04.** La bruma volumétrica llena la nave y es el efecto dominante. Las columnas lejanas se aclaran y pierden contraste con la distancia, que es perspectiva aérea real, no niebla plana. El suelo vuelve a ser un espejo negro con reflejos verticales largos. Toda la imagen está desaturada hacia un oro oliva.

## Exigencias comunes

- **Negras cerradas.** La sala es oscura y el rango se concentra en el vano y en los filos. La exposición actual de 1,07 abre demasiado el interior.
- **Suelo espejo, no baldosa clara.** El pavimento es oscuro y muy pulido, con reflejo vertical largo. Hoy sale claro y lavado en el centro.
- **Bruma dentro de la sala.** Es la firma visual de los tres fotogramas y aporta la separación de planos. Hoy no existe.
- **Sol difuso con halo.** No hay disco solar recortado en ningún fotograma. Hoy sí lo hay.
- **Perspectiva aérea.** Lo lejano se aclara y pierde contraste. Hoy el exterior se recorta con bordes duros.
- **Paleta oro oliva desaturada.** Hoy el resultado tiende a sepia anaranjado.
- **Friso superior en penumbra.** En los fotogramas la cornisa apenas se lee. Hoy aparece muy iluminada.

## Reparto por fases

| Exigencia | Fase que la resuelve |
| --- | --- |
| Negras cerradas, exposición y curva de color | 3 · Materiales y respuesta al color |
| Paleta oro oliva | 3, con ajuste final en 6 |
| Friso en penumbra, contraste interior/exterior, sombras | 4 · Iluminación y sombras |
| Suelo espejo con reflejo vertical largo | 5 · Reflejos del pavimento |
| Bruma de sala, perspectiva aérea, halo solar | 6 · Atmósfera y acabado |

Ninguna de esas fases está abierta todavía. La fase 2 en curso trata forma y encuadre, y no debe compensar la falta de atmósfera subiendo o bajando luces. Las capturas base de la fase 2 se guardan con la luz provisional tal como está, para que la mejora de las fases siguientes sea medible.

## Nota de uso

Los fotogramas proceden de la película y se conservan en el repositorio sólo como referencia interna de dirección artística. No se redistribuyen ni forman parte de la entrega compilada; la fase 8 debe excluirlos del empaquetado junto con el resto de material de revisión.
