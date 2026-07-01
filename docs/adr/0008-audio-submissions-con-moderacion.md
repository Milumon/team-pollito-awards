# Envíos de audio por usuarios con moderación y visibilidad configurable

Los Miembros Oficiales pueden proponer audios desde la consola. Decidimos usar una tabla de staging separada (`sound_submissions`) en lugar de extender `soundboard_sounds` con una columna `status`, porque `soundboard_sounds` ya tiene RLS con lectura pública irrestricta — meter registros pendientes ahí los expondría al Overlay y a la consola sin filtro adicional. Al aprobar un envío, el admin copia el registro a `soundboard_sounds` (el único contrato de audio activo), preservando todas las queries existentes sin cambios.

## Considered Options

**Opción descartada — extender `soundboard_sounds`:** Agregar `status`, `submitted_by` e `is_public` a la tabla existente. Descartada porque requería actualizar la política RLS pública y todas las queries de Overlay, consola y admin para filtrar por `status = 'approved'` — superficie de regresión alta por una ganancia mínima.

## Consequences

- `soundboard_sounds` requiere dos columnas nuevas: `is_public` (default `true`) y `owner_user_id` (nullable) para acomodar Sonidos Privados aprobados sin romper el contrato existente.
- El Overlay no cambia: reproduce cualquier sonido por ID, sin validar visibilidad. La privacidad se enforcea exclusivamente en la UI de la consola.
- El usuario sugiere cooldown y nombre; el admin puede modificar ambos antes de aprobar. El historial de envíos (con estado y razón de rechazo) queda visible para el usuario en el tab "Mis Audios" de la consola.
