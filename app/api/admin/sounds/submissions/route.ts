import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET /api/admin/sounds/submissions
// Lista todos los envíos de audio (cualquier estado), con datos del usuario
export async function GET(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data: submissions, error } = await supabaseAdmin
      .from('sound_submissions')
      .select(`
        *,
        profiles!sound_submissions_submitted_by_user_id_profiles_fkey (
          roblox_user,
          roblox_display_name,
          roblox_avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback sin join si la FK nombrada no existe aún
      console.warn('[Submissions GET] Join failed, falling back to plain select:', error.message);
      const { data: plain, error: plainError } = await supabaseAdmin
        .from('sound_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (plainError) throw plainError;
      return NextResponse.json({ submissions: plain ?? [] });
    }

    return NextResponse.json({ submissions: submissions ?? [] });
  } catch (error) {
    console.error('[Submissions GET Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
