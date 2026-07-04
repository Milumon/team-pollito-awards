-- supabase/migrations_overlay_x_position.sql
-- Add horizontal position (X axis) for notification and media popups in overlay

ALTER TABLE public.stream_settings
  ADD COLUMN IF NOT EXISTS overlay_notification_left integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS overlay_media_left integer NOT NULL DEFAULT 50;
