import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminUser } from '@/lib/supabaseAdminAuth';

export async function GET(request: NextRequest) {
  if (!await getSupabaseAdminUser(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const overlayToken = process.env.OVERLAY_TOKEN;
  if (!overlayToken) {
    return NextResponse.json(
      { error: 'Falta configurar OVERLAY_TOKEN en el servidor' },
      { status: 503 }
    );
  }

  const overlayUrl = new URL('/overlay', request.nextUrl.origin);
  overlayUrl.searchParams.set('key', overlayToken);

  return NextResponse.json(
    { url: overlayUrl.toString() },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
