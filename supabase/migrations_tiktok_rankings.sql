-- Immutable TikTok Ranking snapshots. Apply after the profiles.tiktok_user migration.
create extension if not exists pgcrypto;

create table if not exists public.tiktok_ranking_batches (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  content_hash text not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tiktok_ranking_sets (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.tiktok_ranking_batches(id),
  metric text not null check (metric in ('viewers', 'gifts')),
  period text not null check (period in ('last_live', '7_days', '28_days', '60_days')),
  window_begin timestamptz,
  window_end timestamptz,
  unique (batch_id, metric, period),
  constraint tiktok_ranking_sets_window_check check (
    (window_begin is null and window_end is null)
    or (window_begin is not null and window_end is not null and window_begin < window_end)
  )
);

alter table public.tiktok_ranking_sets alter column window_begin drop not null;
alter table public.tiktok_ranking_sets alter column window_end drop not null;
alter table public.tiktok_ranking_sets drop constraint if exists tiktok_ranking_sets_check;
alter table public.tiktok_ranking_sets drop constraint if exists tiktok_ranking_sets_window_check;
alter table public.tiktok_ranking_sets add constraint tiktok_ranking_sets_window_check check (
  (window_begin is null and window_end is null)
  or (window_begin is not null and window_end is not null and window_begin < window_end)
);

create table if not exists public.tiktok_ranking_entries (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.tiktok_ranking_sets(id),
  position integer not null check (position > 0),
  tiktok_id text not null,
  display_id text not null,
  nickname text not null,
  avatar_uri text,
  value text not null,
  linked_profile_id uuid references public.profiles(id),
  unique (set_id, position),
  unique (set_id, tiktok_id),
  check (tiktok_id ~ '^[0-9]+$'),
  check (value ~ '^[0-9]+$')
);

create table if not exists public.tiktok_ranking_activations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.tiktok_ranking_batches(id),
  activated_at timestamptz not null default now(),
  activated_by text,
  reason text
);

