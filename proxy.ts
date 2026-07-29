import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { buildAccessPath } from '@/lib/authRouting';
import { getServerSessionFromRequest } from '@/lib/serverSession';

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

  const response = NextResponse.next();

  if (await getServerSessionFromRequest(request, response)) {
    return response;
  }

  const returnPath = `${pathname}${search}`;
  const loginUrl = new URL(buildAccessPath(returnPath), request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/console/:path*', '/admin/:path*', '/panel/:path*'],
};
