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
export async function POST(request: NextRequest) {
  try {
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
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('roblox_user, tiktok_user, link_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.link_status !== 'approved') {
      return NextResponse.json({ error: 'Membresía no aprobada' }, { status: 403 });
    }

    // 3. Parse and validate body
    const body = await request.json();
    const { type, content } = body;

    if (!type || !content || !content.trim()) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    if (!['sound', 'tts', 'animation'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de evento inválido' }, { status: 400 });
    }

    if (type === 'tts') {
      if (content.length > 120) {
        return NextResponse.json({ error: 'El TTS no puede superar los 120 caracteres' }, { status: 400 });
      }
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
      : 60 * 1000; // 60 seconds personal cooldown for sounds/animations

    const { data: lastUserEvent, error: lastUserError } = await supabaseAdmin
      .from('stream_events')
      .select('created_at')
      .eq('user_id', user.id)
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
          error: `Tenés que esperar ${remaining}s antes de enviar otro ${type === 'tts' ? 'TTS' : 'sonido'}`
        }, { status: 429 });
      }
    }

    // 6. Insert new stream event
    const { data: event, error: insertError } = await supabaseAdmin
      .from('stream_events')
      .insert({
        user_id: user.id,
        type,
        content: content.trim(),
        sender_roblox_user: profile.roblox_user,
        sender_tiktok_user: profile.tiktok_user,
        played: false,
      })
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
