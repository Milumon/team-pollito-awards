import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const expectedToken = process.env.MINECRAFT_BRIDGE_TOKEN;
  if (!expectedToken || request.headers.get('x-minecraft-bridge-token') !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('minecraft_accounts')
    .select('edition, username, player_id, status')
    .in('status', ['pending', 'approved'])
    .order('username');

  if (error) {
    console.error('[Minecraft whitelist GET]:', error.message);
    return NextResponse.json({ error: 'No se pudo consultar la whitelist.' }, { status: 500 });
  }

  const accounts = (data ?? []).map((account) => ({
    ...account,
    player_id: account.player_id ?? `pending:${account.username}`,
  }));

  return NextResponse.json({ accounts }, { headers: { 'Cache-Control': 'no-store' } });
}
