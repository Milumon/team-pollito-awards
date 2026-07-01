import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/console/sounds/my-private
// Retorna los sonidos privados aprobados del usuario autenticado
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const token = authHeader.substring('Bearer '.length);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data: sounds, error } = await supabaseAdmin
      .from('soundboard_sounds')
      .select('*')
      .eq('is_public', false)
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ sounds: sounds ?? [] });
  } catch (error) {
    console.error('[My Private Sounds GET Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
