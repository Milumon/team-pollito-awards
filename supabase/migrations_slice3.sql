-- supabase/migrations_slice3.sql
-- Extend public.interview_history and create public.interview_slots

-- 1. Extender interview_history con columnas para returning candidates y linkeo a auth.users
alter table public.interview_history
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists ban_reason text,
  add column if not exists return_reason text;

-- 2. Crear tabla interview_slots
create table if not exists public.interview_slots (
  id bigserial primary key,
  slot_date date not null,
  slot_time time not null,
  is_booked boolean not null default false,
  booked_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Constraint para asegurar que solo se agenden viernes (extract(dow) = 5 es viernes en Postgres)
alter table public.interview_slots
  drop constraint if exists check_only_friday;

alter table public.interview_slots
  add constraint check_only_friday
  check (extract(dow from slot_date) = 5);

-- Indice unico para evitar duplicidad de slots en la misma fecha y hora
create unique index if not exists interview_slots_date_time_unique_idx
  on public.interview_slots (slot_date, slot_time);

-- Habilitar RLS en interview_slots
alter table public.interview_slots enable row level security;

-- Politica: lectura publica para que los candidatos puedan ver los slots disponibles
drop policy if exists "public_read_slots" on public.interview_slots;
create policy "public_read_slots" on public.interview_slots
  for select using (true);
