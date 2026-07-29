import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { buildAccessPath } from '@/lib/authRouting';
import { updateServerAuth } from '@/lib/serverSession';

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

  const { user, response } = await updateServerAuth(request);

  if (user) {
    return response;
  }

  const returnPath = `${pathname}${search}`;
  const loginUrl = new URL(buildAccessPath(returnPath), request.url);
  const redirectResponse = NextResponse.redirect(loginUrl);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  redirectResponse.headers.set('Cache-Control', 'private, no-store');
  return redirectResponse;
}

export const config = {
  matcher: ['/console/:path*', '/admin/:path*', '/panel/:path*'],
};
