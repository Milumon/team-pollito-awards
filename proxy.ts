import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { buildAccessPath } from '@/lib/authRouting';
import { refreshServerAuth } from '@/lib/serverSession';
import { hasSupabaseAuthCookie } from '@/lib/supabaseAuthCookie';

const PRIVATE_PREFIXES = ['/console', '/admin', '/panel'];

function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isPrivatePath(pathname)) {
    return NextResponse.next();
  }

  if (
    !hasSupabaseAuthCookie(
      request.cookies.getAll(),
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    )
  ) {
    const returnPath = `${pathname}${search}`;
    const loginUrl = new URL(buildAccessPath(returnPath), request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/panel') {
    const url = request.nextUrl.clone();
    url.pathname = '/panel/inicio';
    return NextResponse.redirect(url);
  }

  if (pathname === '/panel/sonidos') {
    const tipo = request.nextUrl.searchParams.get('tipo');
    if (tipo !== null && tipo !== 'audios' && tipo !== 'multimedia' && tipo !== 'videos') {
      const url = request.nextUrl.clone();
      const params = new URLSearchParams(request.nextUrl.searchParams);
      params.set('tipo', 'audios');
      url.search = `?${params.toString()}`;
      return NextResponse.redirect(url);
    }
  }

  const returnPath = `${pathname}${search}`;
  return refreshServerAuth(request, returnPath);
}

export const config = {
  matcher: ['/console/:path*', '/admin/:path*', '/panel/:path*'],
};
