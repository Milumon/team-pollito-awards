import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// PATCH /api/console/sounds/[id]/edit
// Owner or admin can edit name, cooldown, visibility, and optionally re-trim audio
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth
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
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 });
    }

    // 2. Parse body — support both multipart/form-data and JSON
    const contentType = request.headers.get('content-type') || '';
    let name: unknown;
    let cooldownSeconds: unknown;
    let isPublic: unknown;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = formData.get('name');
      cooldownSeconds = formData.get('cooldownSeconds');
      isPublic = formData.get('isPublic');
      const uploadedFile = formData.get('file');
      file = uploadedFile instanceof File ? uploadedFile : null;
    } else {
      const body = await request.json();
      name = body.name;
      cooldownSeconds = body.cooldownSeconds;
      isPublic = body.isPublic;
    }

    // 3. Find the sound — try sound_submissions first, then soundboard_sounds
    let source: 'submission' | 'soundboard' = 'submission';
    let record: Record<string, unknown> | null = null;

    // Try submissions (pending or rejected)
    const { data: submission } = await supabaseAdmin
      .from('sound_submissions')
      .select('id, file_path, submitted_by_user_id')
      .eq('id', id)
      .in('status', ['pending', 'rejected'])
      .maybeSingle();

    if (submission) {
      if (submission.submitted_by_user_id !== user.id) {
        return NextResponse.json({ error: 'No sos el dueño de este sonido' }, { status: 403 });
      }
      record = submission;
      source = 'submission';
    } else {
      // Try soundboard (approved)
      const { data: sound } = await supabaseAdmin
        .from('soundboard_sounds')
        .select('id, file_path, owner_user_id')
        .eq('id', id)
        .maybeSingle();

      if (sound) {
        // Allow owner or admin
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (sound.owner_user_id !== user.id && !profile?.is_admin) {
          return NextResponse.json({ error: 'No sos el dueño de este sonido' }, { status: 403 });
        }
        record = sound;
        source = 'soundboard';
      }
    }

    if (!record) {
      return NextResponse.json({ error: 'Sonido no encontrado' }, { status: 404 });
    }

    // 4. Build updates
    const updates: Record<string, unknown> = {};

    if (name !== undefined && name !== null) {
      const normalizedName = String(name).trim();
      if (normalizedName) {
        if (source === 'submission') {
          updates.name = normalizedName;
        } else {
          updates.name = normalizedName;
        }
      }
    }

    if (cooldownSeconds !== undefined && cooldownSeconds !== null) {
      const cd = Math.max(0, parseInt(String(cooldownSeconds)) || 0);
      if (source === 'submission') {
        updates.suggested_cooldown_seconds = cd;
      } else {
        updates.cooldown_seconds = cd;
      }
    }

    if (isPublic !== undefined && isPublic !== null) {
      updates.is_public = isPublic === true || isPublic === 'true';
    }

    // 5. Handle file upload (trim/replacement)
    let finalUrl: string | undefined;
    if (file && record.file_path) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('soundboard-files')
        .upload(record.file_path as string, buffer, {
          contentType: file.type || 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('soundboard-files')
        .getPublicUrl(record.file_path as string);

      // Append cache-busting query param so browsers fetch the updated file
      updates.url = `${publicUrl}?v=${Date.now()}`;
      finalUrl = updates.url as string;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos para actualizar' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    // 6. Update the correct table
    const table = source === 'submission' ? 'sound_submissions' : 'soundboard_sounds';
    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, source, url: finalUrl });
  } catch (error) {
    console.error('[Console Sound Edit Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
