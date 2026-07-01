-- Migración: Agregar configuraciones de posición y diseño del pop-up de eventos en el overlay
ALTER TABLE public.stream_settings 
  ADD COLUMN IF NOT EXISTS overlay_notification_top integer not null default 48,
  ADD COLUMN IF NOT EXISTS overlay_notification_width integer not null default 288,
  ADD COLUMN IF NOT EXISTS overlay_notification_badge_size integer not null default 10,
  ADD COLUMN IF NOT EXISTS overlay_notification_content_size integer not null default 14,
  ADD COLUMN IF NOT EXISTS overlay_notification_sender_size integer not null default 11;
