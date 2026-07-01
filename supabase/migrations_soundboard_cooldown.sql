-- supabase/migrations_soundboard_cooldown.sql
-- Agregar columna cooldown_seconds a public.soundboard_sounds para cooldown personalizado por sonido
alter table public.soundboard_sounds
  add column if not exists cooldown_seconds integer default 0;