create table if not exists public.tiktok_import_attempts (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('validation_failed', 'publish_failed', 'published', 'replayed')),
  idempotency_key text,
  captured_at timestamptz,
  sets_received integer not null default 0 check (sets_received between 0 and 8),
  sets_validated integer not null default 0 check (sets_validated between 0 and 8),
  batch_id uuid references public.tiktok_ranking_batches(id),
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.tiktok_identity_links (
  tiktok_id text primary key check (tiktok_id ~ '^[0-9]+$'),
  profile_id uuid references public.profiles(id),
  link_status text not null check (link_status in ('linked', 'unlinked')),
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.tiktok_ranking_activations add column if not exists activated_by text;
alter table public.tiktok_ranking_activations drop constraint if exists tiktok_ranking_activations_activated_by_fkey;
alter table public.tiktok_ranking_activations alter column activated_by type text using activated_by::text;
alter table public.tiktok_ranking_activations add column if not exists reason text;

create index if not exists tiktok_ranking_activation_latest_idx on public.tiktok_ranking_activations (activated_at desc);
create index if not exists tiktok_ranking_sets_batch_idx on public.tiktok_ranking_sets (batch_id);
create index if not exists tiktok_ranking_entries_set_idx on public.tiktok_ranking_entries (set_id, position);
create index if not exists tiktok_import_attempts_latest_idx on public.tiktok_import_attempts (created_at desc);
create index if not exists tiktok_identity_links_profile_idx on public.tiktok_identity_links (profile_id);

alter table public.tiktok_ranking_batches enable row level security;
alter table public.tiktok_ranking_sets enable row level security;
alter table public.tiktok_ranking_entries enable row level security;
alter table public.tiktok_ranking_activations enable row level security;
alter table public.tiktok_import_attempts enable row level security;
alter table public.tiktok_identity_links enable row level security;

create or replace function public.reject_tiktok_ranking_mutation() returns trigger
language plpgsql as $$ begin raise exception 'tiktok ranking snapshots are immutable'; end; $$;

drop trigger if exists tiktok_batches_immutable on public.tiktok_ranking_batches;
create trigger tiktok_batches_immutable before update or delete on public.tiktok_ranking_batches for each row execute function public.reject_tiktok_ranking_mutation();
drop trigger if exists tiktok_sets_immutable on public.tiktok_ranking_sets;
create trigger tiktok_sets_immutable before update or delete on public.tiktok_ranking_sets for each row execute function public.reject_tiktok_ranking_mutation();
drop trigger if exists tiktok_entries_immutable on public.tiktok_ranking_entries;
create trigger tiktok_entries_immutable before update or delete on public.tiktok_ranking_entries for each row execute function public.reject_tiktok_ranking_mutation();
drop trigger if exists tiktok_activations_immutable on public.tiktok_ranking_activations;
create trigger tiktok_activations_immutable before update or delete on public.tiktok_ranking_activations for each row execute function public.reject_tiktok_ranking_mutation();

create or replace function public.publish_tiktok_ranking_batch(p_batch jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  batch_id uuid;
  set_id uuid;
  item jsonb;
  entry jsonb;
  existing_hash text;
  set_count integer;
  linked_profile_id uuid;
begin
  if jsonb_typeof(p_batch->'sets') <> 'array' or jsonb_array_length(p_batch->'sets') <> 8 then raise exception 'batch must contain exactly 8 sets'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_batch->>'idempotency_key', 0));
  select content_hash, id into existing_hash, batch_id from tiktok_ranking_batches where idempotency_key = p_batch->>'idempotency_key';
  if batch_id is not null then
    if existing_hash <> encode(digest(p_batch::text, 'sha256'), 'hex') then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('status', 'replayed', 'batch_id', batch_id);
  end if;
  insert into tiktok_ranking_batches (idempotency_key, content_hash, captured_at) values (p_batch->>'idempotency_key', encode(digest(p_batch::text, 'sha256'), 'hex'), (p_batch->>'captured_at')::timestamptz) returning id into batch_id;
  for item in select value from jsonb_array_elements(p_batch->'sets') loop
    insert into tiktok_ranking_sets (batch_id, metric, period, window_begin, window_end) values (batch_id, item->>'metric', item->>'period', (item->'window'->>'begin')::timestamptz, (item->'window'->>'end')::timestamptz) returning id into set_id;
    for entry in select value from jsonb_array_elements(item->'entries') loop
      select case when count(*) = 1 then (array_agg(id))[1] else null end into linked_profile_id
      from profiles
      where link_status = 'approved'
        and lower(regexp_replace(trim(tiktok_user), '^@', '')) = lower(regexp_replace(trim(entry->>'display_id'), '^@', ''));
      insert into tiktok_ranking_entries (set_id, position, tiktok_id, display_id, nickname, avatar_uri, value, linked_profile_id)
      values (set_id, (entry->>'position')::integer, entry->>'tiktok_id', entry->>'display_id', entry->>'nickname', nullif(entry->>'avatar_uri', ''), entry->>'value', linked_profile_id);
    end loop;
  end loop;
  select count(*) into set_count from tiktok_ranking_sets ranking_set where ranking_set.batch_id = batch_id;
  if set_count <> 8 or (
    select count(*) from tiktok_ranking_sets ranking_set
    where ranking_set.batch_id = batch_id
      and (ranking_set.metric, ranking_set.period) in (
        ('viewers', 'last_live'), ('viewers', '7_days'), ('viewers', '28_days'), ('viewers', '60_days'),
        ('gifts', 'last_live'), ('gifts', '7_days'), ('gifts', '28_days'), ('gifts', '60_days')
      )
  ) <> 8 then raise exception 'batch must contain exactly 8 unique combinations'; end if;
  insert into tiktok_ranking_activations (batch_id, activated_by, reason)
    values (batch_id, 'tiktok-extension', 'Importación automática');
  return jsonb_build_object('status', 'published', 'batch_id', batch_id, 'sets', 8);
end; $$;

