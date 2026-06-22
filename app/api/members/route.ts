import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/members - Obtener lista de miembros oficiales aprobados
export async function GET() {
  try {
    const { data: members, error } = await supabaseAdmin
      .from('profiles')
      .select('roblox_user, roblox_display_name, roblox_avatar_url')
      .eq('link_status', 'approved')
      .order('roblox_display_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(members || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
