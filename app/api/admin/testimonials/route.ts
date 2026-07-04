import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  try {
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
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId y action son obligatorios' }, { status: 400 });
    }

    if (action === 'approve') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ testimonial_approved: true })
        .eq('id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAdminAction(adminEmail, 'Aprobó opinión', { target_user_id: userId });
      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ testimonial: null, testimonial_approved: false })
        .eq('id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAdminAction(adminEmail, 'Rechazó/Eliminó opinión', { target_user_id: userId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
