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
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const token = authHeader.substring('Bearer '.length);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
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
      alreadyInterviewed, // NEW: user claims they already had an interview
    } = body;

    // Validate required fields
    if (!robloxUsername || !tiktokUsername) {
      return NextResponse.json(
        { error: 'El nombre de usuario de Roblox y TikTok son obligatorios.' },
        { status: 400 }
      );
    }

    // If NOT claiming already interviewed, a slotId is required
    if (!alreadyInterviewed && !slotId) {
      return NextResponse.json(
        { error: 'Debes seleccionar un horario para tu entrevista.' },
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

    // Verify Roblox User exists
    let robloxUserId: number | null = null;
    let finalRobloxName = normalizedRoblox;
    let avatarUrl: string | null = null;
    try {
      const robloxCheckRes = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({ usernames: [normalizedRoblox] }),
      });
      if (robloxCheckRes.ok) {
        const robloxCheckData = (await robloxCheckRes.json()) as { data?: Array<{ id: number; name: string }> };
        const robloxUserRecord = robloxCheckData.data?.[0];
        if (robloxUserRecord && Number.isFinite(robloxUserRecord.id)) {
          robloxUserId = robloxUserRecord.id;
          finalRobloxName = robloxUserRecord.name;
          
          // Get avatar
          const avatarRes = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxUserId}&size=420x420&format=Png&isCircular=false`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          );
          if (avatarRes.ok) {
            const avatarData = await avatarRes.json();
            const item = avatarData?.data?.[0];
            if (item?.state === 'Completed') {
              avatarUrl = item.imageUrl || null;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error al verificar usuario de Roblox:', err);
    }

    if (!robloxUserId) {
      return NextResponse.json(
        { error: 'El usuario de Roblox ingresado no existe en Roblox. Por favor, verifica el nombre.' },
        { status: 404 }
      );
    }

    // Check if the user is already an official member
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('link_status')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile?.link_status === 'approved') {
      return NextResponse.json(
        { error: 'Ya eres un miembro oficial de la comunidad.' },
        { status: 400 }
      );
    }

    // Release any existing slots booked by this user first to prevent slot leaks
    const { error: releaseError } = await supabaseAdmin
      .from('interview_slots')
      .update({ is_booked: false, booked_by_user_id: null })
      .eq('booked_by_user_id', user.id);

    if (releaseError) {
      console.warn('Fallo al liberar slots anteriores del usuario:', releaseError.message);
    }

    let interviewDate: string | null = null;
    let interviewTime: string | null = null;

    // 3. If scheduling a new slot — validate and book it
    if (!alreadyInterviewed && slotId) {
      const { data: slot, error: slotError } = await supabaseAdmin
        .from('interview_slots')
        .select('*')
        .eq('id', slotId)
        .maybeSingle();

      if (slotError || !slot) {
        return NextResponse.json(
          { error: 'El horario de entrevista seleccionado no existe.' },
          { status: 404 }
        );
      }

      if (slot.is_booked) {
        return NextResponse.json(
          { error: 'Este horario ya fue reservado por otro usuario.' },
          { status: 400 }
        );
      }

      const slotDateTime = new Date(`${slot.slot_date}T${slot.slot_time}`);
      if (slotDateTime.getTime() < Date.now()) {
        return NextResponse.json(
          { error: 'No puedes reservar un horario en el pasado.' },
          { status: 400 }
        );
      }

      // Mark slot as booked
      const { error: updateSlotError } = await supabaseAdmin
        .from('interview_slots')
        .update({ is_booked: true, booked_by_user_id: user.id })
        .eq('id', slotId);

      if (updateSlotError) {
        return NextResponse.json({ error: updateSlotError.message }, { status: 500 });
      }

      interviewDate = slot.slot_date;
      interviewTime = slot.slot_time;
    }

    // 4. Upsert interview_history
    const { data: historyData, error: historyError } = await supabaseAdmin
      .from('interview_history')
      .upsert(
        {
          roblox_user: finalRobloxName,
          tiktok_user: normalizedTiktok,
          status: 'pending',
          interview_date: interviewDate,
          interview_time: interviewTime,
          user_id: user.id,
          ban_reason: isReturning ? banReason.trim() : null,
          return_reason: isReturning ? returnReason.trim() : null,
          already_interviewed: alreadyInterviewed ?? false,
        },
        { onConflict: 'roblox_user,tiktok_user' }
      )
      .select()
      .single();

    if (historyError) {
      // Rollback slot booking if we booked one
      if (!alreadyInterviewed && slotId) {
        await supabaseAdmin
          .from('interview_slots')
          .update({ is_booked: false, booked_by_user_id: null })
          .eq('id', slotId);
      }
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // 5. Upsert profile
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        roblox_user_id: robloxUserId,
        roblox_user: finalRobloxName,
        roblox_display_name: finalRobloxName,
        roblox_avatar_url: avatarUrl,
        tiktok_user: normalizedTiktok,
        link_status: 'pending',
        testimonial: testimonial ? String(testimonial).trim() : null,
        testimonial_approved: false,
      }, { onConflict: 'id' });

    if (profileUpsertError) {
      if (!alreadyInterviewed && slotId) {
        await supabaseAdmin
          .from('interview_slots')
          .update({ is_booked: false, booked_by_user_id: null })
          .eq('id', slotId);
      }
      return NextResponse.json({ error: profileUpsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, interview: historyData });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
