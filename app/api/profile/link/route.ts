import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type RobloxProfile = {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  created?: string;
  isBanned?: boolean;
};

async function fetchRobloxProfile(userId: number): Promise<RobloxProfile | null> {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
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
    const data = (await response.json()) as { data?: Array<{ id: number }> };
    const userRecord = data.data?.[0];
    if (userRecord && Number.isFinite(userRecord.id)) {
      return userRecord.id;
    }
    return null;
  } catch {
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
  } catch {
    return null;
  }
}

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
    const robloxUsername = body.robloxUsername;
    const tiktokUsername = body.tiktokUsername;

    if (!robloxUsername || !tiktokUsername) {
      return NextResponse.json(
        { error: 'robloxUsername and tiktokUsername are required' },
        { status: 400 }
      );
    }

    // Verify Roblox User
    const robloxUserId = await fetchRobloxUserIdFromUsername(robloxUsername);
    if (!robloxUserId) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en Roblox. Verifica tu nombre de usuario.' },
        { status: 404 }
      );
    }

    // Fetch profile and avatar
    const profile = await fetchRobloxProfile(robloxUserId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Roblox profile details could not be retrieved.' },
        { status: 404 }
      );
    }

    const robloxUser = String(profile.name || robloxUsername).trim();
    const displayName = String(profile.displayName || robloxUser).trim();
    const avatarUrl = await fetchRobloxAvatar(robloxUserId);

    // Normalize TikTok username
    let normalizedTiktok = tiktokUsername.trim();
    if (normalizedTiktok.startsWith('@')) {
      normalizedTiktok = normalizedTiktok.substring(1);
    }
    normalizedTiktok = normalizedTiktok.toLowerCase();

    // Check interview_history for automatic approval
    // (if they are already an official member)
    const { data: historyMatch } = await supabaseAdmin
      .from('interview_history')
      .select('status')
      .eq('roblox_user', robloxUser)
      .eq('tiktok_user', normalizedTiktok)
      .eq('status', 'official')
      .maybeSingle();

    const isAlreadyOfficial = !!historyMatch;
    const linkStatus = isAlreadyOfficial ? 'approved' : 'pending';
    const robloxVerifiedAt = isAlreadyOfficial ? new Date().toISOString() : null;

    // Obtener perfil existente para verificar si tiene nickname personalizado (🐣)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('roblox_display_name')
      .eq('id', user.id)
      .maybeSingle();

    const isCustomNickname = !!(existingProfile?.roblox_display_name?.startsWith('🐣') && existingProfile?.roblox_display_name?.endsWith('🐣'));
    const finalDisplayName = isCustomNickname ? existingProfile!.roblox_display_name : displayName;

    // Upsert into profiles
    const { data: updatedProfile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          roblox_user_id: robloxUserId,
          roblox_user: robloxUser,
          roblox_display_name: finalDisplayName,
          roblox_avatar_url: avatarUrl,
          roblox_verified_at: robloxVerifiedAt,
          tiktok_user: normalizedTiktok,
          link_status: linkStatus,
          rejection_reason: null, // Clear rejection reason on new submission
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert profile failed:', upsertError.message);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      profile: updatedProfile,
      linkStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Link profile POST failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
