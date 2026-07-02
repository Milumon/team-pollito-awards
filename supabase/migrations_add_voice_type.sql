-- Add 'voice' to the allowed types in stream_events
ALTER TABLE public.stream_events
  DROP CONSTRAINT IF EXISTS stream_events_type_check;

ALTER TABLE public.stream_events
  ADD CONSTRAINT stream_events_type_check
  CHECK (type IN ('sound', 'tts', 'animation', 'voice'));
