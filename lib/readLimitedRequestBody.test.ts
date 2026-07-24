import assert from 'node:assert/strict';
import test from 'node:test';
import { readLimitedRequestBody, RequestBodyTooLargeError } from './readLimitedRequestBody.ts';

test('reads requests within the byte limit', async () => {
  assert.equal(await readLimitedRequestBody(new Request('https://example.com', { method: 'POST', body: 'pollito' }), 7), 'pollito');
});

test('stops streaming when a request exceeds the byte limit', async () => {
  await assert.rejects(
    readLimitedRequestBody(new Request('https://example.com', { method: 'POST', body: 'pollitos' }), 7),
    RequestBodyTooLargeError,
  );
});