create or replace function public.list_tiktok_identity_review(p_limit integer default 200)
returns jsonb language sql stable security definer set search_path = public as $$
  with identities as (
    select e.tiktok_id, max(e.display_id) as display_id, max(e.nickname) as nickname,
      (array_agg(e.linked_profile_id) filter (where e.linked_profile_id is not null))[1] as legacy_profile_id,
      count(*)::integer as ranking_entry_count
    from tiktok_ranking_entries e group by e.tiktok_id
  ), candidates as (
    select i.tiktok_id, p.id, coalesce(p.roblox_display_name, p.roblox_user, i.display_id) as name,
      p.roblox_user, count(*) over (partition by i.tiktok_id)::integer as candidate_count
    from identities i join profiles p on p.link_status = 'approved'
      and lower(regexp_replace(trim(p.tiktok_user), '^@', '')) = lower(regexp_replace(trim(i.display_id), '^@', ''))
  ), resolved as (
    select i.*, l.profile_id as override_profile_id, l.link_status as override_status,
      coalesce(max(c.candidate_count), 0)::integer as candidate_count
    from identities i left join tiktok_identity_links l on l.tiktok_id = i.tiktok_id
      left join candidates c on c.tiktok_id = i.tiktok_id
    group by i.tiktok_id, i.display_id, i.nickname, i.legacy_profile_id, i.ranking_entry_count, l.profile_id, l.link_status
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'tiktok_id', r.tiktok_id, 'display_id', r.display_id, 'nickname', r.nickname,
    'ranking_entry_count', r.ranking_entry_count,
    'status', case when r.override_status = 'linked' or (r.override_status is null and r.legacy_profile_id is not null) then 'linked'
      when r.candidate_count > 1 then 'ambiguous' else 'unlinked' end,
    'linked_profile_id', case when r.override_status is not null then r.override_profile_id else r.legacy_profile_id end,
    'candidate_count', r.candidate_count,
    'candidates', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'roblox_user', c.roblox_user) order by c.name)
      from candidates c where c.tiktok_id = r.tiktok_id), '[]'::jsonb)
  ) order by r.display_id), '[]'::jsonb)
  from (select * from resolved
    order by case when override_status = 'linked' or (override_status is null and legacy_profile_id is not null) then 1 else 0 end,
      display_id
    limit greatest(1, least(coalesce(p_limit, 200), 500))) r;
$$;

