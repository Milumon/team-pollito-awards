import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring('Bearer '.length);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('DEBUG AUTH ERROR in my-status:', authError);
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message || 'No user found' }, { status: 401 });
    }

    // 2. Check profiles link_status first
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('link_status, roblox_user, tiktok_user, roblox_avatar_url, rejection_reason, testimonial, testimonial_approved')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.link_status === 'approved') {
      return NextResponse.json({
        status: 'approved',
        roblox_user: profile.roblox_user,
        tiktok_user: profile.tiktok_user,
        avatar_url: profile.roblox_avatar_url,
        testimonial: profile.testimonial,
        testimonial_approved: profile.testimonial_approved,
      });
    }

    // 3. Fetch most recent interview_history record linked to this user_id
    const { data: history, error: historyError } = await supabaseAdmin
      .from('interview_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    if (history) {
      let rejection_reason = null;
      if (history.status === 'rejected') {
        if (profile?.link_status === 'pending') {
          rejection_reason = 'Tu entrevista fue reprogramada. Por favor, seleccioná otra fecha y horario.';
        } else if (profile?.link_status === 'rejected') {
          rejection_reason = profile.rejection_reason;
        }
      }

      return NextResponse.json({
        status: history.status, // 'pending', 'official' (same as approved), 'rejected'
        interview_date: history.interview_date,
        interview_time: history.interview_time,
        roblox_user: history.roblox_user,
        tiktok_user: history.tiktok_user,
        ban_reason: history.ban_reason,
        return_reason: history.return_reason,
        rejection_reason,
      });
    }

    // If profile has status, but no history record matches
    if (profile && profile.link_status !== 'none') {
      return NextResponse.json({
        status: profile.link_status,
        roblox_user: profile.roblox_user,
        tiktok_user: profile.tiktok_user,
        rejection_reason: profile.rejection_reason,
      });
    }

    return NextResponse.json({ status: 'none' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
