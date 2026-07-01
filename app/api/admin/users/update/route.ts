import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

type RobloxProfile = {
  id: number;
  name: string;
  displayName: string;
};

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 3) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.substring(0, 2)}***${localPart.substring(localPart.length - 1)}@${domain}`;
}

async function fetchRobloxUserIdFromUsername(username: string): Promise<number | null> {
  try {
    const response = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({ usernames: [username.trim()] }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: { id?: number }[] };
    const userRecord = data.data?.[0];
    return Number.isFinite(userRecord?.id) ? (userRecord?.id as number) : null;
  } catch (error) {
    console.error('Error fetching Roblox User ID from username:', error);
    return null;
  }
}

async function fetchRobloxProfile(userId: number): Promise<RobloxProfile | null> {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error fetching Roblox Profile:', error);
    return null;
  }
}

async function fetchRobloxAvatar(userId: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const item = data?.data?.[0];
    return item?.state === 'Completed' ? item.imageUrl || null : null;
  } catch (error) {
    console.error('Error fetching Roblox Avatar:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validar que el solicitante sea Administrador
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const authHeader = request.headers.get('Authorization');
    let adminEmail = 'admin-token@system';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) adminEmail = user.email;
    }

    const body = await request.json();
    const { userId, robloxUsername, tiktokUsername, linkStatus, rejectionReason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'El parámetro "userId" es requerido.' }, { status: 400 });
    }

    // 2. Obtener datos actuales del perfil para auditoría y validación
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: 'Error al buscar el perfil del usuario.' }, { status: 500 });
    }

    const updateData: any = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    // 3. Validar y actualizar Roblox si se proporcionó
    if (robloxUsername !== undefined) {
      const trimmedUsername = robloxUsername ? robloxUsername.trim() : '';

      if (trimmedUsername) {
        // Buscar ID de Roblox por username
        const robloxUserId = await fetchRobloxUserIdFromUsername(trimmedUsername);
        if (!robloxUserId) {
          return NextResponse.json(
            { error: `El usuario de Roblox "${trimmedUsername}" no existe.` },
            { status: 404 }
          );
        }

        // Verificar si el robloxUserId ya está vinculado a OTRO usuario
        const { data: duplicateProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('roblox_user_id', robloxUserId)
          .not('id', 'eq', userId)
          .maybeSingle();

        if (duplicateProfile) {
          const { data: { user: conflictedUser } } = await supabaseAdmin.auth.admin.getUserById(duplicateProfile.id);
          const emailText = conflictedUser?.email ? maskEmail(conflictedUser.email) : 'otro usuario';
          return NextResponse.json(
            { error: `Esta cuenta de Roblox ya está vinculada al correo ${emailText}.` },
            { status: 400 }
          );
        }

        // Obtener detalles adicionales del perfil de Roblox
        const robloxProfile = await fetchRobloxProfile(robloxUserId);
        if (!robloxProfile) {
          return NextResponse.json(
            { error: 'No se pudieron recuperar los detalles del perfil de Roblox.' },
            { status: 500 }
          );
        }

        const avatarUrl = await fetchRobloxAvatar(robloxUserId);

        updateData.roblox_user_id = robloxUserId;
        updateData.roblox_user = robloxProfile.name;
        updateData.roblox_display_name = robloxProfile.displayName;
        updateData.roblox_avatar_url = avatarUrl;
        updateData.roblox_verified_at = new Date().toISOString();
      } else {
        // Si el username se envía vacío, se desvincula la cuenta de Roblox
        updateData.roblox_user_id = null;
        updateData.roblox_user = null;
        updateData.roblox_display_name = null;
        updateData.roblox_avatar_url = null;
        updateData.roblox_verified_at = null;
      }
    }

    // 4. Actualizar TikTok si se proporcionó
    if (tiktokUsername !== undefined) {
      updateData.tiktok_user = tiktokUsername ? tiktokUsername.trim() : null;
    }

    // 5. Actualizar estado de vinculación si se proporcionó
    if (linkStatus !== undefined) {
      updateData.link_status = linkStatus;
      if (linkStatus === 'rejected') {
        updateData.rejection_reason = rejectionReason || null;
      } else {
        updateData.rejection_reason = null;
      }
    }

    // 6. Ejecutar la actualización en Supabase
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert(updateData, { onConflict: 'id' });

    if (updateError) {
      console.error('[Admin Users Update DB Error]:', updateError);
      return NextResponse.json({ error: `Error al actualizar la base de datos: ${updateError.message}` }, { status: 500 });
    }

    // 7. Registrar log de auditoría
    await logAdminAction(adminEmail, 'Actualizó perfil de usuario', {
      target_user_id: userId,
      changes: {
        roblox_user: updateData.roblox_user !== undefined ? updateData.roblox_user : null,
        tiktok_user: updateData.tiktok_user !== undefined ? updateData.tiktok_user : null,
        link_status: updateData.link_status !== undefined ? updateData.link_status : null,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil de usuario actualizado correctamente.',
      profile: {
        id: userId,
        robloxUserId: updateData.roblox_user_id,
        robloxUser: updateData.roblox_user,
        robloxDisplayName: updateData.roblox_display_name,
        robloxAvatarUrl: updateData.roblox_avatar_url,
        tiktokUser: updateData.tiktok_user,
        linkStatus: updateData.link_status,
        rejectionReason: updateData.rejection_reason,
      }
    });
  } catch (error) {
    console.error('[Admin Users Update POST Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
