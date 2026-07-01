-- supabase/migrations_audio_submissions.sql
-- Nueva tabla de staging para envíos de audio de usuarios

create table if not exists public.sound_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by_user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  file_path text not null,
  url text not null,
  suggested_cooldown_seconds integer not null default 0,
  is_public boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint sound_submissions_submitted_by_user_id_profiles_fkey
    foreign key (submitted_by_user_id) references public.profiles(id) on delete cascade
);

-- RLS: solo el dueño puede leer sus propias submissions (el service role bypasea RLS)
alter table public.sound_submissions enable row level security;

drop policy if exists "owner_read_sound_submissions" on public.sound_submissions;
create policy "owner_read_sound_submissions" on public.sound_submissions
  for select using (auth.uid() = submitted_by_user_id);

drop policy if exists "owner_insert_sound_submissions" on public.sound_submissions;
create policy "owner_insert_sound_submissions" on public.sound_submissions
  for insert with check (auth.uid() = submitted_by_user_id);

-- Extender soundboard_sounds con visibilidad y dueño (para sonidos privados aprobados)
alter table public.soundboard_sounds
  add column if not exists is_public boolean not null default true,
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

-- Realtime para que la consola del usuario pueda recibir actualizaciones de estado
alter publication supabase_realtime add table public.sound_submissions;
