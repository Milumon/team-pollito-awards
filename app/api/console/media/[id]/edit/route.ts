import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// PATCH /api/console/media/[id]/edit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Parse body
    const contentType = request.headers.get('content-type') || '';
    let name: unknown;
    let cooldownSeconds: unknown;
    let isPublic: unknown;
    let trimStart: unknown;
    let trimEnd: unknown;
    let imageFile: File | null = null;
    let audioFile: File | null = null;
    let videoFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = formData.get('name');
      cooldownSeconds = formData.get('cooldownSeconds');
      isPublic = formData.get('isPublic');
      trimStart = formData.get('trimStart');
      trimEnd = formData.get('trimEnd');
      const img = formData.get('image');
      const aud = formData.get('audio');
      const vid = formData.get('video');
      imageFile = img instanceof File ? img : null;
      audioFile = aud instanceof File ? aud : null;
      videoFile = vid instanceof File ? vid : null;
    } else {
      const body = await request.json();
      name = body.name;
      cooldownSeconds = body.cooldownSeconds;
      isPublic = body.isPublic;
      trimStart = body.trimStart;
      trimEnd = body.trimEnd;
    }

    // Find submission and verify ownership
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('media_submissions')
      .select('id, submitted_by_user_id, file_path_image, file_path_audio, file_path_video, media_type')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!submission) {
      return NextResponse.json({ error: 'Media no encontrada' }, { status: 404 });
    }
    if (submission.submitted_by_user_id !== user.id) {
      return NextResponse.json({ error: 'No sos el dueño de este media' }, { status: 403 });
    }

    // Build updates
    const updates: Record<string, unknown> = {};

    if (name !== undefined && name !== null) {
      const normalizedName = String(name).trim();
      if (normalizedName) updates.name = normalizedName;
    }
    if (cooldownSeconds !== undefined && cooldownSeconds !== null) {
      updates.suggested_cooldown_seconds = Math.max(0, parseInt(String(cooldownSeconds)) || 0);
    }
    if (isPublic !== undefined && isPublic !== null) {
      updates.is_public = isPublic === true || isPublic === 'true';
    }
    if (trimStart !== undefined && trimStart !== null) {
      updates.trim_start = parseFloat(String(trimStart));
    }
    if (trimEnd !== undefined && trimEnd !== null) {
      updates.trim_end = parseFloat(String(trimEnd));
    }

    // Handle file replacements
    const uploadFile = async (file: File, existingPath: string): Promise<{ url: string; path: string }> => {
      const ext = file.name.split('.').pop() || 'mp3';
      const userId = user.id;
      const prefix = existingPath.split('/').pop()?.split('-').slice(0, -1).join('-') || 'media';
      const storagePath = `media/${userId}/${prefix}-${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('soundboard-files')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('soundboard-files')
        .getPublicUrl(storagePath);

      return { url: publicUrl, path: storagePath };
    };

    if (submission.media_type === 'image_audio') {
      if (imageFile && submission.file_path_image) {
        const result = await uploadFile(imageFile, submission.file_path_image);
        updates.image_url = result.url;
        updates.file_path_image = result.path;
      }
      if (audioFile && submission.file_path_audio) {
        const result = await uploadFile(audioFile, submission.file_path_audio);
        updates.audio_url = result.url;
        updates.file_path_audio = result.path;
      }
    } else if (submission.media_type === 'video') {
      if (videoFile && submission.file_path_video) {
        const result = await uploadFile(videoFile, submission.file_path_video);
        updates.video_url = result.url;
        updates.file_path_video = result.path;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos para actualizar' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('media_submissions')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Console Media Edit Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
