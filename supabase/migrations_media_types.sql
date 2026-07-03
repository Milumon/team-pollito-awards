-- supabase/migrations_media_types.sql
-- Add 'audio' and 'image' types to media CHECK constraints

-- 1. media_submissions: add 'audio' and 'image' to media_type CHECK
ALTER TABLE public.media_submissions
  DROP CONSTRAINT IF EXISTS media_submissions_media_type_check;

ALTER TABLE public.media_submissions
  ADD CONSTRAINT media_submissions_media_type_check
  CHECK (media_type IN ('audio', 'image_audio', 'video', 'image'));

-- 2. soundboard_sounds: add 'audio' and 'image' to media_type CHECK
ALTER TABLE public.soundboard_sounds
  DROP CONSTRAINT IF EXISTS soundboard_sounds_media_type_check;

ALTER TABLE public.soundboard_sounds
  ADD CONSTRAINT soundboard_sounds_media_type_check
  CHECK (media_type IN ('audio', 'image_audio', 'video', 'image'));

-- 3. stream_events: add 'audio' and 'image' to type CHECK
ALTER TABLE public.stream_events
  DROP CONSTRAINT IF EXISTS stream_events_type_check;

ALTER TABLE public.stream_events
  ADD CONSTRAINT stream_events_type_check
  CHECK (type IN ('sound', 'tts', 'animation', 'voice', 'image_audio', 'video', 'audio', 'image'));
