import { NextRequest, NextResponse } from 'next/server';

import { isAuthorized } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSupabaseAdminUser } from '@/lib/supabaseAdminAuth';
import { createTemporaryPassword, encryptPasswordReset } from '@/lib/minecraftPasswordReset';

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
    if (action !== 'reset_password' || !accountId) return NextResponse.json({ error: 'Acción o solicitud inválida.' }, { status: 400 });
  }

  if (action === 'reset_password') {
    const { data: account, error: accountError } = await supabaseAdmin
      .from('minecraft_accounts')
      .select('id, user_id, username, edition, status')
      .eq('id', accountId)
      .maybeSingle();

    if (accountError) {
      console.error('[Admin Minecraft password reset lookup]:', accountError.message);
      return NextResponse.json({ error: 'No se pudo consultar la cuenta.' }, { status: 500 });
    }
    if (!account || account.status === 'revoked') return NextResponse.json({ error: 'La cuenta no puede recibir un reset.' }, { status: 400 });

    const bridgeToken = process.env.MINECRAFT_BRIDGE_TOKEN;
    if (!bridgeToken) return NextResponse.json({ error: 'El bridge de Minecraft no está configurado.' }, { status: 503 });

    const temporaryPassword = createTemporaryPassword();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabaseAdmin.from('minecraft_password_resets').update({ status: 'superseded', consumed_at: new Date().toISOString() }).eq('account_id', account.id).eq('status', 'pending');
    const { error: insertError } = await supabaseAdmin.from('minecraft_password_resets').insert({
      account_id: account.id,
      username: account.username,
      encrypted_payload: encryptPasswordReset(account.username, temporaryPassword, bridgeToken),
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('[Admin Minecraft password reset insert]:', insertError.message);
      return NextResponse.json({ error: 'No se pudo crear el reset.' }, { status: 500 });
    }

    const adminUser = await getSupabaseAdminUser(request);
    await supabaseAdmin.from('minecraft_audit_log').insert({
      actor_user_id: adminUser?.id ?? null,
      target_user_id: account.user_id,
      action: 'minecraft_password_reset_requested',
      metadata: { accountId: account.id, edition: account.edition, username: account.username, expiresAt },
    });

    return NextResponse.json({ temporaryPassword, expiresAt });
  }

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
