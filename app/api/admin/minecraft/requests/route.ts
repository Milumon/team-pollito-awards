import { NextRequest, NextResponse } from 'next/server';

import { isAuthorized } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSupabaseAdminUser } from '@/lib/supabaseAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!await isAuthorized(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('minecraft_accounts')
    .select('id, user_id, edition, username, player_id, status, rejection_reason, verified_at, approved_at, revoked_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Minecraft requests GET]:', error.message);
    return NextResponse.json({ error: 'No se pudieron consultar las solicitudes.' }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  if (!await isAuthorized(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { accountId?: unknown; action?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const accountId = typeof body.accountId === 'string' ? body.accountId : '';
  const action = body.action;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'revoke' ? 'revoked' : null;

  if (!accountId || !status || (status === 'rejected' && !reason)) {
    return NextResponse.json({ error: 'Acción o solicitud inválida.' }, { status: 400 });
  }

  const adminUser = await getSupabaseAdminUser(request);
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('minecraft_accounts')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason : null,
      approved_by: status === 'approved' ? adminUser?.id ?? null : null,
      approved_at: status === 'approved' ? now : null,
      revoked_at: status === 'revoked' ? now : null,
      updated_at: now,
    })
    .eq('id', accountId)
    .select('id, user_id, edition, username, player_id, status, rejection_reason, verified_at, approved_at, revoked_at, updated_at')
    .maybeSingle();

  if (error) {
    console.error('[Admin Minecraft requests POST]:', error.message);
    return NextResponse.json({ error: 'No se pudo actualizar la solicitud.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });

  await supabaseAdmin.from('minecraft_audit_log').insert({
    actor_user_id: adminUser?.id ?? null,
    target_user_id: data.user_id,
    action: `minecraft_account_${status}`,
    metadata: { accountId: data.id, edition: data.edition, username: data.username },
  });

  return NextResponse.json({ account: data });
}
