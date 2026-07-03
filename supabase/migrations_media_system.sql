-- supabase/migrations_media_system.sql
-- Media system: images+audio and videos support

-- 1. Create media_submissions table (staging for user media uploads)
create table if not exists public.media_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by_user_id uuid references public.profiles(id) on delete cascade not null,
  media_type text not null check (media_type in ('image_audio', 'video')),
  name text not null,
  file_path_image text,
  file_path_audio text,
  file_path_video text,
  image_url text,
  audio_url text,
  video_url text,
  suggested_cooldown_seconds integer not null default 0,
  is_public boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- RLS: owner can read/insert their own media submissions
alter table public.media_submissions enable row level security;

drop policy if exists "owner_read_media_submissions" on public.media_submissions;
create policy "owner_read_media_submissions" on public.media_submissions
  for select using (auth.uid() = submitted_by_user_id);

drop policy if exists "owner_insert_media_submissions" on public.media_submissions;
create policy "owner_insert_media_submissions" on public.media_submissions
  for insert with check (auth.uid() = submitted_by_user_id);

drop policy if exists "owner_update_media_submissions" on public.media_submissions;
create policy "owner_update_media_submissions" on public.media_submissions
  for update using (auth.uid() = submitted_by_user_id);

-- 2. Add media columns to soundboard_sounds (for approved media)
alter table public.soundboard_sounds
  add column if not exists media_type text check (media_type in ('image_audio', 'video')),
  add column if not exists image_url text,
  add column if not exists audio_url text,
  add column if not exists video_url text;

-- 3. Add media position settings to stream_settings
alter table public.stream_settings
  add column if not exists overlay_media_top integer not null default 48,
  add column if not exists overlay_media_width integer not null default 400;

-- 4. Update stream_events CHECK constraint to include 'image_audio' and 'video'
ALTER TABLE public.stream_events
  DROP CONSTRAINT IF EXISTS stream_events_type_check;

ALTER TABLE public.stream_events
  ADD CONSTRAINT stream_events_type_check
  CHECK (type IN ('sound', 'tts', 'animation', 'voice', 'image_audio', 'video'));

-- 5. Enable realtime for media_submissions
alter publication supabase_realtime add table public.media_submissions;
