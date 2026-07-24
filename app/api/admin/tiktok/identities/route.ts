import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSupabaseAdminUser } from '@/lib/supabaseAdminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIKTOK_ID = /^\d+$/;

export async function GET(request: NextRequest) {
  if (!await getSupabaseAdminUser(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 200);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return NextResponse.json({ error: 'limit must be an integer between 1 and 500' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('list_tiktok_identity_review', { p_limit: limit });
  if (error) {
    console.error('[TikTok identity review GET error]:', error.message);
    return NextResponse.json({ error: 'Unable to load TikTok identities' }, { status: 500 });
  }
  return NextResponse.json({ identities: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: NextRequest) {
  const actor = await getSupabaseAdminUser(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { tiktok_id?: unknown; profile_id?: unknown; reason?: unknown };
  try {
    body = await request.json() as { tiktok_id?: unknown; profile_id?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.tiktok_id !== 'string' || !TIKTOK_ID.test(body.tiktok_id)) {
    return NextResponse.json({ error: 'tiktok_id must be a decimal string' }, { status: 400 });
  }
  if (body.profile_id !== null && (typeof body.profile_id !== 'string' || !UUID.test(body.profile_id))) {
    return NextResponse.json({ error: 'profile_id must be an approved profile UUID or null' }, { status: 400 });
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.length > 1000) {
    return NextResponse.json({ error: 'reason must contain between 3 and 1000 characters' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('set_tiktok_identity_link', {
    p_tiktok_id: body.tiktok_id,
    p_profile_id: body.profile_id,
    p_actor: actor.email ?? actor.id,
    p_reason: body.reason,
  });
  if (error) {
    if (error.message.includes('approved member')) return NextResponse.json({ error: 'El perfil debe ser un Miembro Oficial aprobado' }, { status: 409 });
    if (error.message.includes('identity not found')) return NextResponse.json({ error: 'Identidad TikTok no encontrada' }, { status: 404 });
    console.error('[TikTok identity link PATCH error]:', error.message);
    return NextResponse.json({ error: 'Unable to update TikTok identity link' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
