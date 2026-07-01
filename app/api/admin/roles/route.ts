import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  try {
    // 1. Validar que el solicitante sea Administrador
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const authHeader = request.headers.get('Authorization');
    let adminEmail = 'admin-token@system';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) adminEmail = user.email;
    }

    const body = await request.json();
    const { userId, isAdmin } = body;

    if (!userId || typeof isAdmin !== 'boolean') {
      return NextResponse.json({ error: 'Parámetros "userId" e "isAdmin" son requeridos.' }, { status: 400 });
    }

    // 2. Obtener el correo del usuario a modificar para evitar degradar al Owner
    const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado en Supabase Auth.' }, { status: 404 });
    }

    if (targetUser.email === 'kpopxfull@gmail.com' && !isAdmin) {
      return NextResponse.json({ error: 'No es posible revocar los permisos de administración al creador principal.' }, { status: 400 });
    }

    // 3. Crear o actualizar la tabla profiles con el nuevo rol
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: userId, 
        is_admin: isAdmin,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (updateError) {
      throw updateError;
    }

    // 4. Registrar log de auditoría
    await logAdminAction(adminEmail, isAdmin ? 'Otorgó rol Admin' : 'Revocó rol Admin', {
      target_user_id: userId,
      target_user_email: targetUser.email,
    });

    return NextResponse.json({ success: true, message: 'Rol de usuario actualizado correctamente.' });
  } catch (error) {
    console.error('[Admin Roles POST Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
