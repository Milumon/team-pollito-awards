import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// POST: Trigger a simulated test event on the live overlay (for admin UI preview testing)
export async function POST(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    let adminEmail = 'admin-token@system';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) adminEmail = user.email;
    }

    const body = await request.json();
    const { type, content, senderRobloxUser, senderTiktokUser, image_url, audio_url, video_url } = body;

    if (!type || !content || !content.trim()) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios (type, content)' }, { status: 400 });
    }

    if (!['sound', 'tts', 'animation', 'image_audio', 'video'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de evento de prueba inválido' }, { status: 400 });
    }

    // Insert the test event directly in stream_events
    const insertPayload: Record<string, unknown> = {
      type,
      content: content.trim(),
      sender_roblox_user: senderRobloxUser || 'PruebaAdmin',
      sender_tiktok_user: senderTiktokUser || 'prueba_admin',
      played: false
    };

    if (type === 'image_audio') {
      if (image_url) insertPayload.image_url = image_url;
      if (audio_url) insertPayload.audio_url = audio_url;
    }
    if (type === 'video') {
      if (video_url) insertPayload.video_url = video_url;
    }

    const { data: newEvent, error } = await supabaseAdmin
      .from('stream_events')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(adminEmail, 'Disparó evento de prueba en directo', { type, content });

    return NextResponse.json({ 
      success: true, 
      message: 'Evento de prueba enviado al directo con éxito.',
      event: newEvent
    });
  } catch (error) {
    console.error('[Test Event Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
