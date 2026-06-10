// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();
  const protectedPaths = ['/vote'];
  const { pathname } = request.nextUrl;

  if (protectedPaths.includes(pathname) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/vote'],
};
