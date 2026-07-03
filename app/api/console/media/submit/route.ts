import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// POST /api/console/media/submit
// Submit media (image+audio or video) for admin review
export async function POST(request: NextRequest) {
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

  // 2. Verify approved member
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('link_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.link_status !== 'approved') {
    return NextResponse.json(
      { error: 'Solo los Miembros Oficiales aprobados pueden enviar media.' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const mediaType = formData.get('mediaType') as string;
    const name = formData.get('name') as string;
    const imageFile = formData.get('image') as File | null;
    const audioFile = formData.get('audio') as File | null;
    const videoFile = formData.get('video') as File | null;
    const isPublicRaw = formData.get('isPublic');
    const suggestedCooldownRaw = formData.get('suggestedCooldown');

    if (!mediaType || !name?.trim()) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios (mediaType, name)' }, { status: 400 });
    }

    if (mediaType !== 'image_audio' && mediaType !== 'video') {
      return NextResponse.json({ error: 'mediaType debe ser image_audio o video' }, { status: 400 });
    }

    if (mediaType === 'image_audio' && (!imageFile || !audioFile)) {
      return NextResponse.json({ error: 'image_audio requiere imagen y audio' }, { status: 400 });
    }

    if (mediaType === 'video' && !videoFile) {
      return NextResponse.json({ error: 'video requiere un archivo de video' }, { status: 400 });
    }

    const isPublic = isPublicRaw === 'false' ? false : true;
    const suggestedCooldown = Math.max(0, parseInt(String(suggestedCooldownRaw || '0')) || 0);

    // 3. Validate file sizes (10MB max for media)
    const maxSize = 10 * 1024 * 1024;
    if (imageFile && imageFile.size > maxSize) {
      return NextResponse.json({ error: 'La imagen excede 10MB.' }, { status: 400 });
    }
    if (audioFile && audioFile.size > maxSize) {
      return NextResponse.json({ error: 'El audio excede 10MB.' }, { status: 400 });
    }
    if (videoFile && videoFile.size > maxSize) {
      return NextResponse.json({ error: 'El video excede 10MB.' }, { status: 400 });
    }

    // 4. Check pending submissions limit (max 5 per user)
    const { count } = await supabaseAdmin
      .from('media_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by_user_id', user.id)
      .eq('status', 'pending');

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Tenés hasta 5 envíos pendientes simultáneos.' },
        { status: 429 }
      );
    }

    // 5. Upload files to storage
    const slug = name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'media';

    const uploadFile = async (file: File, prefix: string): Promise<{ url: string; path: string }> => {
      const ext = file.name.split('.').pop() || 'mp3';
      const storagePath = `media/${user.id}/${prefix}-${Date.now()}.${ext}`;
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

    let imageUrl: string | null = null;
    let audioUrl: string | null = null;
    let videoUrl: string | null = null;
    let filePathImage: string | null = null;
    let filePathAudio: string | null = null;
    let filePathVideo: string | null = null;

    if (mediaType === 'image_audio' && imageFile && audioFile) {
      const [imgResult, audResult] = await Promise.all([
        uploadFile(imageFile, `${slug}-img`),
        uploadFile(audioFile, `${slug}-aud`),
      ]);
      imageUrl = imgResult.url;
      audioUrl = audResult.url;
      filePathImage = imgResult.path;
      filePathAudio = audResult.path;
    } else if (mediaType === 'video' && videoFile) {
      const vidResult = await uploadFile(videoFile, `${slug}-vid`);
      videoUrl = vidResult.url;
      filePathVideo = vidResult.path;
    }

    // 6. Insert into media_submissions
    const { data: submission, error: dbError } = await supabaseAdmin
      .from('media_submissions')
      .insert({
        submitted_by_user_id: user.id,
        media_type: mediaType,
        name: name.trim(),
        image_url: imageUrl,
        audio_url: audioUrl,
        video_url: videoUrl,
        file_path_image: filePathImage,
        file_path_audio: filePathAudio,
        file_path_video: filePathVideo,
        suggested_cooldown_seconds: suggestedCooldown,
        is_public: isPublic,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded files on DB error
      const pathsToDelete = [filePathImage, filePathAudio, filePathVideo].filter(Boolean) as string[];
      if (pathsToDelete.length > 0) {
        await supabaseAdmin.storage.from('soundboard-files').remove(pathsToDelete);
      }
      throw dbError;
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('[Console Media Submit Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
