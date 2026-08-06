import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const expectedToken = process.env.MINECRAFT_BRIDGE_TOKEN;
  if (!expectedToken || request.headers.get('x-minecraft-bridge-token') !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const edition = request.nextUrl.searchParams.get('edition');
  const playerId = request.nextUrl.searchParams.get('playerId');
  const username = request.nextUrl.searchParams.get('username');
  if ((edition !== 'java' && edition !== 'bedrock') || !playerId || !username) {
    return NextResponse.json({ error: 'Datos de verificación inválidos.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('minecraft_accounts')
    .select('status, verified_at')
    .eq('edition', edition)
    .or(`player_id.eq.${playerId},username.ilike.${username}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Minecraft link status]:', error.message);
    return NextResponse.json({ error: 'No se pudo consultar la verificación.' }, { status: 500 });
  }

  return NextResponse.json({
    requested: Boolean(data),
    verified: Boolean(data?.verified_at && data.status === 'approved'),
  });
}
