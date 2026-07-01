-- supabase/migrations_security_nominees.sql
-- Restringir el acceso a la tabla nominees por RLS.
-- Solo los administradores autenticados pueden realizar SELECT, INSERT, UPDATE o DELETE directamente desde el cliente.
-- El backend (Next.js) utiliza supabaseAdmin (service_role), por lo que no es afectado por estas reglas.

-- 1. Eliminar la política de lectura pública general
DROP POLICY IF EXISTS "public_read_nominees" ON public.nominees;

-- 2. Crear una política estricta para administradores
CREATE POLICY "admin_manage_nominees" ON public.nominees
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.is_admin = true
        )
    );
