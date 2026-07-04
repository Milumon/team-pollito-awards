import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET: Fetch recent 10 events (useful for overlay initial queue and console list)
export async function GET() {
  try {
    const { data: events, error } = await supabaseAdmin
      .from('stream_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('[Events GET Error]:', error);
    return NextResponse.json({ error: 'Error al obtener los eventos' }, { status: 500 });
  }
}

// POST: Trigger a new stream event (sound, tts, animation)
// POST: Trigger a new stream event (sound, tts, animation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, tiktokUser, image_url, audio_url, video_url, trim_start, trim_end } = body;

    if (!type || !content || !content.trim()) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    if (!['sound', 'tts', 'animation', 'image_audio', 'video', 'audio', 'image'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de evento inválido' }, { status: 400 });
    }

    if (type === 'tts') {
      if (content.length > 120) {
        return NextResponse.json({ error: 'El TTS no puede superar los 120 caracteres' }, { status: 400 });
      }

      // Filtro de moderación automática de palabras prohibidas
      const forbiddenWords = [
        'mierda', 'puto', 'puta', 'concha', 'culiando', 'culiado', 'culiada', 'culazo', 'maricon', 'marica',
        'hijueputa', 'hijo de puta', 'idiota', 'imbecil', 'estupido', 'hdp', 'fuck', 'ass', 'bitch', 'porn',
        'sexo', 'pene', 'vagina', 'teta', 'caca', 'pedofilo', 'pinga', 'boludo', 'pelotudo', 'gonorrea',
        'weon', 'culon', 'culona', 'basura'
      ];
      
      const normalizedContent = content
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      const containsForbidden = forbiddenWords.some(word => normalizedContent.includes(word));

      if (containsForbidden) {
        return NextResponse.json({
          error: 'Tu mensaje contiene palabras no permitidas. Por favor mantén el chat amigable para la comunidad 🐣.'
        }, { status: 400 });
      }
    }

    let profile: { id: string; roblox_user: string | null; tiktok_user: string | null; link_status: string | null; roblox_avatar_url: string | null } | null = null;
    let finalUserId: string = '';

    const bridgeToken = request.headers.get('x-bridge-token');
    const systemBridgeKey = process.env.BRIDGE_API_KEY || '';
    const isBridgeRequest = Boolean(systemBridgeKey) && bridgeToken === systemBridgeKey;

    if (isBridgeRequest) {
      if (!tiktokUser || !tiktokUser.trim()) {
        return NextResponse.json({ error: 'Falta tiktokUser en la petición del puente' }, { status: 400 });
      }

      // Look up profile by tiktok_user
      const { data, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, roblox_user, tiktok_user, link_status, roblox_avatar_url')
        .ilike('tiktok_user', tiktokUser.trim())
        .maybeSingle();

      if (profileError || !data || data.link_status !== 'approved') {
        return NextResponse.json({ error: 'Membresía no aprobada o no encontrada' }, { status: 403 });
      }

      profile = data;
      finalUserId = data.id;
    } else {
      // 1. Authenticate user
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      const token = authHeader.substring('Bearer '.length);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      // 2. Fetch user's profile and check approved status
      const { data, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, roblox_user, tiktok_user, link_status, roblox_avatar_url, perm_trigger_sounds, perm_trigger_media, perm_trigger_animations, perm_tts_text')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !data || data.link_status !== 'approved') {
        return NextResponse.json({ error: 'Membresía no aprobada' }, { status: 403 });
      }

      // 3. Check granular permissions
      if ((type === 'sound' || type === 'audio') && data.perm_trigger_sounds === false) {
        return NextResponse.json({ error: 'No tenés permiso para activar sonidos.' }, { status: 403 });
      }
      if ((type === 'image_audio' || type === 'video' || type === 'image') && data.perm_trigger_media === false) {
        return NextResponse.json({ error: 'No tenés permiso para activar media.' }, { status: 403 });
      }
      if (type === 'animation' && data.perm_trigger_animations === false) {
        return NextResponse.json({ error: 'No tenés permiso para activar animaciones.' }, { status: 403 });
      }
      if (type === 'tts' && data.perm_tts_text === false) {
        return NextResponse.json({ error: 'No tenés permiso para usar TTS por texto.' }, { status: 403 });
      }

      profile = data;
      finalUserId = user.id;
    }

    // 4. Fetch stream settings (Panic Button & Cooldowns)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('stream_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({ error: 'No se pudieron leer las configuraciones de la consola' }, { status: 500 });
    }

    if (settings.is_muted) {
      return NextResponse.json({ error: 'La consola de interacción está silenciada en este momento 🚫' }, { status: 403 });
    }

    // 5. Cooldown Validations
    const now = Date.now();

    // A. Global Cooldown Check
    const { data: lastGlobalEvent, error: lastGlobalError } = await supabaseAdmin
      .from('stream_events')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastGlobalError) {
      return NextResponse.json({ error: 'Error al verificar cooldown' }, { status: 500 });
    }

    if (lastGlobalEvent) {
      const diff = now - new Date(lastGlobalEvent.created_at).getTime();
      const globalLimit = settings.global_cooldown_seconds * 1000;
      if (diff < globalLimit) {
        const remaining = Math.ceil((globalLimit - diff) / 1000);
        return NextResponse.json({
          error: `Espera el cooldown global del stream (${remaining}s restantes)`
        }, { status: 429 });
      }
    }

    // B. Personal Cooldown Check (specific to type)
    const cooldownLimit = type === 'tts'
      ? settings.personal_cooldown_seconds * 1000
      : Math.min(60 * 1000, settings.personal_cooldown_seconds * 1000); // Respect dynamic personal cooldown up to 60s max for sounds/animations

    const { data: lastUserEvent, error: lastUserError } = await supabaseAdmin
      .from('stream_events')
      .select('created_at')
      .eq('user_id', finalUserId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastUserError) {
      return NextResponse.json({ error: 'Error al verificar cooldown personal' }, { status: 500 });
    }

    if (lastUserEvent) {
      const diff = now - new Date(lastUserEvent.created_at).getTime();
      if (diff < cooldownLimit) {
        const remaining = Math.ceil((cooldownLimit - diff) / 1000);
        return NextResponse.json({
          error: `Tienes que esperar ${remaining}s antes de enviar otro ${type === 'tts' ? 'TTS' : 'sonido'}`
        }, { status: 429 });
      }
    }

    // C. Sound-Specific Cooldown Check
    if (type === 'sound') {
      const soundId = content.trim();
      const { data: soundData, error: soundError } = await supabaseAdmin
        .from('soundboard_sounds')
        .select('name, cooldown_seconds')
        .eq('id', soundId)
        .maybeSingle();

      if (soundError) {
        console.error('Error fetching sound for cooldown check:', soundError.message);
      }

      if (soundData && soundData.cooldown_seconds && soundData.cooldown_seconds > 0) {
        const { data: lastSoundEvent, error: lastSoundEventError } = await supabaseAdmin
          .from('stream_events')
          .select('created_at')
          .eq('type', 'sound')
          .eq('content', soundId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSoundEventError) {
          console.error('Error fetching last sound event:', lastSoundEventError.message);
        }

        if (lastSoundEvent) {
          const diff = now - new Date(lastSoundEvent.created_at).getTime();
          const soundLimit = soundData.cooldown_seconds * 1000;
          if (diff < soundLimit) {
            const remaining = Math.ceil((soundLimit - diff) / 1000);
            return NextResponse.json({
              error: `El sonido "${soundData.name}" está en cooldown. Espera ${remaining}s.`
            }, { status: 429 });
          }
        }
      }
    }

    // 6. Insert new stream event
    console.log('[Events POST] Insertando evento:', {
      type,
      sender_roblox_user: profile.roblox_user,
      sender_avatar_url: profile.roblox_avatar_url,
    });
    const insertPayload: Record<string, unknown> = {
      user_id: finalUserId,
      type,
      content: content.trim(),
      sender_roblox_user: profile.roblox_user,
      sender_tiktok_user: profile.tiktok_user,
      sender_avatar_url: profile.roblox_avatar_url,
      played: false,
    };
    if (type === 'image_audio') {
      if (image_url) insertPayload.image_url = image_url;
      if (audio_url) insertPayload.audio_url = audio_url;
    }
    if (type === 'video') {
      if (video_url) insertPayload.video_url = video_url;
    }
    if (type === 'image') {
      if (image_url) insertPayload.image_url = image_url;
    }
    if ((type === 'video' || type === 'audio' || type === 'image_audio') && trim_start != null) {
      insertPayload.trim_start = trim_start;
      if (trim_end != null) insertPayload.trim_end = trim_end;
    }
    const { data: event, error: insertError } = await supabaseAdmin
      .from('stream_events')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('[Events POST Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
