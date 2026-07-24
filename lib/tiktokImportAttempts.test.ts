import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTikTokImportAttempt } from './tiktokImportAttempts.ts';

test('records only safe operational import metadata, never the payload', () => {
  const attempt = buildTikTokImportAttempt('validation_failed', {
    version: 1,
    idempotency_key: 'import-2026-07-24',
    captured_at: '2026-07-24T12:00:00Z',
    sets: [{ entries: [{ tiktok_id: 'secret-looking-data' }] }],
    secret: 'must not be stored',
  }, 'A batch must contain exactly 8 ranking sets');

  assert.deepEqual(attempt, {
    status: 'validation_failed',
    idempotency_key: 'import-2026-07-24',
    captured_at: '2026-07-24T12:00:00Z',
    sets_received: 1,
    sets_validated: 0,
    batch_id: null,
    error_message: 'A batch must contain exactly 8 ranking sets',
  });
  assert.equal('secret' in attempt, false);
});

test('keeps validation progress at 8/8 when publishing fails', () => {
  const attempt = buildTikTokImportAttempt('publish_failed', {
    idempotency_key: 'import-2026-07-24',
    captured_at: '2026-07-24T12:00:00Z',
    sets: Array.from({ length: 8 }, () => ({})),
  }, 'Unable to publish ranking batch');
  assert.equal(attempt.sets_received, 8);
  assert.equal(attempt.sets_validated, 8);
});
