import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// POST: Vaciar la cola de reproducción del directo (marcar todo como jugado)
export async function POST(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    let adminEmail = 'admin-token@system';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) adminEmail = user.email;
    }

    const { error } = await supabaseAdmin
      .from('stream_events')
      .update({ played: true })
      .eq('played', false);

    if (error) throw error;

    await logAdminAction(adminEmail, 'Vació cola de directo', {});

    return NextResponse.json({ 
      success: true, 
      message: 'Cola de eventos del directo vaciada correctamente.' 
    });
  } catch (error) {
    console.error('[Clear Queue Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
