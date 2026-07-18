import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

type Profile = {
  id: string;
  roblox_user: string | null;
  roblox_display_name: string | null;
  roblox_avatar_url: string | null;
  link_status: string | null;
};

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - daysSinceMonday);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

export async function GET(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const weekStart = getWeekStart();
    const [
      { data: authData, error: authError },
      { data: profiles, error: profilesError },
      { data: events, error: eventsError },
      { data: sounds, error: soundsError },
      { count: pendingSoundSubmissions, error: pendingSoundError },
      { count: pendingMediaSubmissions, error: pendingMediaError },
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from('profiles')
        .select('id, roblox_user, roblox_display_name, roblox_avatar_url, link_status'),
      supabaseAdmin
        .from('stream_events')
        .select('user_id, type, content, sender_roblox_user, sender_avatar_url, created_at')
        .gte('created_at', weekStart)
        .not('user_id', 'is', null),
      supabaseAdmin
        .from('soundboard_sounds')
        .select('id, name, media_type, owner_user_id')
        .not('owner_user_id', 'is', null),
      supabaseAdmin
        .from('sound_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseAdmin
        .from('media_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    if (authError) throw authError;
    if (profilesError) throw profilesError;
    if (eventsError) throw eventsError;
    if (soundsError) throw soundsError;
    if (pendingSoundError) throw pendingSoundError;
    if (pendingMediaError) throw pendingMediaError;

    const authUsers = authData.users ?? [];
    const profileMap = new Map((profiles as Profile[] ?? []).map((profile) => [profile.id, profile]));
    const weekEvents = events ?? [];
    const soundMap = new Map((sounds ?? []).map((sound) => [sound.id, sound]));

    const topUsersMap = new Map<string, { userId: string; name: string; avatarUrl: string | null; count: number }>();
    for (const event of weekEvents) {
      const profile = profileMap.get(event.user_id);
      const current = topUsersMap.get(event.user_id) ?? {
        userId: event.user_id,
        name: profile?.roblox_display_name || profile?.roblox_user || event.sender_roblox_user || 'Pollito',
        avatarUrl: profile?.roblox_avatar_url || event.sender_avatar_url,
        count: 0,
      };
      current.count += 1;
      topUsersMap.set(event.user_id, current);
    }

    const topSoundsMap = new Map<string, { soundId: string; name: string; count: number }>();
    for (const event of weekEvents) {
      if (event.type !== 'sound' && event.type !== 'audio') continue;
      const sound = soundMap.get(event.content);
      const current = topSoundsMap.get(event.content) ?? {
        soundId: event.content,
        name: sound?.name || event.content,
        count: 0,
      };
      current.count += 1;
      topSoundsMap.set(event.content, current);
    }

    const uploadMap = new Map<string, { userId: string; name: string; avatarUrl: string | null; count: number }>();
    for (const sound of sounds ?? []) {
      if (!sound.owner_user_id) continue;
      const profile = profileMap.get(sound.owner_user_id);
      const current = uploadMap.get(sound.owner_user_id) ?? {
        userId: sound.owner_user_id,
        name: profile?.roblox_display_name || profile?.roblox_user || 'Pollito',
        avatarUrl: profile?.roblox_avatar_url || null,
        count: 0,
      };
      current.count += 1;
      uploadMap.set(sound.owner_user_id, current);
    }

    const recentAccesses = [...authUsers]
      .filter((user) => user.last_sign_in_at)
      .sort((a, b) => new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime())
      .slice(0, 8)
      .map((user) => {
        const profile = profileMap.get(user.id);
        return {
          userId: user.id,
          email: user.email || 'Sin email',
          name: profile?.roblox_display_name || profile?.roblox_user || user.email || 'Usuario',
          avatarUrl: profile?.roblox_avatar_url || null,
          lastSignInAt: user.last_sign_in_at,
        };
      });

    const topUsers = [...topUsersMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const topSounds = [...topSoundsMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const topUploads = [...uploadMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    return NextResponse.json({
      weekStart,
      summary: {
        totalUsers: authUsers.length,
        approvedUsers: (profiles as Profile[] ?? []).filter((profile) => profile.link_status === 'approved').length,
        newUsers: authUsers.filter((user) => new Date(user.created_at) >= new Date(weekStart)).length,
        interactions: weekEvents.length,
        pendingApplications: (profiles as Profile[] ?? []).filter((profile) => profile.link_status === 'pending').length,
        pendingUploads: (pendingSoundSubmissions ?? 0) + (pendingMediaSubmissions ?? 0),
      },
      recentAccesses,
      topUsers,
      topSounds,
      topUploads,
    });
  } catch (error) {
    console.error('[Admin Dashboard Error]:', error);
    const message = error instanceof Error ? error.message : 'Error al cargar el dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
