-- 1. Agregar columna para el pulso de presencia (heartbeat) de OBS
ALTER TABLE public.stream_settings ADD COLUMN IF NOT EXISTS overlay_active_at timestamp with time zone;

-- 2. Crear tabla de logs de auditoría para actividades administrativas
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_email text NOT NULL,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS (opcional para seguridad extra si se consume desde el cliente)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Crear políticas para que cualquier usuario autenticado pueda leer logs
-- pero solo el backend (service_role) pueda insertar/modificar
CREATE POLICY "Permitir lectura de logs a usuarios autenticados" 
ON public.admin_audit_logs FOR SELECT 
TO authenticated 
USING (true);

-- 3. Habilitar Supabase Realtime para la tabla de logs de auditoría
-- Esto permite que el componente de actividad reciente reciba inserciones al instante
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_logs;
