import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// POST /api/console/sounds/submit
// Miembro Oficial sube un audio para revisión del admin
export async function POST(request: NextRequest) {
  // 1. Autenticación
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const token = authHeader.substring('Bearer '.length);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 2. Verificar que es Miembro Oficial aprobado
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('link_status, perm_upload_audio')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.link_status !== 'approved') {
    return NextResponse.json(
      { error: 'Solo los Miembros Oficiales aprobados pueden enviar audios.' },
      { status: 403 }
    );
  }

  if (profile.perm_upload_audio === false) {
    return NextResponse.json(
      { error: 'No tenés permiso para subir audio.' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const isPublicRaw = formData.get('isPublic');
    const suggestedCooldownRaw = formData.get('suggestedCooldown');

    if (!file || !name?.trim()) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios (file, name)' },
        { status: 400 }
      );
    }

    const isPublic = isPublicRaw === 'false' ? false : true;
    const suggestedCooldown = Math.max(0, parseInt(String(suggestedCooldownRaw || '0')) || 0);

    // 3. Validar tipo y tamaño
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/x-m4a', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato no soportado (${file.type}). Usar MP3, WAV, M4A, OGG o WebM.` },
        { status: 400 }
      );
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el máximo de 2 MB.' }, { status: 400 });
    }

    // 4. Verificar límite de submissions pendientes (máx 3 por usuario)
    const { count } = await supabaseAdmin
      .from('sound_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by_user_id', user.id)
      .eq('status', 'pending');

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Tenés hasta 3 envíos pendientes simultáneos. Esperá la revisión de los existentes.' },
        { status: 429 }
      );
    }

    // 5. Subir archivo al bucket
    const slug = name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'audio';

    const fileExt = file.name.split('.').pop() || 'mp3';
    const storagePath = `submissions/${user.id}/${slug}-${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('soundboard-files')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error al subir el archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('soundboard-files')
      .getPublicUrl(storagePath);

    // 6. Insertar en sound_submissions
    const { data: submission, error: dbError } = await supabaseAdmin
      .from('sound_submissions')
      .insert({
        submitted_by_user_id: user.id,
        name: name.trim(),
        file_path: storagePath,
        url: publicUrl,
        suggested_cooldown_seconds: suggestedCooldown,
        is_public: isPublic,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      await supabaseAdmin.storage.from('soundboard-files').remove([storagePath]);
      throw dbError;
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('[Console Sound Submit Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
