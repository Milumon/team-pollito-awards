## Parent

#17

## What to build

Dar al Owner visibilidad operativa de importaciones y herramientas para corregir vínculos de Identidad TikTok sin alterar snapshots. El panel debe mostrar el último intento, el batch activo, fallos y usuarios sin vincular.

## Acceptance criteria

- [ ] El Panel de Control muestra último intento, resultado 8/8, batch activo y fecha de actualización.
- [ ] Se pueden revisar identidades no vinculadas o ambiguas sin exponerlas en vistas públicas.
- [ ] El Administrador puede asignar o corregir el perfil vinculado sin editar valores ni posiciones históricas.
- [ ] Las correcciones quedan en el Registro de Auditoría.
- [ ] Las rutas administrativas exigen JWT de Supabase y no aceptan credenciales estáticas históricas.
- [ ] La rotación de la credencial de ingestión deja una indicación operativa clara para reconfigurar la extensión.

## Blocked by

- #18
- #21
