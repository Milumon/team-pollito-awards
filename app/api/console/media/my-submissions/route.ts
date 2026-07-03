import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/console/media/my-submissions
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const token = authHeader.substring('Bearer '.length);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data: submissions, error } = await supabaseAdmin
      .from('media_submissions')
      .select('id, media_type, name, image_url, audio_url, video_url, suggested_cooldown_seconds, is_public, status, rejection_reason, reviewed_by, reviewed_at, created_at')
      .eq('submitted_by_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ submissions: submissions ?? [] });
  } catch (error) {
    console.error('[Media MySubmissions GET Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
