import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET /api/admin/media/submissions
export async function GET(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    const { data: submissions, error } = await supabaseAdmin
      .from('media_submissions')
      .select('id, submitted_by_user_id, media_type, name, image_url, audio_url, video_url, file_path_image, file_path_audio, file_path_video, suggested_cooldown_seconds, is_public, status, rejection_reason, reviewed_by, reviewed_at, created_at')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with profile data
    const userIds = [...new Set((submissions ?? []).map(s => s.submitted_by_user_id).filter(Boolean))];
    let profilesMap: Record<string, { roblox_user: string | null; roblox_display_name: string | null; roblox_avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, roblox_user, roblox_display_name, roblox_avatar_url')
        .in('id', userIds);

      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    const enriched = (submissions ?? []).map(s => ({
      ...s,
      profiles: profilesMap[s.submitted_by_user_id] ?? null,
    }));

    return NextResponse.json({ submissions: enriched });
  } catch (error) {
    console.error('[Admin Media Submissions GET Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
