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

  const returnPath = `${pathname}${search}`;

  if (
    !hasSupabaseAuthCookie(
      request.cookies.getAll(),
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    )
  ) {
    const loginUrl = new URL(buildAccessPath(returnPath), request.url);
    return NextResponse.redirect(loginUrl);
  }

  return refreshServerAuth(request, returnPath);
}

export const config = {
  matcher: ['/console/:path*', '/admin/:path*', '/panel/:path*'],
};
