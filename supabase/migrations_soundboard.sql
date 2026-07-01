-- supabase/migrations_soundboard.sql
-- Crear tabla de sonidos del soundboard dinámico
create table if not exists public.soundboard_sounds (
  id text primary key, -- slug único amigable, ej: 'risa', 'bocina'
  name text not null, -- nombre visible en el botón de la botonera
  file_path text not null, -- ruta dentro del bucket de storage
  url text not null, -- URL pública del audio para reproducir
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Habilitar Row Level Security (RLS)
alter table public.soundboard_sounds enable row level security;

-- Permitir lectura pública a cualquier usuario (autenticado o no)
drop policy if exists "public_read_soundboard_sounds" on public.soundboard_sounds;
create policy "public_read_soundboard_sounds" on public.soundboard_sounds
  for select using (true);

-- Crear el bucket de storage 'soundboard-files' de forma pública si no existe
insert into storage.buckets (id, name, public)
values ('soundboard-files', 'soundboard-files', true)
on conflict (id) do update set public = true;

-- Semillar los 8 sonidos estáticos tradicionales con sus URLs de Mixkit
insert into public.soundboard_sounds (id, name, file_path, url)
values
  ('risa', '😂 Risa', 'sounds/risa.mp3', 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav'),
  ('bocina', '🚨 Bocina', 'sounds/bocina.mp3', 'https://assets.mixkit.co/active_storage/sfx/2744/2744-84.wav'),
  ('grito', '😱 Grito', 'sounds/grito.mp3', 'https://assets.mixkit.co/active_storage/sfx/2658/2658-84.wav'),
  ('aplausos', '👏 Aplausos', 'sounds/aplausos.mp3', 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav'),
  ('suspenso', '🎻 Suspenso', 'sounds/suspenso.mp3', 'https://assets.mixkit.co/active_storage/sfx/1117/1117-84.wav'),
  ('sorpresa', '😮 Sorpresa', 'sounds/sorpresa.mp3', 'https://assets.mixkit.co/active_storage/sfx/2017/2017-84.wav'),
  ('fallo', '❌ Fallo', 'sounds/fallo.mp3', 'https://assets.mixkit.co/active_storage/sfx/911/911-84.wav'),
  ('victoria', '🏆 Victoria', 'sounds/victoria.mp3', 'https://assets.mixkit.co/active_storage/sfx/2020/2020-84.wav')
on conflict (id) do update set
  name = excluded.name,
  file_path = excluded.file_path,
  url = excluded.url;

-- Habilitar la replicación realtime de Supabase para esta tabla
alter publication supabase_realtime add table public.soundboard_sounds;
