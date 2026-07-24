import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSupabaseUser } from '@/lib/supabaseAdminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getSupabaseUser(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('link_status')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: 'Unable to verify member' }, { status: 500 });
  if (profile?.link_status !== 'approved') return NextResponse.json({ error: 'Solo Miembros Oficiales' }, { status: 403 });

  const metric = request.nextUrl.searchParams.get('metric');
  const period = request.nextUrl.searchParams.get('period');
  if (metric && !['viewers', 'gifts'].includes(metric)) return NextResponse.json({ error: 'Invalid metric' }, { status: 400 });
  if (period && !['last_live', '7_days', '28_days', '60_days'].includes(period)) return NextResponse.json({ error: 'Invalid period' }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc('list_tiktok_ranking_history', {
    p_profile_id: user.id,
    p_metric: metric,
    p_period: period,
    p_limit: 100,
  });
  if (error) {
    console.error('[TikTok member history GET error]:', error);
    return NextResponse.json({ error: 'Unable to load ranking history' }, { status: 500 });
  }
  return NextResponse.json({ history: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
