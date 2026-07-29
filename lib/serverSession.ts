import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from './supabaseAdmin';

type LinkStatus = 'none' | 'pending' | 'approved' | 'rejected';

type ProfileFlags = {
  is_admin?: boolean | null;
  link_status?: LinkStatus | null;
};

type CookieSnapshot = {
  name: string;
  value: string;
};

type CookieOptions = Parameters<NextResponse['cookies']['set']>[2];

type CookiesToSet = Array<{
  name: string;
  value: string;
  options?: CookieOptions;
}>;

export type ServerSession = {
  user: User;
  isAdmin: boolean;
  linkStatus: LinkStatus;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ownerEmail = 'kpopxfull@gmail.com';

async function readProfile(userId: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, link_status')
    .eq('id', userId)
    .maybeSingle();

  return data as ProfileFlags | null;
}

async function buildServerSession(user: User | null) {
  if (!user) {
    return null;
  }

  const profile = await readProfile(user.id);

  return {
    user,
    isAdmin: Boolean(profile?.is_admin || user.email === ownerEmail),
    linkStatus: profile?.link_status || 'none',
  } satisfies ServerSession;
}

async function getVerifiedUser(
  getAll: () => CookieSnapshot[],
  setAll: (cookiesToSet: CookiesToSet, headers?: Record<string, string>) => void,
) {
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll,
      setAll,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const user = await getVerifiedUser(
    () => cookieStore.getAll(),
    (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Server Components cannot always write cookies; Proxy handles refreshes.
      }
    },
  );

  return buildServerSession(user);
}

export function createRouteHandlerSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  const currentCookies = new Map(
    request.cookies.getAll().map((cookie) => [cookie.name, cookie]),
  );

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [...currentCookies.values()];
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          currentCookies.set(name, { name, value });
          response.cookies.set(name, value, options);
        });

        Object.entries(headers || {}).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });
}

export async function getServerSessionFromRequest(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createRouteHandlerSupabaseClient(request, response);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return buildServerSession(user);
}
