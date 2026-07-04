-- supabase/migrations_permissions.sql
-- Add granular console permissions to profiles table
-- All default true: new users get full access

-- 1. Upload permissions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perm_upload_images boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS perm_upload_videos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS perm_upload_audio boolean NOT NULL DEFAULT true;

-- 2. TTS permissions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perm_tts_text boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS perm_tts_record boolean NOT NULL DEFAULT true;

-- 3. Profile permission
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perm_edit_nickname boolean NOT NULL DEFAULT true;

-- 4. Soundboard trigger permissions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perm_trigger_sounds boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS perm_trigger_media boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS perm_trigger_animations boolean NOT NULL DEFAULT true;

-- 5. Sound editing permission
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perm_edit_sounds boolean NOT NULL DEFAULT true;

-- 6. Migrate existing blocked users: set all permissions to false
UPDATE public.profiles
SET
  perm_upload_images = false,
  perm_upload_videos = false,
  perm_upload_audio = false,
  perm_tts_text = false,
  perm_tts_record = false,
  perm_edit_nickname = false,
  perm_trigger_sounds = false,
  perm_trigger_media = false,
  perm_trigger_animations = false,
  perm_edit_sounds = false
WHERE soundboard_disabled = true;
