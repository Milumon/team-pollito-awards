import assert from 'node:assert/strict';
import test from 'node:test';
import { compareHistoryPosition } from './tiktokRankingHistory.ts';

test('compares member positions only within the same metric and period', () => {
  assert.equal(compareHistoryPosition(2, 5), 'up');
  assert.equal(compareHistoryPosition(8, 3), 'down');
  assert.equal(compareHistoryPosition(4, 4), 'unchanged');
  assert.equal(compareHistoryPosition(1, null), 'entered');
  assert.equal(compareHistoryPosition(null, 4), 'exited');
  assert.equal(compareHistoryPosition(null, null), 'unchanged');
});
