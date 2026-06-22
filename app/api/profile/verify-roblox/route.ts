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

type StoredRobloxProfile = {
  roblox_user_id: number | null;
  roblox_user: string | null;
  roblox_display_name: string | null;
  roblox_avatar_url: string | null;
  roblox_verified_at: string | null;
  tiktok_user?: string | null;
  link_status?: 'none' | 'pending' | 'approved' | 'rejected' | null;
  rejection_reason?: string | null;
};

function isMissingProfilesTable(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === 'PGRST205' || String(error?.message || '').includes("Could not find the table 'public.profiles'");
}

function buildStoredProfile(
  robloxUserId: number,
  robloxUser: string,
  displayName: string,
  avatarUrl: string | null
): StoredRobloxProfile {
  return {
    roblox_user_id: robloxUserId,
    roblox_user: robloxUser,
    roblox_display_name: displayName,
    roblox_avatar_url: avatarUrl,
    roblox_verified_at: new Date().toISOString(),
  };
}

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
    const data = (await response.json()) as { data?: { id?: number }[] };
    const userRecord = data.data?.[0];
    return Number.isFinite(userRecord?.id) ? (userRecord?.id as number) : null;
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
    let robloxUserId: number | null = null;

    // Handle username or direct ID
    if (body.robloxUsername) {
      robloxUserId = await fetchRobloxUserIdFromUsername(body.robloxUsername);
      if (!robloxUserId) {
        return NextResponse.json(
          { error: 'Usuario no encontrado en Roblox. Verifica tu nombre de usuario.' },
          { status: 404 }
        );
      }
    } else if (body.robloxUserId || body.userId) {
      robloxUserId = Number(body.robloxUserId || body.userId);
      if (!Number.isFinite(robloxUserId) || robloxUserId <= 0) {
        return NextResponse.json({ error: 'Invalid Roblox user ID' }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: 'robloxUsername or robloxUserId is required' },
        { status: 400 }
      );
    }

    // Fetch Roblox profile
    const profile = await fetchRobloxProfile(robloxUserId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Roblox user not found' },
        { status: 404 }
      );
    }

    const robloxUser = String(profile?.name || `user-${robloxUserId}`).trim();
    const displayName = String(profile?.displayName || robloxUser || `user-${robloxUserId}`).trim();
    const avatarUrl = await fetchRobloxAvatar(robloxUserId);
    const storedProfile = buildStoredProfile(robloxUserId, robloxUser, displayName, avatarUrl);

    // Upsert profile
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          roblox_user_id: robloxUserId,
          roblox_user: robloxUser,
          roblox_display_name: displayName,
          roblox_avatar_url: avatarUrl,
          roblox_verified_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, roblox_user_id, roblox_user, roblox_display_name, roblox_avatar_url, roblox_verified_at')
      .single();

    if (error) {
        if (!isMissingProfilesTable(error)) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            roblox_profile: storedProfile,
          },
        });

        if (metadataError) {
          return NextResponse.json({ error: metadataError.message }, { status: 500 });
        }

        return NextResponse.json({
          id: robloxUserId,
          displayName,
          avatarUrl,
          fallback: 'user_metadata',
        });
    }

    return NextResponse.json({
      id: robloxUserId,
      displayName,
      avatarUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Verify Roblox POST failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    // Get user's profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, roblox_user_id, roblox_user, roblox_display_name, roblox_avatar_url, roblox_verified_at, tiktok_user, link_status, rejection_reason')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      if (!isMissingProfilesTable(error)) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const metadataProfile = (user.user_metadata?.roblox_profile || null) as StoredRobloxProfile | null;

      return NextResponse.json({
        profile: metadataProfile
          ? {
              id: user.id,
              roblox_user_id: metadataProfile.roblox_user_id,
              roblox_user: metadataProfile.roblox_user,
              roblox_display_name: metadataProfile.roblox_display_name,
              roblox_avatar_url: metadataProfile.roblox_avatar_url,
              roblox_verified_at: metadataProfile.roblox_verified_at,
              tiktok_user: metadataProfile.tiktok_user || null,
              link_status: metadataProfile.link_status || 'none',
              rejection_reason: metadataProfile.rejection_reason || null,
            }
          : null,
        isComplete: metadataProfile?.link_status === 'approved',
        fallback: metadataProfile ? 'user_metadata' : null,
      });
    }

    return NextResponse.json({
      profile: data,
      isComplete: data?.link_status === 'approved',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get profile failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
