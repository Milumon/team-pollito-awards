import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('stream_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      // If it doesn't exist, seed it dynamically
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        const { data: seedData, error: seedError } = await supabaseAdmin
          .from('stream_settings')
          .insert({ id: 1, is_muted: false, global_cooldown_seconds: 30, personal_cooldown_seconds: 300 })
          .select()
          .single();

        if (seedError) throw seedError;
        return NextResponse.json(seedData);
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Settings GET Error]:', error);
    return NextResponse.json({ error: 'Error al obtener configuraciones' }, { status: 500 });
  }
}

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
    const { 
      isMuted, 
      globalCooldown, 
      personalCooldown, 
      heartbeat,
      overlayNotificationTop,
      overlayNotificationLeft,
      overlayNotificationWidth,
      overlayNotificationBadgeSize,
      overlayNotificationContentSize,
      overlayNotificationSenderSize,
      overlayMediaTop,
      overlayMediaLeft,
      overlayMediaWidth
    } = body;

    const updates: Record<string, string | number | boolean | null> = {};

    // Caso Heartbeat de OBS Overlay
    if (heartbeat === true) {
      const { error: hbError } = await supabaseAdmin
        .from('stream_settings')
        .update({ overlay_active_at: new Date().toISOString() })
        .eq('id', 1);

      if (hbError) throw hbError;
      return NextResponse.json({ success: true, message: 'Overlay heartbeat registrado.' });
    }

    if (typeof isMuted === 'boolean') updates.is_muted = isMuted;
    if (typeof globalCooldown === 'number') updates.global_cooldown_seconds = globalCooldown;
    if (typeof personalCooldown === 'number') updates.personal_cooldown_seconds = personalCooldown;
    if (typeof overlayNotificationTop === 'number') updates.overlay_notification_top = overlayNotificationTop;
    if (typeof overlayNotificationLeft === 'number') updates.overlay_notification_left = overlayNotificationLeft;
    if (typeof overlayNotificationWidth === 'number') updates.overlay_notification_width = overlayNotificationWidth;
    if (typeof overlayNotificationBadgeSize === 'number') updates.overlay_notification_badge_size = overlayNotificationBadgeSize;
    if (typeof overlayNotificationContentSize === 'number') updates.overlay_notification_content_size = overlayNotificationContentSize;
    if (typeof overlayNotificationSenderSize === 'number') updates.overlay_notification_sender_size = overlayNotificationSenderSize;
    if (typeof overlayMediaTop === 'number') updates.overlay_media_top = overlayMediaTop;
    if (typeof overlayMediaLeft === 'number') updates.overlay_media_left = overlayMediaLeft;
    if (typeof overlayMediaWidth === 'number') updates.overlay_media_width = overlayMediaWidth;
    
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('stream_settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;

    // Si se activa el Botón de Pánico (mutear), vaciamos automáticamente la cola de la DB
    if (isMuted === true) {
      const { error: clearError } = await supabaseAdmin
        .from('stream_events')
        .update({ played: true })
        .eq('played', false);
      
      if (clearError) {
        console.error('[Panic Button Clear Queue Warning]:', clearError.message);
      }
    }

    // Registrar log de auditoría
    let actionLabel = 'Modificó configuraciones del directo';
    if (isMuted !== undefined) {
      actionLabel = isMuted ? 'Muteó el directo (Botón Pánico)' : 'Desmuteó el directo';
    }
    await logAdminAction(adminEmail, actionLabel, updates);

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error('[Settings POST Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error al actualizar configuraciones';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
