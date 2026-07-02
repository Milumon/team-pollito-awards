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

    const body = await request.json();
    const { soundId, name, isPublic } = body;

    if (!soundId) {
      return NextResponse.json({ error: 'Falta soundId' }, { status: 400 });
    }

    // Verify ownership
    const { data: sound, error: fetchError } = await supabaseAdmin
      .from('soundboard_sounds')
      .select('id, owner_user_id')
      .eq('id', soundId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!sound) {
      return NextResponse.json({ error: 'Sonido no encontrado' }, { status: 404 });
    }
    if (sound.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'No sos el dueño de este sonido' }, { status: 403 });
    }

    // Update
    const updates: Record<string, unknown> = {};
    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (isPublic !== undefined) updates.is_public = isPublic;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos para actualizar' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('soundboard_sounds')
      .update(updates)
      .eq('id', soundId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Sound Update Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
