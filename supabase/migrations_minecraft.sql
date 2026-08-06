-- Minecraft integration: public status and private account linking.

create table if not exists public.minecraft_server_status (
  server_id text primary key,
  status text not null default 'online' check (status in ('online', 'offline')),
  server_version text not null,
  player_names jsonb not null default '[]'::jsonb,
  player_count integer not null default 0 check (player_count >= 0),
  max_players integer not null default 10 check (max_players > 0),
  tps numeric(5, 2) check (tps >= 0 and tps <= 20),
  mspt numeric(7, 2) check (mspt >= 0),
  last_heartbeat_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.minecraft_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  edition text not null check (edition in ('java', 'bedrock')),
  username text not null,
  player_id text not null,
  link_code_hash text,
  link_code text,
  link_code_expires_at timestamptz,
  verified_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revoked')),
  rejection_reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition, player_id),
  unique (user_id, edition)
);

create index if not exists minecraft_accounts_user_status_idx
  on public.minecraft_accounts(user_id, status);

create table if not exists public.minecraft_password_resets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.minecraft_accounts(id) on delete cascade,
  username text not null,
  encrypted_payload text not null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'failed', 'superseded', 'expired')),
  error_message text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists minecraft_password_resets_pending_idx
  on public.minecraft_password_resets(status, expires_at);

alter table public.minecraft_accounts add column if not exists link_code text;

create table if not exists public.minecraft_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.minecraft_server_status enable row level security;
alter table public.minecraft_accounts enable row level security;
alter table public.minecraft_password_resets enable row level security;
alter table public.minecraft_audit_log enable row level security;

drop policy if exists "Anyone can read Minecraft status" on public.minecraft_server_status;
create policy "Anyone can read Minecraft status"
  on public.minecraft_server_status for select
  using (true);

drop policy if exists "Users can read their Minecraft accounts" on public.minecraft_accounts;
create policy "Users can read their Minecraft accounts"
  on public.minecraft_accounts for select
  to authenticated
  using (auth.uid() = user_id);
