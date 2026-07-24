import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin';

export async function getSupabaseUser(request: NextRequest): Promise<User | null> {
  const header = request.headers.get('authorization');
  if (!header || !/^Bearer\s+\S+$/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, '');
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export async function getSupabaseAdminUser(request: NextRequest): Promise<User | null> {
  const user = await getSupabaseUser(request);
  if (!user) return null;
  if (user.email === 'kpopxfull@gmail.com') return user;
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return data?.is_admin ? user : null;
}
