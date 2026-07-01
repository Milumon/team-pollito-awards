-- supabase/migrations_already_interviewed.sql
-- Agregar columna to interview_history to track if candidate claims they already passed the interview
alter table public.interview_history
  add column if not exists already_interviewed boolean default false;
