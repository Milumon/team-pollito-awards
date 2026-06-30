import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring('Bearer '.length);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      slotId,
      robloxUsername,
      tiktokUsername,
      isReturning,
      banReason,
      returnReason,
      testimonial,
    } = body;

    if (!slotId || !robloxUsername || !tiktokUsername) {
      return NextResponse.json(
        { error: 'slotId, robloxUsername y tiktokUsername son campos obligatorios.' },
        { status: 400 }
      );
    }

    if (isReturning && (!banReason || !returnReason)) {
      return NextResponse.json(
        { error: 'Para postulaciones de re-ingreso, los motivos de baneo y retorno son obligatorios.' },
        { status: 400 }
      );
    }

    // Normalize usernames
    const normalizedRoblox = robloxUsername.trim();
    let normalizedTiktok = tiktokUsername.trim();
    if (normalizedTiktok.startsWith('@')) {
      normalizedTiktok = normalizedTiktok.substring(1);
    }
    normalizedTiktok = normalizedTiktok.toLowerCase();

    // Check if the user is already an official member
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('link_status')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile?.link_status === 'approved') {
      return NextResponse.json(
        { error: 'Ya eres un miembro oficial de la comunidad y no necesitas agendar entrevistas.' },
        { status: 400 }
      );
    }

    // 3. Fetch slot to verify it's available
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('interview_slots')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'El slot de entrevista seleccionado no existe.' },
        { status: 404 }
      );
    }

    if (slot.is_booked) {
      return NextResponse.json(
        { error: 'Este slot ya ha sido reservado por otro usuario.' },
        { status: 400 }
      );
    }

    // Verify slot is in the future
    const slotDateTime = new Date(`${slot.slot_date}T${slot.slot_time}`);
    if (slotDateTime.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'No puedes reservar un slot en el pasado.' },
        { status: 400 }
      );
    }

    // 4. Perform booking transactions
    // Update the slot to booked
    const { error: updateSlotError } = await supabaseAdmin
      .from('interview_slots')
      .update({
        is_booked: true,
        booked_by_user_id: user.id,
      })
      .eq('id', slotId);

    if (updateSlotError) {
      return NextResponse.json({ error: updateSlotError.message }, { status: 500 });
    }

    // Upsert into interview_history
    const { data: historyData, error: historyError } = await supabaseAdmin
      .from('interview_history')
      .upsert(
        {
          roblox_user: normalizedRoblox,
          tiktok_user: normalizedTiktok,
          status: 'pending',
          interview_date: slot.slot_date,
          interview_time: slot.slot_time,
          user_id: user.id,
          ban_reason: isReturning ? banReason.trim() : null,
          return_reason: isReturning ? returnReason.trim() : null,
        },
        { onConflict: 'roblox_user,tiktok_user' }
      )
      .select()
      .single();

    if (historyError) {
      // Rollback slot booking if history insert fails
      await supabaseAdmin
        .from('interview_slots')
        .update({
          is_booked: false,
          booked_by_user_id: null,
        })
        .eq('id', slotId);

      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // Upsert profile with usernames and optional testimonial
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        roblox_user: normalizedRoblox,
        roblox_display_name: normalizedRoblox,
        tiktok_user: normalizedTiktok,
        link_status: 'pending',
        testimonial: testimonial ? String(testimonial).trim() : null,
        testimonial_approved: false
      }, { onConflict: 'id' });

    if (profileUpsertError) {
      // rollback slot booking if profile update fails
      await supabaseAdmin
        .from('interview_slots')
        .update({
          is_booked: false,
          booked_by_user_id: null,
        })
        .eq('id', slotId);

      return NextResponse.json({ error: profileUpsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      interview: historyData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
