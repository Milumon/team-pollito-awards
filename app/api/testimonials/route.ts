import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = 'force-dynamic';

// GET /api/testimonials - Obtener opiniones aprobadas
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('roblox_display_name, roblox_user, roblox_avatar_url, testimonial')
      .eq('testimonial_approved', true)
      .not('testimonial', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/testimonials - Registrar o actualizar opinión propia
export async function POST(request: NextRequest) {
  try {
    // Get auth header from request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring('Bearer '.length);

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const testimonial = body.testimonial;

    if (testimonial === undefined) {
      return NextResponse.json(
        { error: 'La opinión es obligatoria' },
        { status: 400 }
      );
    }

    // Actualizar el perfil del usuario
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        testimonial: testimonial ? String(testimonial).trim() : null,
        testimonial_approved: false, // Se reinicia a false al modificar por seguridad
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Opinión registrada con éxito, pendiente de moderación.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
