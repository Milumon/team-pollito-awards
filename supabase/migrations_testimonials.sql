-- supabase/migrations_testimonials.sql
-- Add testimonial columns to profiles table

alter table public.profiles
  add column if not exists testimonial text,
  add column if not exists testimonial_approved boolean not null default false;
