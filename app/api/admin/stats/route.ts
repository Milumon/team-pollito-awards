import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CATEGORY_FINALISTS } from '@/src/data/categories_phase2';

function isAuthorized(request: NextRequest) {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || '';
  const requestToken = request.headers.get('x-admin-token') || '';
  return Boolean(adminToken) && requestToken === adminToken;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const phaseParam = searchParams.get('phase');
    const phase = phaseParam ? Number(phaseParam) : Number(process.env.NEXT_PUBLIC_VOTING_PHASE || 1);

    // 1. Fetch categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, title, emoji, description')
      .order('id', { ascending: true });

    if (catError) throw new Error(catError.message);

    // 2. Fetch nominees
    const { data: nominees, error: nomError } = await supabaseAdmin
      .from('nominees')
      .select('id, nickname, profile_image_url, is_visible, roblox_user, roblox_user_id');

    if (nomError) throw new Error(nomError.message);

    // 3. Fetch votes filtered by phase
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('user_id, category_id, nominee_id')
      .eq('phase', phase);

    if (votesError) throw new Error(votesError.message);

    // 4. Fetch profiles (might fail if the table profiles doesn't exist yet, so handle gracefully)
    const { data: profiles, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('id, roblox_user, roblox_display_name, roblox_avatar_url, roblox_verified_at');

    const hasProfilesTable = !profError;
    const profilesList = hasProfilesTable ? (profiles || []) : [];

    // 5. Fetch auth users
    const { data: { users: authUsers }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    if (authUsersError) throw new Error(authUsersError.message);

    // --- PROCESS VOTE STATS ---
    const voteCounts: Record<number, Record<string, number>> = {};
    categories.forEach((cat: any) => {
      voteCounts[cat.id] = {};
    });

    votes?.forEach((vote: any) => {
      const catId = Number(vote.category_id);
      const nomId = String(vote.nominee_id);
      if (voteCounts[catId]) {
        voteCounts[catId][nomId] = (voteCounts[catId][nomId] || 0) + 1;
      }
    });

    const categoryStats = categories.map((cat: any) => {
      const allowedNomineeIds = phase === 2 ? (CATEGORY_FINALISTS[cat.id] || []) : null;

      // Get vote counts for all nominees in this category
      const nomineesVotes = nominees
        .filter((nom: any) => !allowedNomineeIds || allowedNomineeIds.includes(nom.id))
        .map((nom: any) => {
          const count = voteCounts[cat.id]?.[nom.id] || 0;
          return {
            id: nom.id,
            nickname: nom.nickname || nom.display_name || nom.roblox_user || 'Pollito',
            profile_image_url: nom.profile_image_url,
            roblox_user: nom.roblox_user,
            votes: count,
          };
        })
        .sort((a: any, b: any) => b.votes - a.votes);

      const totalCategoryVotes = nomineesVotes.reduce((sum: number, n: any) => sum + n.votes, 0);

      return {
        id: cat.id,
        title: cat.title,
        emoji: cat.emoji,
        totalVotes: totalCategoryVotes,
        nominees: nomineesVotes,
      };
    });

    // --- PROCESS USER LIST ---
    const processedUsers = authUsers.map((authUser: any) => {
      let robloxProfile = profilesList.find((p: any) => p.id === authUser.id);
      
      // Fallback to auth metadata
      if (!robloxProfile && authUser.user_metadata?.roblox_profile) {
        const metaProfile = authUser.user_metadata.roblox_profile;
        robloxProfile = {
  id: metaProfile.id ?? authUser.id,   // ← agregar esta línea
  roblox_user: metaProfile.roblox_user,
  roblox_display_name: metaProfile.roblox_display_name,
  roblox_avatar_url: metaProfile.roblox_avatar_url,
  roblox_verified_at: metaProfile.roblox_verified_at,
};
      }

      const userVotes = votes?.filter((v: any) => v.user_id === authUser.id) || [];
      const votedCategoriesCount = userVotes.length;

      return {
        id: authUser.id,
        email: authUser.email || 'N/A',
        createdAt: authUser.created_at,
        lastSignInAt: authUser.last_sign_in_at,
        hasVerifiedRoblox: !!robloxProfile,
        robloxUser: robloxProfile?.roblox_user || null,
        robloxDisplayName: robloxProfile?.roblox_display_name || null,
        robloxAvatarUrl: robloxProfile?.roblox_avatar_url || null,
        robloxVerifiedAt: robloxProfile?.roblox_verified_at || null,
        votedCount: votedCategoriesCount,
        totalCategories: categories.length,
        votedPercentage: Math.round((votedCategoriesCount / categories.length) * 100),
      };
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Summary
    const totalUsersCount = authUsers.length;
    const verifiedUsersCount = processedUsers.filter((u: any) => u.hasVerifiedRoblox).length;
    const totalVotesCount = votes?.length || 0;
    const completedVotersCount = processedUsers.filter((u: any) => u.votedCount >= categories.length).length;

    return NextResponse.json({
      summary: {
        totalUsers: totalUsersCount,
        verifiedUsers: verifiedUsersCount,
        totalVotes: totalVotesCount,
        completedVoters: completedVotersCount,
      },
      categoryStats,
      users: processedUsers,
    });

  } catch (err: any) {
    console.error('Stats endpoint failed:', err);
    return NextResponse.json({ error: err.message || 'Error desconocido' }, { status: 500 });
  }
}
