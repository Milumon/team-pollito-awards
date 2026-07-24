import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isTikTokImportAuthorized } from '@/lib/tiktokImportAuth';
import { validateTikTokRankingBatch } from '@/lib/tiktokRankings';
import { buildTikTokImportAttempt } from '@/lib/tiktokImportAttempts';
import { readLimitedRequestBody, RequestBodyTooLargeError } from '@/lib/readLimitedRequestBody';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isTikTokImportAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recordAttempt = async (attempt: ReturnType<typeof buildTikTokImportAttempt>) => {
    const { error } = await supabaseAdmin.from('tiktok_import_attempts').insert(attempt);
    if (error) console.error('[TikTok import attempt record error]:', error.message);
  };
  let body: string;
  try {
    body = await readLimitedRequestBody(request, 2_000_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      await recordAttempt(buildTikTokImportAttempt('validation_failed', null, error.message));
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    throw error;
  }

  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    await recordAttempt(buildTikTokImportAttempt('validation_failed', null, message));
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let batch;
  try {
    batch = validateTikTokRankingBatch(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid ranking batch';
    await recordAttempt(buildTikTokImportAttempt('validation_failed', input, message));
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('publish_tiktok_ranking_batch', { p_batch: batch });
    if (error) {
      if (error.message.includes('idempotency_conflict')) {
        await recordAttempt(buildTikTokImportAttempt('publish_failed', batch, 'Idempotency key conflict'));
        return NextResponse.json({ error: 'Idempotency key conflict' }, { status: 409 });
      }
      throw error;
    }
    const status = data?.status === 'replayed' ? 'replayed' : 'published';
    await recordAttempt(buildTikTokImportAttempt(status, batch, null, data?.batch_id ?? null));
    return NextResponse.json(data, { status: status === 'replayed' ? 200 : 201 });
  } catch (error) {
    console.error('[TikTok rankings import error]:', error);
    await recordAttempt(buildTikTokImportAttempt('publish_failed', batch, 'Unable to publish ranking batch'));
    return NextResponse.json({ error: 'Unable to publish ranking batch' }, { status: 500 });
  }
}
