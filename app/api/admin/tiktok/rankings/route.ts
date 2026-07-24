import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSupabaseAdminUser } from '@/lib/supabaseAdminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const actor = await getSupabaseAdminUser(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return NextResponse.json({ error: 'limit must be an integer between 1 and 200' }, { status: 400 });
  }

  const [historyResult, attemptsResult, identityResult, activeResult] = await Promise.all([
    supabaseAdmin.rpc('list_tiktok_ranking_history', {
      p_profile_id: null, p_metric: null, p_period: null, p_limit: limit,
    }),
    supabaseAdmin.from('tiktok_import_attempts')
      .select('id,status,idempotency_key,captured_at,sets_received,sets_validated,batch_id,error_message,created_at')
      .order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.rpc('list_tiktok_identity_review', { p_limit: 500 }),
    supabaseAdmin.from('tiktok_ranking_activations')
      .select('batch_id,activated_at').order('activated_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (historyResult.error || attemptsResult.error || identityResult.error || activeResult.error) {
    console.error('[TikTok admin operations GET error]:', historyResult.error ?? attemptsResult.error ?? identityResult.error ?? activeResult.error);
    return NextResponse.json({ error: 'Unable to load TikTok operations' }, { status: 500 });
  }
  const history = historyResult.data ?? [];
  const activeBatchId = activeResult.data?.batch_id ?? null;
  const { data: activeBatch, error: activeBatchError } = activeBatchId
    ? await supabaseAdmin.from('tiktok_ranking_batches').select('id,captured_at').eq('id', activeBatchId).maybeSingle()
    : { data: null, error: null };
  if (activeBatchError) {
    console.error('[TikTok active batch GET error]:', activeBatchError);
    return NextResponse.json({ error: 'Unable to load active TikTok batch' }, { status: 500 });
  }
  return NextResponse.json({
    history,
    active_batch: activeBatch ? {
      batch_id: activeBatch.id,
      captured_at: activeBatch.captured_at,
      activated_at: activeResult.data?.activated_at ?? null,
    } : null,
    latest_import: attemptsResult.data?.[0] ?? null,
    import_attempts: attemptsResult.data ?? [],
    identities: identityResult.data ?? [],
    import_token_configured: Boolean(process.env.TIKTOK_IMPORT_TOKEN),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const actor = await getSupabaseAdminUser(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { batch_id?: unknown; reason?: unknown };
  try {
    body = await request.json() as { batch_id?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.batch_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.batch_id)) {
    return NextResponse.json({ error: 'batch_id is required' }, { status: 400 });
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.length > 1000) {
    return NextResponse.json({ error: 'reason must contain between 3 and 1000 characters' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('rollback_tiktok_ranking_batch', {
    p_batch_id: body.batch_id,
    p_actor: actor.email ?? actor.id,
    p_reason: body.reason,
  });
  if (error) {
    if (error.message.includes('batch is incomplete')) return NextResponse.json({ error: 'Batch incompleto' }, { status: 409 });
    if (error.message.includes('not found')) return NextResponse.json({ error: 'Batch no encontrado' }, { status: 404 });
    console.error('[TikTok rollback error]:', error);
    return NextResponse.json({ error: 'Unable to rollback ranking batch' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
