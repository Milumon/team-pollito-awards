-- supabase/migrations_nickname_cooldown.sql
-- Add last_nickname_updated_at column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_nickname_updated_at timestamp with time zone;
