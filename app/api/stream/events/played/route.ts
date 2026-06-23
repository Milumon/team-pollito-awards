import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isAuthorized(request: NextRequest) {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || '';
  const requestToken = request.headers.get('x-admin-token') || '';
  return Boolean(adminToken) && requestToken === adminToken;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token') || '';
    const adminToken = process.env.ADMIN_PANEL_TOKEN || '';

    const isAuthorizedRequest = isAuthorized(request) || (Boolean(adminToken) && queryToken === adminToken);

    if (!isAuthorizedRequest) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'El parámetro "eventId" es obligatorio' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('stream_events')
      .update({ played: true })
      .eq('id', eventId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Events Played POST Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
