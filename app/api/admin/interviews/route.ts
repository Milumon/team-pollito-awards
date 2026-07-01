import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// GET /api/admin/interviews - Obtener todos los slots y candidatos
export async function GET(request: NextRequest) {
  try {
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch slots
    const { data: slots, error: slotsError } = await supabaseAdmin
      .from('interview_slots')
      .select('*')
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (slotsError) {
      return NextResponse.json({ error: slotsError.message }, { status: 500 });
    }

    // 2. Fetch profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, roblox_user, roblox_display_name, roblox_avatar_url, tiktok_user');

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // 3. Fetch Auth Users to get email
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 4. Fetch pending interviews from history
    const { data: pendingHistory, error: historyError } = await supabaseAdmin
      .from('interview_history')
      .select('*')
      .eq('status', 'pending');

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // 5. Enrich slots with user and application details
    const enrichedSlots = (slots || []).map((slot) => {
      if (!slot.is_booked || !slot.booked_by_user_id) {
        return slot;
      }

      const profile = profiles?.find((p) => p.id === slot.booked_by_user_id);
      const authUser = authUsers?.find((u) => u.id === slot.booked_by_user_id);
      const history = pendingHistory?.find((h) => h.user_id === slot.booked_by_user_id);

      return {
        ...slot,
        user: {
          email: authUser?.email || 'N/A',
          roblox_user: profile?.roblox_user || history?.roblox_user || 'Desconocido',
          roblox_display_name: profile?.roblox_display_name || history?.roblox_user || 'Desconocido',
          roblox_avatar_url: profile?.roblox_avatar_url || null,
          tiktok_user: profile?.tiktok_user || history?.tiktok_user || 'Desconocido',
          ban_reason: history?.ban_reason || null,
          return_reason: history?.return_reason || null,
        },
      };
    });

    return NextResponse.json(enrichedSlots);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown interviews error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/interviews - Crear, reprogramar o borrar un slot
export async function POST(request: NextRequest) {
  try {
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authHeader = request.headers.get('Authorization');
    let adminEmail = 'admin-token@system';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) adminEmail = user.email;
    }

    const body = await request.json();
    const { action, slotId, slot_date, slot_time } = body;

    if (!action) {
      return NextResponse.json({ error: 'Falta parámetro action' }, { status: 400 });
    }

    if (action === 'create') {
      if (!slot_date || !slot_time) {
        return NextResponse.json({ error: 'slot_date y slot_time son requeridos' }, { status: 400 });
      }

      // Validar viernes
      const dateObj = new Date(slot_date + 'T00:00:00');
      if (dateObj.getDay() !== 5) {
        return NextResponse.json(
          { error: 'Las entrevistas solo se pueden agendar los días viernes' },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('interview_slots')
        .insert({ slot_date, slot_time, is_booked: false })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Este slot ya existe para esa fecha y hora' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAdminAction(adminEmail, 'Creó slot entrevista', {
        date: slot_date,
        time: slot_time,
      });

      return NextResponse.json(data, { status: 201 });
    }

    if (action === 'reschedule') {
      if (!slotId) {
        return NextResponse.json({ error: 'Falta slotId para reprogramar' }, { status: 400 });
      }

      // 1. Get current slot state
      const { data: slot, error: slotError } = await supabaseAdmin
        .from('interview_slots')
        .select('*')
        .eq('id', slotId)
        .maybeSingle();

      if (slotError || !slot) {
        return NextResponse.json({ error: 'Slot no encontrado' }, { status: 404 });
      }

      // 2. Free up slot
      const { error: freeError } = await supabaseAdmin
        .from('interview_slots')
        .update({ is_booked: false, booked_by_user_id: null })
        .eq('id', slotId);

      if (freeError) {
        return NextResponse.json({ error: freeError.message }, { status: 500 });
      }

      // 3. Mark candidate's interview as rejected/rescheduled
      if (slot.is_booked && slot.booked_by_user_id) {
        const { error: historyError } = await supabaseAdmin
          .from('interview_history')
          .update({ status: 'rejected' })
          .eq('user_id', slot.booked_by_user_id)
          .eq('status', 'pending');

        if (historyError) {
          console.warn('Fallo al marcar interview_history como rechazado/reprogramado:', historyError.message);
        }
      }

      await logAdminAction(adminEmail, 'Reprogramó slot entrevista', {
        slot_id: slotId,
        date: slot.slot_date,
        time: slot.slot_time,
        was_booked: slot.is_booked,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      if (!slotId) {
        return NextResponse.json({ error: 'Falta slotId para eliminar' }, { status: 400 });
      }

      // 1. Get slot to check if booked
      const { data: slot, error: slotError } = await supabaseAdmin
        .from('interview_slots')
        .select('*')
        .eq('id', slotId)
        .maybeSingle();

      if (slotError || !slot) {
        return NextResponse.json({ error: 'Slot no encontrado' }, { status: 404 });
      }

      // 2. If booked, mark the history record as rejected first to notify candidate
      if (slot.is_booked && slot.booked_by_user_id) {
        const { error: historyError } = await supabaseAdmin
          .from('interview_history')
          .update({ status: 'rejected' })
          .eq('user_id', slot.booked_by_user_id)
          .eq('status', 'pending');

        if (historyError) {
          console.warn('Fallo al marcar interview_history como rechazado/reprogramado:', historyError.message);
        }
      }

      // 3. Delete slot row
      const { error: deleteError } = await supabaseAdmin
        .from('interview_slots')
        .delete()
        .eq('id', slotId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      await logAdminAction(adminEmail, 'Eliminó slot entrevista', {
        slot_id: slotId,
        date: slot.slot_date,
        time: slot.slot_time,
        was_booked: slot.is_booked,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown interviews POST error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
