import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const authHeader = request.headers.get('Authorization');
  let adminEmail = 'admin-token@system';
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user?.email) adminEmail = user.email;
  }

  try {
    const { userId, disabled } = await request.json();

    if (!userId || typeof disabled !== 'boolean') {
      return NextResponse.json({ error: 'Faltan parámetros (userId, disabled)' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ soundboard_disabled: disabled })
      .eq('id', userId);

    if (error) throw error;

    await logAdminAction(adminEmail, disabled ? 'Deshabilitó botonera' : 'Habilitó botonera', {
      target_user_id: userId,
      soundboard_disabled: disabled,
    });

    return NextResponse.json({ success: true, soundboard_disabled: disabled });
  } catch (error) {
    console.error('[Soundboard Toggle Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
