import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabaseAdmin';

export async function isAuthorized(request: NextRequest): Promise<boolean> {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || '';

  // 1. Validar por token estático (para compatibilidad con overlay OBS / query)
  const xAdminToken = request.headers.get('x-admin-token') || '';
  const queryToken = new URL(request.url).searchParams.get('token') || '';

  if (adminToken && (xAdminToken === adminToken || queryToken === adminToken)) {
    return true;
  }

  // 2. Validar por Supabase Auth JWT (para el Panel de Administración)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return false;
      }

      // El creador dueño es admin inmutable
      if (user.email === 'kpopxfull@gmail.com') {
        return true;
      }

      // Consultar si el perfil en la base de datos es admin
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      return !!profile?.is_admin;
    } catch (err) {
      console.error('Error al autorizar administrador:', err);
      return false;
    }
  }

  return false;
}
