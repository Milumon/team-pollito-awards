import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: nominees, error } = await supabaseAdmin
      .from('nominees')
      .select('id, roblox_user, display_name, nickname, profile_image_url, is_visible, category_id')
      .eq('is_visible', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ nominees: nominees || [] });
  } catch (error) {
    console.error('[Public Nominees GET Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error al cargar los nominados';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
