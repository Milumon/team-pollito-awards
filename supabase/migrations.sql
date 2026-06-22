-- supabase/migrations.sql
-- Create tables for Pollitos Awards voting

create table if not exists public.categories (
  id integer primary key,
  title text not null,
  emoji text not null,
  description text not null
);

create table if not exists public.nominees (
  id uuid default uuid_generate_v4() primary key,
  category_id integer references public.categories(id) on delete cascade,
  roblox_user_id bigint,
  roblox_user text not null,
  display_name text,
  nickname text,
  is_visible boolean not null default true,
  profile_image_url text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.nominees
  add column if not exists display_name text;

alter table public.nominees
  alter column nickname drop not null;

alter table public.nominees
  add column if not exists roblox_user_id bigint;

alter table public.nominees
  add column if not exists updated_at timestamp with time zone default now();

alter table public.nominees
  add column if not exists is_visible boolean not null default true;

create unique index if not exists nominees_category_roblox_user_id_unique_idx
  on public.nominees (category_id, roblox_user_id);

create unique index if not exists nominees_roblox_user_id_unique_idx
  on public.nominees (roblox_user_id);

insert into public.categories (id, title, emoji, description)
values
  (1, 'Pollito MVP DEL AÑO', '👑', 'El pollito del año. Su carisma, apoyo incondicional y maravillosa energía define al Team Pollito.'),
  (2, 'Pollito TRYHARD DEL AÑO', '🔥', 'No bromea cuando entra a BedWars o Adopt Me... ¡va directo a la victoria!'),
  (3, 'Pollito GRACIOSO DEL AÑO', '😂', 'Siempre logra sacar una sonrisa al chat y tiene los mejores chistes en Roblox.'),
  (4, 'Pollito REVELACIÓN DEL AÑO', '✨', 'Llegó hace poco tiempo a la comunidad de Roblox, ¡pero ya brilla con luz propia!'),
  (5, 'Pollito CREADOR DEL AÑO', '🎬', 'El más talentoso creando clips grandiosos, edits épicos o edits de memes que dan risa.'),
  (6, 'Pollito COMENTARISTA DEL AÑO', '💬', 'Inunda el chat de emojis, saludando a todos y comentando cada segundo de stream.'),
  (7, 'Pollito AESTHETIC DEL AÑO', '💅', 'El pollito con el estilo de avatar más increíble, original y fachero en Roblox.'),
  (8, 'Pollito DRAMÁTICO DEL AÑO', '🎭', '¡El rey o reina del drama! Le encanta reclamar en broma por todo pero se le quiere un montón.'),
  (9, 'Pollito AFK DEL AÑO', '💤', 'El pollito que está conectado en el servidor pero desaparece de la nada. ¡Está pero no está!'),
  (10, 'Pollito MÁS TIERNO DEL AÑO', '🥺', 'El pollito más dulce, adorable y tierno de toda la comunidad. Derrite corazones con su forma de ser.')
on conflict (id) do update set
  title = excluded.title,
  emoji = excluded.emoji,
  description = excluded.description;

create table if not exists public.nominee_categories (
  id uuid default uuid_generate_v4() primary key,
  nominee_id uuid not null references public.nominees(id) on delete cascade,
  category_id integer not null,
  created_at timestamp with time zone default now()
);

create unique index if not exists nominee_categories_unique_idx
  on public.nominee_categories (nominee_id, category_id);

create table if not exists public.votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  nominee_id uuid references public.nominees(id) on delete cascade,
  category_id integer references public.categories(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create unique index if not exists votes_user_category_unique_idx
  on public.votes (user_id, category_id);

-- Row level security
alter table public.votes enable row level security;

-- Allow authenticated users to insert a vote, but only one per category
drop policy if exists "allow_insert_vote" on public.votes;
create policy "allow_insert_vote" on public.votes for insert to authenticated
with check (
  auth.uid() = user_id
);

-- Allow authenticated users to read only their own votes
drop policy if exists "allow_select_own_votes" on public.votes;
create policy "allow_select_own_votes" on public.votes for select to authenticated
using (
  auth.uid() = user_id
);

-- Allow authenticated users to delete only their own votes (used by restart flow)
drop policy if exists "allow_delete_own_votes" on public.votes;
create policy "allow_delete_own_votes" on public.votes for delete to authenticated
using (
  auth.uid() = user_id
);

-- Allow read access to categories and nominees for everyone
alter table public.categories enable row level security;
drop policy if exists "public_read" on public.categories;
create policy "public_read" on public.categories for select using (true);

alter table public.nominees enable row level security;
drop policy if exists "public_read_nominees" on public.nominees;
create policy "public_read_nominees" on public.nominees for select using (true);

-- Table to persist background sync jobs kicked from the admin panel (VM worker writes/updates)
create table if not exists public.sync_jobs (
  id uuid default uuid_generate_v4() primary key,
  external_job_id text not null,
  task text not null,
  status text not null,
  progress integer default 0,
  total integer default 0,
  message text,
  error text,
  result jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists sync_jobs_external_idx on public.sync_jobs (external_job_id);

-- User profiles to store Roblox identity and voting attribution
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  roblox_user_id bigint unique,
  roblox_user text,
  roblox_display_name text,
  roblox_avatar_url text,
  roblox_verified_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Allow users to read/update only their own profile
drop policy if exists "allow_select_own_profile" on public.profiles;
create policy "allow_select_own_profile" on public.profiles for select to authenticated
using (auth.uid() = id);

drop policy if exists "allow_update_own_profile" on public.profiles;
create policy "allow_update_own_profile" on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ============================================================
-- Community Database Tables
-- ============================================================

-- Table to store historical and new interviews
create table if not exists public.interview_history (
  id bigserial primary key,
  roblox_user text not null,
  tiktok_user text not null,
  status text not null check (status in ('pending', 'official', 'rejected')),
  interview_date date,
  interview_time time,
  moderator text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.interview_history enable row level security;

-- Policies
drop policy if exists "public_read_interviews" on public.interview_history;
create policy "public_read_interviews" on public.interview_history for select using (true);

-- Unique index to prevent duplicate entries of roblox_user and tiktok_user
create unique index if not exists interview_history_roblox_tiktok_unique_idx
  on public.interview_history (roblox_user, tiktok_user);

-- Stream settings table (Panic button and cooldowns)
create table if not exists public.stream_settings (
  id integer primary key default 1,
  is_muted boolean not null default false,
  global_cooldown_seconds integer not null default 30,
  personal_cooldown_seconds integer not null default 300,
  updated_at timestamp with time zone default now()
);

-- Seed default setting
insert into public.stream_settings (id, is_muted, global_cooldown_seconds, personal_cooldown_seconds)
values (1, false, 30, 300)
on conflict (id) do nothing;

-- Enable RLS
alter table public.stream_settings enable row level security;

-- Policies
drop policy if exists "public_read_settings" on public.stream_settings;
create policy "public_read_settings" on public.stream_settings for select using (true);

-- Stream events table (FIFO Queue source)
create table if not exists public.stream_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete set null,
  type text not null check (type in ('sound', 'tts', 'animation')),
  content text not null, -- MP3 filename, TTS text, or animation ID
  sender_roblox_user text,
  sender_tiktok_user text,
  played boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.stream_events enable row level security;

-- Policies
drop policy if exists "public_read_stream_events" on public.stream_events;
create policy "public_read_stream_events" on public.stream_events for select using (true);

-- Profiles table extension
alter table public.profiles
  add column if not exists tiktok_user text,
  add column if not exists link_status text default 'none' check (link_status in ('none', 'pending', 'approved', 'rejected')),
  add column if not exists rejection_reason text;

