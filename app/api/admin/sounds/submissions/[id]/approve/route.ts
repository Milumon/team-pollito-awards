import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// POST /api/admin/sounds/submissions/[id]/approve
// Aprueba un envío y lo copia a soundboard_sounds
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

    // 1. Obtener el submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('sound_submissions')
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

    // 2. Leer overrides opcionales del admin (nombre y cooldown)
    const body = await request.json().catch(() => ({}));
    const finalName = (body.name as string | undefined)?.trim() || submission.name;
    const finalCooldown = body.cooldownSeconds !== undefined
      ? Math.max(0, parseInt(String(body.cooldownSeconds)) || 0)
      : submission.suggested_cooldown_seconds;

    // 3. Generar slug único para soundboard_sounds
    const baseSlug = finalName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'audio';

    // Asegurar unicidad del slug
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

    // 4. Insertar en soundboard_sounds
    const { error: insertError } = await supabaseAdmin
      .from('soundboard_sounds')
      .insert({
        id: slug,
        name: finalName,
        file_path: submission.file_path,
        url: submission.url,
        cooldown_seconds: finalCooldown,
        is_public: submission.is_public,
        owner_user_id: submission.is_public ? null : submission.submitted_by_user_id,
      });

    if (insertError) throw insertError;

    // 5. Actualizar estado del submission
    const { error: updateError } = await supabaseAdmin
      .from('sound_submissions')
      .update({
        status: 'approved',
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 6. Audit log
    await logAdminAction(adminEmail, 'Envío de audio aprobado', {
      submission_id: id,
      sound_id: slug,
      name: finalName,
      is_public: submission.is_public,
      submitted_by: submission.submitted_by_user_id,
    });

    return NextResponse.json({ success: true, soundId: slug });
  } catch (error) {
    console.error('[Submission Approve Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
