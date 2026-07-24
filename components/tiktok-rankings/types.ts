export const RANKING_METRICS = ['viewers', 'gifts'] as const;
export const RANKING_PERIODS = ['last_live', '7_days', '28_days', '60_days'] as const;

export type RankingMetric = (typeof RANKING_METRICS)[number];
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

export type LinkedMember = {
  roblox_user: string;
  roblox_display_name: string;
  roblox_avatar_url: string | null;
};

export type RankingEntry = {
  position: number;
  display_id: string;
  nickname: string;
  value: string;
  profile?: LinkedMember | null;
};

export type RankingSet = {
  metric: RankingMetric;
  period: RankingPeriod;
  window: { begin: string | null; end: string | null };
  entries: RankingEntry[];
  me: RankingEntry | null;
};

export type CurrentRankings = {
  batch_id: string | null;
  captured_at: string | null;
  sets: RankingSet[];
};

export type RankingsState = {
  data: CurrentRankings | null;
  loading: boolean;
  error: string | null;
};

export const METRIC_LABELS: Record<RankingMetric, string> = {
  viewers: 'Espectadores',
  gifts: 'Regalos',
};

export const PERIOD_LABELS: Record<RankingPeriod, string> = {
  last_live: 'Último live',
  '7_days': '7 días',
  '28_days': '28 días',
  '60_days': '60 días',
};
