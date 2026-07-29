-- A Ranking Snapshot is complete at positions 1..500. Combined with the
-- existing unique (set_id, position), this also caps each snapshot at 500 rows.
alter table public.tiktok_ranking_entries
  drop constraint if exists tiktok_ranking_entries_position_check;

alter table public.tiktok_ranking_entries
  add constraint tiktok_ranking_entries_position_check
  check (position between 1 and 500);
