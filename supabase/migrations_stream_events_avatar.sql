-- Add sender_avatar_url column to stream_events table
ALTER TABLE public.stream_events
ADD COLUMN IF NOT EXISTS sender_avatar_url text;
