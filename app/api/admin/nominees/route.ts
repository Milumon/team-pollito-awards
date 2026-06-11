import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isAuthorized(request: NextRequest) {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || '';
  const requestToken = request.headers.get('x-admin-token') || '';
  return Boolean(adminToken) && requestToken === adminToken;
}

async function enrichNomineeDisplayName(nominee: {
  roblox_user_id: number | string | null;
  roblox_user: string;
  nickname: string | null;
  profile_image_url: string;
  [key: string]: unknown;
}) {
  const numericId = Number(nominee.roblox_user_id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return {
      ...nominee,
      display_name: nominee.roblox_user,
    };
  }

  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${numericId}`);
    if (!response.ok) {
      return {
        ...nominee,
        display_name: nominee.roblox_user,
      };
    }

    const profile = await response.json();
    return {
      ...nominee,
      display_name: String(profile?.displayName || profile?.name || nominee.roblox_user || ''),
    };
  } catch {
    return {
      ...nominee,
      display_name: nominee.roblox_user,
    };
  }
}

async function loadAllCategoryIds() {
  const { data, error } = await supabaseAdmin.from('categories').select('id').order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => row.id).filter((id) => Number.isFinite(Number(id)));
}

async function upsertAllCategoryAssignments(nomineeId: string) {
  const categoryIds = await loadAllCategoryIds();

  if (!categoryIds.length) {
    return 0;
  }

  const rows = categoryIds.map((categoryId) => ({ nominee_id: nomineeId, category_id: categoryId }));
  const { error } = await supabaseAdmin
    .from('nominee_categories')
    .upsert(rows, { onConflict: 'nominee_id,category_id' });

  if (error) {
    throw new Error(error.message);
  }

  return rows.length;
}

async function fetchRobloxProfile(userId: number) {
  const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function fetchRobloxAvatar(userId: number) {
  const response = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const item = payload?.data?.[0];
  return item?.state === 'Completed' ? item.imageUrl || null : null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const query = supabaseAdmin
    .from('nominees')
    .select('id, category_id, roblox_user_id, roblox_user, nickname, is_visible, profile_image_url, created_at')
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nominees = await Promise.all((data || []).map((nominee) => enrichNomineeDisplayName(nominee)));

  return NextResponse.json({ nominees });
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const friendId = Number(body.friendId ?? body.robloxUserId ?? body.userId);
    const nicknameInput = String(body.nickname || '').trim();

    if (!Number.isFinite(friendId) || friendId <= 0) {
      return NextResponse.json({ error: 'friendId inválido' }, { status: 400 });
    }

    const profile = await fetchRobloxProfile(friendId);
    if (!profile) {
      return NextResponse.json({ error: 'No se pudo leer el perfil de Roblox' }, { status: 404 });
    }

    const robloxUser = String(profile?.name || `user-${friendId}`).trim();
    const displayName = String(profile?.displayName || robloxUser || `user-${friendId}`).trim();

    const existingResponse = await supabaseAdmin
      .from('nominees')
      .select('id, nickname, profile_image_url')
      .eq('roblox_user_id', friendId)
      .maybeSingle();

    if (existingResponse.error) {
      return NextResponse.json({ error: existingResponse.error.message }, { status: 500 });
    }

    const profileImageUrl = existingResponse.data?.profile_image_url || (await fetchRobloxAvatar(friendId)) || '';
    const nickname = nicknameInput.length > 0 ? nicknameInput : existingResponse.data?.nickname || displayName || robloxUser;

    const { data, error } = await supabaseAdmin
      .from('nominees')
      .upsert(
        {
          roblox_user_id: friendId,
          roblox_user: robloxUser,
          nickname,
          profile_image_url: profileImageUrl,
        },
        { onConflict: 'roblox_user_id' }
      )
      .select('id, category_id, roblox_user_id, roblox_user, nickname, is_visible, profile_image_url, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await upsertAllCategoryAssignments(data.id);

    const nominee = await enrichNomineeDisplayName(data);

    return NextResponse.json({
      nominee,
      created: !existingResponse.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown manual nominee error';
    console.error('Manual nominee POST failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const id = String(body.id || '').trim();

  if (!id) {
    return NextResponse.json({ error: 'Missing nominee id' }, { status: 400 });
  }

  const updates: Record<string, string | number | boolean | null> = {};

  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
    const categoryId = Number(body.categoryId);
    if (Number.isFinite(categoryId) && categoryId > 0) {
      updates.category_id = categoryId;
    }
  }

  if (body.nickname !== undefined) {
    const nickname = String(body.nickname || '').trim();
    updates.nickname = nickname.length > 0 ? nickname : null;
  }

  if (body.isVisible !== undefined) {
    updates.is_visible = Boolean(body.isVisible);
  }

  const { data, error } = await supabaseAdmin
    .from('nominees')
    .update(updates)
    .eq('id', id)
    .select('id, category_id, roblox_user_id, roblox_user, nickname, is_visible, profile_image_url, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ nominee: await enrichNomineeDisplayName(data) });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const id = String(body.id || '').trim();

  if (!id) {
    return NextResponse.json({ error: 'Missing nominee id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('nominees').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}