drop function if exists public.set_tiktok_identity_link(text, uuid, text);
create or replace function public.set_tiktok_identity_link(
  p_tiktok_id text, p_profile_id uuid, p_actor text, p_reason text
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_tiktok_id is null or p_tiktok_id !~ '^[0-9]+$' then raise exception 'invalid TikTok identity'; end if;
  if not exists (select 1 from tiktok_ranking_entries where tiktok_id = p_tiktok_id) then
    raise exception 'TikTok identity not found';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 or length(p_reason) > 1000 then
    raise exception 'identity link reason is required';
  end if;
  if p_profile_id is not null and not exists (
    select 1 from profiles where id = p_profile_id and link_status = 'approved'
  ) then raise exception 'profile must be an approved member'; end if;
  insert into tiktok_identity_links (tiktok_id, profile_id, link_status, updated_by)
  values (p_tiktok_id, p_profile_id, case when p_profile_id is null then 'unlinked' else 'linked' end, p_actor)
  on conflict (tiktok_id) do update set profile_id = excluded.profile_id,
    link_status = excluded.link_status, updated_by = excluded.updated_by, updated_at = now();
  insert into admin_audit_logs (admin_email, action, details)
    values (p_actor, 'Corrigió vínculo de identidad TikTok', jsonb_build_object(
      'tiktok_id', p_tiktok_id, 'profile_id', p_profile_id, 'reason', trim(p_reason)
    ));
  return jsonb_build_object('tiktok_id', p_tiktok_id, 'profile_id', p_profile_id,
    'status', case when p_profile_id is null then 'unlinked' else 'linked' end);
end; $$;

drop function if exists public.get_current_tiktok_rankings();
create or replace function public.get_current_tiktok_rankings(
  p_profile_id uuid default null,
  p_limit integer default 100
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  active_batch_id uuid;
  captured_at timestamptz;
  profile_is_approved boolean := false;
  result jsonb;
begin
  p_limit := greatest(1, least(coalesce(p_limit, 100), 500));

  select a.batch_id, b.captured_at
    into active_batch_id, captured_at
    from tiktok_ranking_activations a
    join tiktok_ranking_batches b on b.id = a.batch_id
   order by a.activated_at desc, a.id desc
   limit 1;

  if active_batch_id is null then
    return jsonb_build_object(
      'batch_id', null,
      'captured_at', null,
      'sets', '[]'::jsonb
    );
  end if;

  if p_profile_id is not null then
    select exists (
      select 1 from profiles where id = p_profile_id and link_status = 'approved'
    ) into profile_is_approved;
  end if;

  with ranked_entries as (
    select
      e.set_id,
      e.display_id,
      e.nickname,
      e.value,
       case when l.tiktok_id is not null then l.profile_id else e.linked_profile_id end as linked_profile_id,
      p.roblox_user,
      p.roblox_display_name,
      p.roblox_avatar_url as avatar_uri,
      row_number() over (partition by e.set_id order by e.position)::integer as community_position
     from tiktok_ranking_entries e
     left join tiktok_identity_links l on l.tiktok_id = e.tiktok_id
     join profiles p on p.id = case when l.tiktok_id is not null then l.profile_id else e.linked_profile_id end
       and p.link_status = 'approved'
  ),
  ranking_sets as (
    select jsonb_agg(
      jsonb_build_object(
        'metric', s.metric,
        'period', s.period,
        'window', jsonb_build_object('begin', s.window_begin, 'end', s.window_end),
        'entries', coalesce((
          select jsonb_agg(jsonb_build_object(
            'position', r.community_position,
            'display_id', r.display_id,
            'nickname', r.nickname,
            'value', r.value,
            'profile', jsonb_build_object(
              'roblox_user', coalesce(r.roblox_user, ''),
              'roblox_display_name', coalesce(r.roblox_display_name, r.roblox_user, r.display_id),
              'roblox_avatar_url', r.avatar_uri
            )
          ) order by r.community_position)
          from ranked_entries r
          where r.set_id = s.id and r.community_position <= p_limit
        ), '[]'::jsonb),
        'me', (
          select jsonb_build_object(
            'position', r.community_position,
            'display_id', r.display_id,
            'nickname', r.nickname,
            'value', r.value,
            'profile', jsonb_build_object(
              'roblox_user', coalesce(r.roblox_user, ''),
              'roblox_display_name', coalesce(r.roblox_display_name, r.roblox_user, r.display_id),
              'roblox_avatar_url', r.avatar_uri
            )
          )
           from ranked_entries r
           where profile_is_approved and r.set_id = s.id and r.linked_profile_id = p_profile_id
           order by r.community_position
           limit 1
         )
      ) order by s.metric, s.period
    ) as value
    from tiktok_ranking_sets s
    where s.batch_id = active_batch_id
  )
  select jsonb_build_object(
    'batch_id', active_batch_id,
    'captured_at', captured_at,
    'sets', coalesce((select value from ranking_sets), '[]'::jsonb)
  ) into result;

  return result;
end; $$;

revoke all on function public.publish_tiktok_ranking_batch(jsonb) from public;
grant execute on function public.publish_tiktok_ranking_batch(jsonb) to service_role;
revoke all on function public.get_current_tiktok_rankings(uuid, integer) from public;
grant execute on function public.get_current_tiktok_rankings(uuid, integer) to service_role;

create or replace function public.list_tiktok_ranking_history(
  p_profile_id uuid default null,
  p_metric text default null,
  p_period text default null,
  p_limit integer default 50
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  p_limit := greatest(1, least(coalesce(p_limit, 50), 200));
  if p_metric is not null and p_metric not in ('viewers', 'gifts') then raise exception 'invalid metric'; end if;
  if p_period is not null and p_period not in ('last_live', '7_days', '28_days', '60_days') then raise exception 'invalid period'; end if;

  select coalesce(jsonb_agg(snapshot order by captured_at desc), '[]'::jsonb)
    into result
  from (
    select jsonb_build_object(
      'batch_id', b.id,
      'captured_at', b.captured_at,
      'created_at', b.created_at,
      'activations', coalesce((
        select jsonb_agg(jsonb_build_object(
          'activated_at', a.activated_at,
          'reason', a.reason
        ) order by a.activated_at desc, a.id desc)
        from tiktok_ranking_activations a where a.batch_id = b.id
      ), '[]'::jsonb),
      'sets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'metric', s.metric,
          'period', s.period,
          'window', jsonb_build_object('begin', s.window_begin, 'end', s.window_end),
          'entries', coalesce((
            select jsonb_agg(jsonb_build_object(
              'position', case
                when p_profile_id is null then e.position
                else (
                  select count(*)::integer
                  from tiktok_ranking_entries ranked_entry
                   left join tiktok_identity_links ranked_link on ranked_link.tiktok_id = ranked_entry.tiktok_id
                   join profiles ranked_profile
                     on ranked_profile.id = case when ranked_link.tiktok_id is not null
                       then ranked_link.profile_id else ranked_entry.linked_profile_id end
                   and ranked_profile.link_status = 'approved'
                  where ranked_entry.set_id = e.set_id
                    and ranked_entry.position <= e.position
                )
              end,
              'display_id', e.display_id,
              'nickname', e.nickname,
              'value', e.value
            ) order by e.position)
            from tiktok_ranking_entries e
             where e.set_id = s.id
               and (p_profile_id is null or case when exists (
                 select 1 from tiktok_identity_links link where link.tiktok_id = e.tiktok_id
               ) then (select link.profile_id from tiktok_identity_links link where link.tiktok_id = e.tiktok_id)
               else e.linked_profile_id end = p_profile_id)
          ), '[]'::jsonb)
        ) order by s.metric, s.period)
        from tiktok_ranking_sets s
        where s.batch_id = b.id
          and (p_metric is null or s.metric = p_metric)
          and (p_period is null or s.period = p_period)
      ), '[]'::jsonb)
    ) as snapshot, b.captured_at
    from tiktok_ranking_batches b
    where (select count(*) from tiktok_ranking_sets s where s.batch_id = b.id) = 8
      and (select count(*) from tiktok_ranking_sets s where s.batch_id = b.id
        and (s.metric, s.period) in (
          ('viewers', 'last_live'), ('viewers', '7_days'), ('viewers', '28_days'), ('viewers', '60_days'),
          ('gifts', 'last_live'), ('gifts', '7_days'), ('gifts', '28_days'), ('gifts', '60_days')
        )) = 8
    order by b.captured_at desc
    limit p_limit
  ) history;
  return result;
