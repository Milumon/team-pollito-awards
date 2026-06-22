import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { tagRobloxUser } from '@/lib/robloxAdmin';

function isAuthorized(request: NextRequest) {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || '';
  const requestToken = request.headers.get('x-admin-token') || '';
  return Boolean(adminToken) && requestToken === adminToken;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action, rejectionReason } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId y action son requeridos.' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject' && action !== 'revoke') {
      return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
    }

    if (action === 'approve') {
      // Approve profile link
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          link_status: 'approved',
          roblox_verified_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', userId);

      if (updateProfileError) {
        return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
      }

      // Upsert interview history to official
      const { error: historyError } = await supabaseAdmin
        .from('interview_history')
        .upsert(
          {
            roblox_user: profile.roblox_user,
            tiktok_user: profile.tiktok_user,
            status: 'official',
            user_id: userId,
          },
          { onConflict: 'roblox_user,tiktok_user' }
        );

      if (historyError) {
        console.warn('Fallo al actualizar interview_history a official:', historyError.message);
      }

      // Trigger Roblox tag addition
      if (profile.roblox_user_id) {
        try {
          await tagRobloxUser(Number(profile.roblox_user_id), 'add');
        } catch (tagErr) {
          console.error('Error al poner prefijo en Roblox:', tagErr);
          // Don't fail the request, just log it. The DB state is updated successfully.
        }
      }

    } else if (action === 'reject') {
      // Reject profile link
      const reason = rejectionReason || 'Los datos brindados no coinciden o no son correctos.';
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          link_status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', userId);

      if (updateProfileError) {
        return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
      }

      // Mark pending interview_history as rejected
      const { error: historyError } = await supabaseAdmin
        .from('interview_history')
        .update({ status: 'rejected' })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (historyError) {
        console.warn('Fallo al actualizar interview_history a rejected:', historyError.message);
      }

    } else if (action === 'revoke') {
      // Revoke profile link
      const reason = rejectionReason || 'Membresía revocada por el administrador.';
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          link_status: 'rejected',
          rejection_reason: reason,
          roblox_verified_at: null,
        })
        .eq('id', userId);

      if (updateProfileError) {
        return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
      }

      // Mark all interview_history records for this user as rejected
      const { error: historyError } = await supabaseAdmin
        .from('interview_history')
        .update({ status: 'rejected' })
        .eq('user_id', userId);

      if (historyError) {
        console.warn('Fallo al revocar interview_history:', historyError.message);
      }

      // Trigger Roblox tag removal
      if (profile.roblox_user_id) {
        try {
          await tagRobloxUser(Number(profile.roblox_user_id), 'remove');
        } catch (tagErr) {
          console.error('Error al remover prefijo en Roblox:', tagErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
