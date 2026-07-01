-- supabase/migrations_realtime_stream.sql
-- Habilitar la replicación realtime de Supabase para la cola de eventos y configuraciones del stream
alter publication supabase_realtime add table public.stream_events;
alter publication supabase_realtime add table public.stream_settings;