end; $$;

drop function if exists public.rollback_tiktok_ranking_batch(uuid, uuid, text);
create or replace function public.rollback_tiktok_ranking_batch(
  p_batch_id uuid,
  p_actor text,
  p_reason text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  set_count integer;
  activation_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) < 3 or length(p_reason) > 1000 then
    raise exception 'rollback reason is required';
  end if;
  if not exists (select 1 from tiktok_ranking_batches where id = p_batch_id) then
    raise exception 'batch not found';
  end if;
  select count(*) into set_count from tiktok_ranking_sets where batch_id = p_batch_id;
  if set_count <> 8 or (
    select count(*) from tiktok_ranking_sets s where s.batch_id = p_batch_id
      and (s.metric, s.period) in (
        ('viewers', 'last_live'), ('viewers', '7_days'), ('viewers', '28_days'), ('viewers', '60_days'),
        ('gifts', 'last_live'), ('gifts', '7_days'), ('gifts', '28_days'), ('gifts', '60_days')
      )
  ) <> 8 then raise exception 'batch is incomplete'; end if;
  insert into tiktok_ranking_activations (batch_id, activated_by, reason)
    values (p_batch_id, p_actor, trim(p_reason)) returning id into activation_id;
  insert into admin_audit_logs (admin_email, action, details)
    values (p_actor, 'Reactivó snapshot de rankings TikTok', jsonb_build_object(
      'batch_id', p_batch_id, 'reason', trim(p_reason)
    ));
  return jsonb_build_object('status', 'rolled_back', 'batch_id', p_batch_id, 'activation_id', activation_id);
end; $$;

revoke all on function public.list_tiktok_ranking_history(uuid, text, text, integer) from public;
grant execute on function public.list_tiktok_ranking_history(uuid, text, text, integer) to service_role;
revoke all on function public.rollback_tiktok_ranking_batch(uuid, text, text) from public;
grant execute on function public.rollback_tiktok_ranking_batch(uuid, text, text) to service_role;
revoke all on function public.list_tiktok_identity_review(integer) from public;
grant execute on function public.list_tiktok_identity_review(integer) to service_role;
revoke all on function public.set_tiktok_identity_link(text, uuid, text, text) from public;
grant execute on function public.set_tiktok_identity_link(text, uuid, text, text) to service_role;
