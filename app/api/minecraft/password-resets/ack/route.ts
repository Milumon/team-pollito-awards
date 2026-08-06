import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const expectedToken = process.env.MINECRAFT_BRIDGE_TOKEN;
  if (!expectedToken || request.headers.get('x-minecraft-bridge-token') !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { resetId?: unknown; success?: unknown; error?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const resetId = typeof body.resetId === 'string' ? body.resetId : '';
  const success = body.success === true;
  const errorMessage = typeof body.error === 'string' ? body.error.slice(0, 500) : null;
  if (!resetId) return NextResponse.json({ error: 'Reset inválido.' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('minecraft_password_resets')
    .update({
      status: success ? 'applied' : 'failed',
      error_message: success ? null : errorMessage || 'El servidor no pudo aplicar el cambio.',
      consumed_at: new Date().toISOString(),
    })
    .eq('id', resetId)
    .eq('status', 'pending');

  if (error) {
    console.error('[Minecraft password reset ACK]:', error.message);
    return NextResponse.json({ error: 'No se pudo confirmar el reset.' }, { status: 500 });
  }

  return NextResponse.json({ acknowledged: true });
}
