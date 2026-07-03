-- supabase/migrations_video_trim.sql
-- Add trim_start/trim_end support for video/audio trimming

-- 1. soundboard_sounds: add trim columns
ALTER TABLE public.soundboard_sounds
  ADD COLUMN IF NOT EXISTS trim_start real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trim_end real;

-- 2. media_submissions: add trim columns
ALTER TABLE public.media_submissions
  ADD COLUMN IF NOT EXISTS trim_start real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trim_end real;

-- 3. stream_events: add trim columns
ALTER TABLE public.stream_events
  ADD COLUMN IF NOT EXISTS trim_start real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trim_end real;
