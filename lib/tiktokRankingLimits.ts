// Every accepted Ranking Snapshot fits in one RPC response at this limit.
// Keep this aligned with get_current_tiktok_rankings in the Supabase migrations.
export const MAX_RANKING_ENTRIES_PER_SNAPSHOT = 500;
