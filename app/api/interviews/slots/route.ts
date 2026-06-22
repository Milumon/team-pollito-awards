import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function isAdmin(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || '';
  const requestToken = request.headers.get('x-admin-token') || '';
  return Boolean(adminToken) && requestToken === adminToken;
}

// GET /api/interviews/slots - Obtener slots de entrevista libres
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: slots, error } = await supabaseAdmin
      .from('interview_slots')
      .select('id, slot_date, slot_time')
      .eq('is_booked', false)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(slots || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/interviews/slots - Crear un nuevo slot de entrevista (Admin)
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slot_date, slot_time } = body;

    if (!slot_date || !slot_time) {
      return NextResponse.json(
        { error: 'slot_date and slot_time are required' },
        { status: 400 }
      );
    }

    // Validar que la fecha sea un viernes
    const dateObj = new Date(slot_date + 'T00:00:00');
    // En JS,getDay() devuelve 0 para domingo, 5 para viernes
    if (dateObj.getDay() !== 5) {
      return NextResponse.json(
        { error: 'Las entrevistas solo se pueden agendar los días viernes' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('interview_slots')
      .insert({
        slot_date,
        slot_time,
        is_booked: false,
      })
      .select()
      .single();

    if (error) {
      // Si ya existe (unique constraint)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Este slot ya existe para esa fecha y hora' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
