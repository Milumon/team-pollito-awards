import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CATEGORY_FINALISTS } from '@/src/data/categories_phase2';

export async function GET(request: NextRequest) {
  try {
    const phase = Number(process.env.NEXT_PUBLIC_VOTING_PHASE || 2);

    // 1. Fetch categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, title, emoji, description')
      .order('id', { ascending: true });

    if (catError) throw new Error(catError.message);

    // 2. Fetch nominees
    const { data: nominees, error: nomError } = await supabaseAdmin
      .from('nominees')
      .select('id, nickname, profile_image_url, is_visible, roblox_user');

    if (nomError) throw new Error(nomError.message);

    // 3. Fetch votes filtered by phase
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('category_id, nominee_id')
      .eq('phase', phase);

    if (votesError) throw new Error(votesError.message);

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
            nickname: nom.nickname || nom.roblox_user || 'Pollito',
            profile_image_url: nom.profile_image_url,
            roblox_user: nom.roblox_user,
            votes: count,
          };
        });

      // Override sorting for MVP (ID 1) to make Uvita the winner
      if (cat.id === 1) {
        nomineesVotes.sort((a: any, b: any) => {
          if (a.id === '852e1e42-a8da-4a8d-89e6-b3591e714784') return -1;
          if (b.id === '852e1e42-a8da-4a8d-89e6-b3591e714784') return 1;
          return b.votes - a.votes;
        });
      } else {
        nomineesVotes.sort((a: any, b: any) => b.votes - a.votes);
      }

      const totalCategoryVotes = nomineesVotes.reduce((sum: number, n: any) => sum + n.votes, 0);

      return {
        id: cat.id,
        title: cat.title,
        emoji: cat.emoji,
        description: cat.description,
        totalVotes: totalCategoryVotes,
        nominees: nomineesVotes,
      };
    });

    return NextResponse.json({ results: categoryStats });

  } catch (err: any) {
    console.error('Public results endpoint failed:', err);
    return NextResponse.json({ error: err.message || 'Error desconocido' }, { status: 500 });
  }
}
