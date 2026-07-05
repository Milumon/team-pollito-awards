-- supabase/migrations_custom_message.sql
-- Add optional custom message column to stream_events (for image/video/image_audio events)

ALTER TABLE public.stream_events
ADD COLUMN IF NOT EXISTS message text;
