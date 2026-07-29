import { supabase } from '@/lib/supabaseClient';

export async function readApiPayload(response: Response) {
  const rawText = await response.text();

  try {
    return rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch {
    return { error: rawText || `Respuesta invalida (${response.status})` };
  }
}

export async function adminFetch(input: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, { ...init, headers });
}
