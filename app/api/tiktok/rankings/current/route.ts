import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  let profileId: string | null = null;

  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match) return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(match[1]);
    if (authError || !authData.user) return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    profileId = authData.user.id;
  }

  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam === null ? 100 : Number(limitParam);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return NextResponse.json({ error: 'limit must be an integer between 1 and 500' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('get_current_tiktok_rankings', {
    p_profile_id: profileId,
    p_limit: limit,
  });
  if (error) {
    console.error('[TikTok rankings GET Error]:', error);
    return NextResponse.json({ error: 'Unable to load current rankings' }, { status: 500 });
  }
  return NextResponse.json(
    data ?? {
      batch_id: null,
      captured_at: null,
      sets: [],
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
