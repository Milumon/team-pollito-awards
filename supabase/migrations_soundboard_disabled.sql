-- Add soundboard_disabled field to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS soundboard_disabled boolean not null default false;
