export const RANKING_METRICS = ['viewers', 'gifts'] as const;
export const RANKING_PERIODS = ['last_live', '7_days', '28_days', '60_days'] as const;
export const RANKING_CONTRACT_VERSION = 1;

export type RankingMetric = (typeof RANKING_METRICS)[number];
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

export type TikTokRankingEntry = {
  position: number;
  tiktok_id: string;
  display_id: string;
  nickname: string;
  avatar_uri?: string | null;
  value: string;
};

export type TikTokRankingSet = {
  metric: RankingMetric;
  period: RankingPeriod;
  window: { begin: string | null; end: string | null };
  entries: TikTokRankingEntry[];
};

export type TikTokRankingBatch = {
  version: 1;
  idempotency_key: string;
  captured_at: string;
  sets: TikTokRankingSet[];
};

const DECIMAL_STRING = /^(0|[1-9]\d*)$/;
const ID = /^[a-zA-Z0-9._-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function validateTikTokRankingBatch(input: unknown): TikTokRankingBatch {
  if (!isRecord(input) || input.version !== RANKING_CONTRACT_VERSION) {
    throw new Error('Unsupported ranking contract version');
  }
  if (typeof input.idempotency_key !== 'string' || !/^[\w-]{8,128}$/.test(input.idempotency_key)) {
    throw new Error('Invalid idempotency_key');
  }
  if (!isIsoDate(input.captured_at)) throw new Error('Invalid captured_at');
  if (!Array.isArray(input.sets) || input.sets.length !== 8) {
    throw new Error('A batch must contain exactly 8 ranking sets');
  }

  const combinations = new Set<string>();
  const sets = input.sets.map((rawSet, setIndex) => {
    if (!isRecord(rawSet)) throw new Error(`Invalid ranking set at index ${setIndex}`);
    const metric = rawSet.metric;
    const period = rawSet.period;
    if (!RANKING_METRICS.includes(metric as RankingMetric) || !RANKING_PERIODS.includes(period as RankingPeriod)) {
      throw new Error(`Invalid ranking combination at index ${setIndex}`);
    }
    const combination = `${metric}:${period}`;
    if (combinations.has(combination)) throw new Error(`Duplicate ranking combination: ${combination}`);
    combinations.add(combination);

    if (!isRecord(rawSet.window)) {
      throw new Error(`Invalid source window at index ${setIndex}`);
    }
    const windowMissing = rawSet.window.begin === null && rawSet.window.end === null;
    const windowValid = isIsoDate(rawSet.window.begin) && isIsoDate(rawSet.window.end)
      && Date.parse(rawSet.window.begin) < Date.parse(rawSet.window.end);
    if (!windowMissing && !windowValid) {
      throw new Error(`Invalid source window order at index ${setIndex}`);
    }
    if (!Array.isArray(rawSet.entries) || rawSet.entries.length > 500) throw new Error(`Invalid entries at index ${setIndex}`);

    let previousPosition = 0;
    let previousValue: bigint | null = null;
    const ids = new Set<string>();
    const entries = rawSet.entries.map((rawEntry, entryIndex) => {
      if (!isRecord(rawEntry)) throw new Error(`Invalid entry at ${setIndex}:${entryIndex}`);
      const { position, tiktok_id, display_id, nickname, value } = rawEntry;
      if (typeof position !== 'number' || !Number.isSafeInteger(position) || position < 1 || position <= previousPosition) {
        throw new Error(`Entries must have strictly ascending positions at ${setIndex}:${entryIndex}`);
      }
      previousPosition = position;
      if (typeof tiktok_id !== 'string' || !DECIMAL_STRING.test(tiktok_id)) throw new Error('TikTok IDs must be decimal strings');
      if (ids.has(tiktok_id)) throw new Error(`Duplicate TikTok ID at ${setIndex}:${entryIndex}`);
      ids.add(tiktok_id);
      if (typeof display_id !== 'string' || display_id.length < 1 || display_id.length > 128 || !ID.test(display_id)) {
        throw new Error(`Invalid display_id at ${setIndex}:${entryIndex}`);
      }
      if (typeof nickname !== 'string' || nickname.length > 256) throw new Error(`Invalid nickname at ${setIndex}:${entryIndex}`);
      if (typeof value !== 'string' || !DECIMAL_STRING.test(value)) throw new Error(`Values must be decimal strings at ${setIndex}:${entryIndex}`);
      const numericValue = BigInt(value);
      if (previousValue !== null && numericValue > previousValue) throw new Error(`Values must be descending at ${setIndex}:${entryIndex}`);
      previousValue = numericValue;
      if (rawEntry.avatar_uri !== undefined && rawEntry.avatar_uri !== null && typeof rawEntry.avatar_uri !== 'string') {
        throw new Error(`Invalid avatar_uri at ${setIndex}:${entryIndex}`);
      }
      return { position, tiktok_id, display_id, nickname, avatar_uri: rawEntry.avatar_uri ?? null, value };
    });

    return { metric: metric as RankingMetric, period: period as RankingPeriod, window: rawSet.window as TikTokRankingSet['window'], entries };
  });

  if (combinations.size !== 8) throw new Error('A batch must contain all 8 ranking combinations');
  return { version: 1, idempotency_key: input.idempotency_key, captured_at: input.captured_at, sets };
}
