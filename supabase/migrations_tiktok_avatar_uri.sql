-- Add tiktok_avatar_uri to ranking JSON responses
-- The avatar_uri column already exists in tiktok_ranking_entries but was
-- shadowed by roblox_avatar_url in the ranked_entries CTE.

-- 1. Update get_current_tiktok_rankings to include tiktok_avatar_uri
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
      e.avatar_uri as tiktok_avatar_uri,
       case when l.tiktok_id is not null then l.profile_id else e.linked_profile_id end as linked_profile_id,
       p.id as approved_profile_id,
      p.roblox_user,
      p.roblox_display_name,
       p.roblox_avatar_url,
       e.position as community_position
     from tiktok_ranking_entries e
     left join tiktok_identity_links l on l.tiktok_id = e.tiktok_id
     left join profiles p on p.id = case when l.tiktok_id is not null then l.profile_id else e.linked_profile_id end
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
            'tiktok_avatar_uri', r.tiktok_avatar_uri,
            'profile', case when r.approved_profile_id is null then null else jsonb_build_object(
              'roblox_user', coalesce(r.roblox_user, ''),
              'roblox_display_name', coalesce(r.roblox_display_name, r.roblox_user, r.display_id),
              'roblox_avatar_url', r.roblox_avatar_url
            ) end
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
            'tiktok_avatar_uri', r.tiktok_avatar_uri,
            'profile', jsonb_build_object(
              'roblox_user', coalesce(r.roblox_user, ''),
              'roblox_display_name', coalesce(r.roblox_display_name, r.roblox_user, r.display_id),
              'roblox_avatar_url', r.roblox_avatar_url
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

-- 2. Update list_tiktok_ranking_history to include tiktok_avatar_uri
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
              'value', e.value,
              'tiktok_avatar_uri', e.avatar_uri
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

revoke all on function public.get_current_tiktok_rankings(uuid, integer) from public;
grant execute on function public.get_current_tiktok_rankings(uuid, integer) to service_role;
revoke all on function public.list_tiktok_ranking_history(uuid, text, text, integer) from public;
grant execute on function public.list_tiktok_ranking_history(uuid, text, text, integer) to service_role;
