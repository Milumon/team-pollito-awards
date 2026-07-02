import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.substring('Bearer '.length);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, roblox_user, tiktok_user, link_status, roblox_avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.link_status !== 'approved') {
      return NextResponse.json({ error: 'Membresía no aprobada' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Falta el archivo de audio' }, { status: 400 });
    }

    // Upload using same pattern as sound_submissions
    const fileExt = file.name.split('.').pop() || 'mp3';
    const storagePath = `voice-messages/${user.id}/voice-${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('soundboard-files')
      .upload(storagePath, buffer, {
        contentType: file.type || 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Voice Upload Error]:', uploadError);
      return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('soundboard-files')
      .getPublicUrl(storagePath);

    const { data: event, error: insertError } = await supabaseAdmin
      .from('stream_events')
      .insert({
        user_id: user.id,
        type: 'voice',
        content: publicUrl,
        sender_roblox_user: profile.roblox_user,
        sender_tiktok_user: profile.tiktok_user,
        sender_avatar_url: profile.roblox_avatar_url,
        played: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Voice Insert Error]:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('[Voice POST Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
