## Parent

#17

## What to build

Vincular entries del snapshot activo con Miembros Oficiales aprobados y mostrar el ranking completo en la consola y landing. Todas las identidades usan `display_id`; los Miembros Oficiales vinculados se distinguen visualmente.

## Acceptance criteria

- [ ] `display_id` se normaliza de la misma forma que `profiles.tiktok_user` y solo se enlazan perfiles aprobados sin ambigüedad.
- [ ] La API permite consultar las ocho combinaciones del mismo batch activo.
- [ ] La consola ofrece selectores de métrica/período, top comunitario y tarjeta de posición personal.
- [ ] Se distinguen claramente “sin snapshot”, “sin actividad” y “fuera del tramo visible”.
- [ ] La landing muestra Top 10, filtros de métrica/período, actualización y CTA hacia la consola.
- [ ] Las identidades no vinculadas se muestran solo mediante su `display_id`; los perfiles vinculados aparecen destacados.
- [ ] Las pruebas cubren filtrado, reordenamiento comunitario y posición personal.

## Blocked by

- #18
