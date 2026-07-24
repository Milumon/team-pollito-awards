-- Profile mutations run through authenticated server routes. Prevent clients from
-- escalating privileges through the legacy whole-row update policy.
revoke update on table public.profiles from authenticated;
