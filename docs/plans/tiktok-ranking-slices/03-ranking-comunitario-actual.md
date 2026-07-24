## Parent

#17

## What to build

Vincular entries del snapshot activo con Miembros Oficiales aprobados y mostrar el ranking comunitario actual en la consola y una selección compacta en la landing. Los espectadores no vinculados deben permanecer almacenados para historia, pero no exponerse públicamente.

## Acceptance criteria

- [ ] `display_id` se normaliza de la misma forma que `profiles.tiktok_user` y solo se enlazan perfiles aprobados sin ambigüedad.
- [ ] La API permite consultar las ocho combinaciones del mismo batch activo.
- [ ] La consola ofrece selectores de métrica/período, top comunitario y tarjeta de posición personal.
- [ ] Se distinguen claramente “sin snapshot”, “sin actividad” y “fuera del tramo visible”.
- [ ] La landing muestra un top compacto, período, actualización y CTA hacia la consola.
- [ ] Ninguna respuesta pública expone identidades TikTok no vinculadas.
- [ ] Las pruebas cubren filtrado, reordenamiento comunitario y posición personal.

## Blocked by

- #18
