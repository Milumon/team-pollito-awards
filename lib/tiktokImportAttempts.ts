export type TikTokImportAttemptStatus = 'validation_failed' | 'publish_failed' | 'published' | 'replayed';

export type TikTokImportAttempt = {
  status: TikTokImportAttemptStatus;
  idempotency_key: string | null;
  captured_at: string | null;
  sets_received: number;
  sets_validated: number;
  batch_id: string | null;
  error_message: string | null;
};

const SAFE_IDEMPOTENCY_KEY = /^[\w-]{8,128}$/;

export function buildTikTokImportAttempt(
  status: TikTokImportAttemptStatus,
  input: unknown,
  errorMessage: string | null = null,
  batchId: string | null = null,
): TikTokImportAttempt {
  const record = typeof input === 'object' && input !== null && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null;
  const sets = record?.sets;
  const setsReceived = Array.isArray(sets) ? Math.min(8, sets.length) : 0;
  const idempotencyKey = typeof record?.idempotency_key === 'string' && SAFE_IDEMPOTENCY_KEY.test(record.idempotency_key)
    ? record.idempotency_key
    : null;
  const capturedAt = typeof record?.captured_at === 'string' && !Number.isNaN(Date.parse(record.captured_at))
    ? record.captured_at
    : null;

  return {
    status,
    idempotency_key: idempotencyKey,
    captured_at: capturedAt,
    sets_received: setsReceived,
    sets_validated: status === 'publish_failed' || status === 'published' || status === 'replayed' ? 8 : 0,
    batch_id: batchId,
    error_message: errorMessage ? errorMessage.slice(0, 240) : null,
  };
}
