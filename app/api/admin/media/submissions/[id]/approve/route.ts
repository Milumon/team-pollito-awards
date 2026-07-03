import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// POST /api/admin/media/submissions/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const authHeader = request.headers.get('Authorization');
  let adminEmail = 'admin-token@system';
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user?.email) adminEmail = user.email;
  }

  try {
    const { id } = await params;

    // 1. Get submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('media_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!submission) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
    }
    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: `Este envío ya fue ${submission.status === 'approved' ? 'aprobado' : 'rechazado'}.` },
        { status: 409 }
      );
    }

    // 2. Read optional overrides
    const contentType = request.headers.get('content-type') || '';
    let finalName = submission.name;
    let finalCooldown = submission.suggested_cooldown_seconds;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const name = formData.get('name');
      const cooldownSeconds = formData.get('cooldownSeconds');
      if (name !== null && String(name).trim()) finalName = String(name).trim();
      if (cooldownSeconds !== null && String(cooldownSeconds).trim() !== '') {
        finalCooldown = Math.max(0, parseInt(String(cooldownSeconds)) || 0);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      finalName = (body.name as string | undefined)?.trim() || submission.name;
      finalCooldown = body.cooldownSeconds !== undefined
        ? Math.max(0, parseInt(String(body.cooldownSeconds)) || 0)
        : submission.suggested_cooldown_seconds;
    }

    // 3. Generate slug for soundboard_sounds
    const baseSlug = finalName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'media';

    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('soundboard_sounds')
        .select('id')
        .eq('id', slug)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // 4. Insert into soundboard_sounds
    const { error: insertError } = await supabaseAdmin
      .from('soundboard_sounds')
      .insert({
        id: slug,
        name: finalName,
        file_path: submission.file_path_video || submission.file_path_image || '',
        url: submission.video_url || submission.audio_url || '',
        cooldown_seconds: finalCooldown,
        is_public: submission.is_public,
        owner_user_id: submission.submitted_by_user_id,
        media_type: submission.media_type,
        image_url: submission.image_url,
        audio_url: submission.audio_url,
        video_url: submission.video_url,
        trim_start: submission.trim_start ?? 0,
        trim_end: submission.trim_end ?? null,
      });

    if (insertError) throw insertError;

    // 5. Update submission status
    const { error: updateError } = await supabaseAdmin
      .from('media_submissions')
      .update({
        status: 'approved',
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 6. Audit log
    await logAdminAction(adminEmail, 'Media aprobada', {
      submission_id: id,
      sound_id: slug,
      name: finalName,
      media_type: submission.media_type,
      submitted_by: submission.submitted_by_user_id,
    });

    return NextResponse.json({ success: true, soundId: slug });
  } catch (error) {
    console.error('[Media Submission Approve Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
