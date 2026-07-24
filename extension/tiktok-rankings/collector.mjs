export const PERIODS = {
  1: "last_live",
  2: "7_days",
  3: "28_days",
  4: "60_days",
};

export const METRICS = { 2: "gifts", 3: "viewers" };
export const COMBINATIONS = Object.values(PERIODS).flatMap((period) =>
  Object.values(METRICS).map((metric) => ({ metric, period }))
);

export function combinationFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== "webcast.tiktok.com" || url.pathname !== "/webcast/anchor/rank_list/") return null;
    const metric = METRICS[Number(url.searchParams.get("rank_type"))];
    const period = PERIODS[Number(url.searchParams.get("rank_time_type"))];
    return metric && period ? { metric, period } : null;
  } catch {
    return null;
  }
}

export function parseRankingResponseText(text) {
  return JSON.parse(text.replace(
    /(\"(?:id|value|rank_time_begin|rank_time_end)\"\s*:\s*)(-?\d+)/g,
    '$1"$2"',
  ));
}

const asString = (value, name) => {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  throw new Error(`${name} no es un entero seguro`);
};

const stableAvatarUri = (user) => {
  const uri = user?.avatar_thumb?.uri || user?.avatar_medium?.uri || user?.avatar_large?.uri;
  return typeof uri === "string" && uri.length > 0 ? uri : undefined;
};

export function normalizeResponse(raw, expected) {
  if (raw?.status_code !== 0) throw new Error(`TikTok respondio status_code=${raw?.status_code ?? "desconocido"}`);
  const rankList = raw?.data?.rank_list;
  if (!Array.isArray(rankList)) throw new Error("La respuesta no contiene rank_list");

  const first = rankList[0];
  if (first) {
    const metric = METRICS[first.rank_type];
    const period = PERIODS[first.rank_time_type];
    if (!metric || !period) throw new Error("Combinacion TikTok desconocida");
    if (metric !== expected.metric || period !== expected.period) {
      throw new Error(`Respuesta recibida para ${metric}/${period}, se esperaba ${expected.metric}/${expected.period}`);
    }
  }

  const entries = rankList.map((item, index) => {
    const user = item.user;
    const tiktokId = asString(user?.id_str ?? user?.id, "id TikTok");
    return {
      position: index + 1,
      tiktok_id: tiktokId,
      display_id: typeof user.display_id === "string" ? user.display_id : "",
      nickname: typeof user.nickname === "string" ? user.nickname : "",
      ...(stableAvatarUri(user) ? { avatar_uri: stableAvatarUri(user) } : {}),
      value: asString(item.value, "valor"),
    };
  });

  return {
    metric: expected.metric,
    period: expected.period,
    window: normalizeWindow(raw.data.rank_time_begin, raw.data.rank_time_end),
    entries,
  };
}

function optionalUnixSecondsToIso(value) {
  const seconds = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function normalizeWindow(beginValue, endValue) {
  const begin = optionalUnixSecondsToIso(beginValue);
  const end = optionalUnixSecondsToIso(endValue);
  return begin && end && Date.parse(begin) < Date.parse(end)
    ? { begin, end }
    : { begin: null, end: null };
}

export function completeSets(sets) {
  const keys = new Set(sets.map((set) => `${set.metric}/${set.period}`));
  return COMBINATIONS.every(({ metric, period }) => keys.has(`${metric}/${period}`));
}

export function buildPayload(sets, capturedAt = new Date().toISOString(), idempotencyKey = crypto.randomUUID()) {
  if (sets.length !== 8 || !completeSets(sets)) throw new Error("El batch debe contener exactamente 8 combinaciones");
  return { version: 1, idempotency_key: idempotencyKey, captured_at: capturedAt, sets };
}
