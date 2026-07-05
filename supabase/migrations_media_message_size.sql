-- supabase/migrations_media_message_size.sql
-- Add configurable message text size for media popup custom messages

ALTER TABLE public.stream_settings
ADD COLUMN IF NOT EXISTS overlay_media_message_size integer NOT NULL DEFAULT 12;
