import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const expectedToken = process.env.MINECRAFT_BRIDGE_TOKEN;
  if (!expectedToken || request.headers.get('x-minecraft-bridge-token') !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('minecraft_password_resets')
    .select('id, encrypted_payload, expires_at')
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Minecraft password resets GET]:', error.message);
    return NextResponse.json({ error: 'No se pudieron consultar los resets.' }, { status: 500 });
  }

  return NextResponse.json({ resets: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
