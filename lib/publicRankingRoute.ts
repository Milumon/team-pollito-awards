import type { RankingMetric, RankingPeriod } from '@/components/tiktok-rankings/types';

export const DEFAULT_PUBLIC_RANKING_METRIC: RankingMetric = 'viewers';
export const DEFAULT_PUBLIC_RANKING_PERIOD: RankingPeriod = 'last_live';

const PUBLIC_METRIC_TO_INTERNAL = {
  espectadores: 'viewers',
  regalos: 'gifts',
} as const satisfies Record<string, RankingMetric>;

const PUBLIC_PERIOD_TO_INTERNAL = {
  'ultimo-live': 'last_live',
  '7-dias': '7_days',
  '28-dias': '28_days',
  '60-dias': '60_days',
} as const satisfies Record<string, RankingPeriod>;

const INTERNAL_TO_PUBLIC_METRIC = {
  viewers: 'espectadores',
  gifts: 'regalos',
} as const satisfies Record<RankingMetric, string>;

const INTERNAL_TO_PUBLIC_PERIOD = {
  last_live: 'ultimo-live',
  '7_days': '7-dias',
  '28_days': '28-dias',
  '60_days': '60-dias',
} as const satisfies Record<RankingPeriod, string>;

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePublicRankingFilters(input: {
  metrica?: string | null;
  periodo?: string | null;
}) {
  const metric = input.metrica
    ? PUBLIC_METRIC_TO_INTERNAL[input.metrica as keyof typeof PUBLIC_METRIC_TO_INTERNAL] ?? DEFAULT_PUBLIC_RANKING_METRIC
    : DEFAULT_PUBLIC_RANKING_METRIC;
  const period = input.periodo
    ? PUBLIC_PERIOD_TO_INTERNAL[input.periodo as keyof typeof PUBLIC_PERIOD_TO_INTERNAL] ?? DEFAULT_PUBLIC_RANKING_PERIOD
    : DEFAULT_PUBLIC_RANKING_PERIOD;

  return {
    metric,
    period,
    metrica: INTERNAL_TO_PUBLIC_METRIC[metric],
    periodo: INTERNAL_TO_PUBLIC_PERIOD[period],
  };
}

export function buildPublicRankingHref(filters: {
  metric: RankingMetric;
  period: RankingPeriod;
}) {
  const params = new URLSearchParams({
    metrica: INTERNAL_TO_PUBLIC_METRIC[filters.metric],
    periodo: INTERNAL_TO_PUBLIC_PERIOD[filters.period],
  });

  return `/clasificaciones?${params.toString()}`;
}
