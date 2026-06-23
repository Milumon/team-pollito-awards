import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isAuthorized(request: NextRequest) {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || '';
  const requestToken = request.headers.get('x-admin-token') || '';
  return Boolean(adminToken) && requestToken === adminToken;
}

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { isMuted, globalCooldown, personalCooldown } = body;

    const updates: Record<string, string | number | boolean> = {};
    if (typeof isMuted === 'boolean') updates.is_muted = isMuted;
    if (typeof globalCooldown === 'number') updates.global_cooldown_seconds = globalCooldown;
    if (typeof personalCooldown === 'number') updates.personal_cooldown_seconds = personalCooldown;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('stream_settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error('[Settings POST Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error al actualizar configuraciones';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
