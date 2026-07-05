-- supabase/migrations_media_repeat.sql
-- Add configurable repeat count for image/image_audio "sticker bomb" effect

ALTER TABLE public.stream_settings
ADD COLUMN IF NOT EXISTS overlay_media_repeat_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.stream_events
ADD COLUMN IF NOT EXISTS repeat_enabled boolean NOT NULL DEFAULT false;
