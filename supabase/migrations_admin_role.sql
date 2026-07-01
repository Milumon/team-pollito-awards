-- Add is_admin column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Enable RLS updates
-- Ensure that only users with is_admin = true or email = 'kpopxfull@gmail.com' can write to settings, candidates, verify slots, and nominees
-- Since this is managed in Next.js backend (which uses service role client supabaseAdmin), RLS is bypassed for backend execution.
-- But for Client-side, keep policies standard: users can read and write only their own profiles.

-- If a profile exists for the owner, make them admin immediately
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  -- Subquery to fetch the ID of kpopxfull@gmail.com from auth.users (if it exists)
  -- Since auth schema is in a separate namespace, this requires service role or elevated permissions
  -- In case this is run in the Supabase Dashboard SQL Editor, it will succeed.
  SELECT id FROM auth.users WHERE email = 'kpopxfull@gmail.com'
);
