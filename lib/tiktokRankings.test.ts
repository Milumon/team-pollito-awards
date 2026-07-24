import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTikTokRankingBatch } from './tiktokRankings.ts';
import { buildPayload } from '../extension/tiktok-rankings/collector.mjs';

const sets = ['viewers', 'gifts'].flatMap((metric) => ['last_live', '7_days', '28_days', '60_days'].map((period) => ({
  metric, period, window: { begin: '2026-07-01T00:00:00Z', end: '2026-07-02T00:00:00Z' },
  entries: [{ position: 1, tiktok_id: '9007199254740993', display_id: 'pollito', nickname: 'Pollito', value: '18446744073709551616' }],
})));

const fixture = () => ({ version: 1, idempotency_key: 'import-2026-07-24', captured_at: '2026-07-24T12:00:00Z', sets });

test('accepts the compact 8/8 fixture and preserves unsafe integers as strings', () => {
  const batch = validateTikTokRankingBatch(fixture());
  assert.equal(batch.sets.length, 8);
  assert.equal(batch.sets[0].entries[0].tiktok_id, '9007199254740993');
  assert.equal(batch.sets[0].entries[0].value, '18446744073709551616');
});

test('rejects a missing or duplicated combination atomically before persistence', () => {
  assert.throws(() => validateTikTokRankingBatch({ ...fixture(), sets: sets.slice(0, 7) }));
  assert.throws(() => validateTikTokRankingBatch({ ...fixture(), sets: sets.map((set, i) => i === 7 ? { ...set, metric: 'viewers' } : set) }));
});

test('accepts the payload emitted by the Chrome extension contract', () => {
  const batch = validateTikTokRankingBatch(buildPayload(sets, '2026-07-24T12:00:00Z', 'extension-import'));
  assert.equal(batch.version, 1);
  assert.equal(batch.sets.length, 8);
});

test('accepts a missing source window for the last live period', () => {
  const input = {
    ...fixture(),
    sets: sets.map((set) => set.period === 'last_live'
      ? { ...set, window: { begin: null, end: null } }
      : set),
  };
  assert.equal(validateTikTokRankingBatch(input).sets.filter((set) => set.period === 'last_live').length, 2);
});
