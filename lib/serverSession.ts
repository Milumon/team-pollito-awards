import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

type LinkStatus = 'none' | 'pending' | 'approved' | 'rejected';

type ProfileFlags = {
  is_admin?: boolean | null;
  link_status?: LinkStatus | null;
};

export type ServerSession = {
  user: User;
  isAdmin: boolean;
  linkStatus: LinkStatus;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ownerEmail = 'kpopxfull@gmail.com';

async function readProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin, link_status')
    .eq('id', userId)
    .maybeSingle();

  return data as ProfileFlags | null;
}

async function buildServerSession(
  supabase: ReturnType<typeof createServerClient>,
  user: User | null,
) {
  if (!user) {
    return null;
  }

  const profile = await readProfile(supabase, user.id);

  return {
    user,
    isAdmin: Boolean(profile?.is_admin || user.email === ownerEmail),
    linkStatus: profile?.link_status || 'none',
  } satisfies ServerSession;
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read request cookies but cannot always write responses.
        }
      },
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error ? null : buildServerSession(supabase, user);
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
