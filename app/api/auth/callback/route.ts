import { NextRequest, NextResponse } from 'next/server';

import { buildAccessPath, normalizeReturnPath } from '@/lib/authRouting';
import { createRouteHandlerSupabaseClient } from '@/lib/serverSession';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const retorno = normalizeReturnPath(request.nextUrl.searchParams.get('retorno'));
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const origin = forwardedHost
    ? `${forwardedProtocol === 'http' ? 'http' : 'https'}://${forwardedHost}`
    : request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL(buildAccessPath(retorno), origin));
  }

  const response = NextResponse.redirect(new URL(retorno, origin));
  const supabase = createRouteHandlerSupabaseClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(buildAccessPath(retorno), origin));
  }

  return response;
}
