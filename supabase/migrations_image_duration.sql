-- supabase/migrations_image_duration.sql
-- Add configurable display duration and reposition interval for image events

ALTER TABLE public.stream_settings
ADD COLUMN IF NOT EXISTS overlay_image_duration_seconds integer NOT NULL DEFAULT 3;

ALTER TABLE public.stream_settings
ADD COLUMN IF NOT EXISTS overlay_image_reposition_interval_seconds numeric NOT NULL DEFAULT 1.0;
