import { NextRequest, NextResponse } from 'next/server';

import { buildAccessPath, normalizeReturnPath } from '@/lib/authRouting';
import { createRouteHandlerSupabaseClient } from '@/lib/serverSession';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const retorno = normalizeReturnPath(request.nextUrl.searchParams.get('retorno'));

  if (!code) {
    return NextResponse.redirect(new URL(buildAccessPath(retorno), request.url));
  }

  const response = NextResponse.redirect(new URL(retorno, request.url));
  const supabase = createRouteHandlerSupabaseClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(buildAccessPath(retorno), request.url));
  }

  return response;
}
