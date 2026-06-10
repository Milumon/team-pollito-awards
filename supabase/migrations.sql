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
  roblox_user text not null,
  nickname text not null,
  profile_image_url text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  nominee_id uuid references public.nominees(id) on delete cascade,
  category_id integer references public.categories(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Row level security
alter table public.votes enable row level security;

-- Allow authenticated users to insert a vote, but only one per category
create policy "allow_insert_vote" on public.votes for insert to authenticated
using (
  auth.uid() = user_id
)
with check (
  not exists (
    select 1 from public.votes v where v.user_id = auth.uid() and v.category_id = new.category_id
  )
);

-- Allow read access to categories and nominees for everyone
alter table public.categories enable row level security;
create policy "public_read" on public.categories for select using (true);

alter table public.nominees enable row level security;
create policy "public_read_nominees" on public.nominees for select using (true);
