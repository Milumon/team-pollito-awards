import assert from 'node:assert/strict';
import test from 'node:test';

import { hasSupabaseAuthCookie } from './supabaseAuthCookie.ts';

const supabaseUrl = 'https://pollito-project.supabase.co';

test('detects complete and chunked Supabase auth cookies optimistically', () => {
  assert.equal(
    hasSupabaseAuthCookie([{ name: 'sb-pollito-project-auth-token', value: 'opaque' }], supabaseUrl),
    true,
  );
  assert.equal(
    hasSupabaseAuthCookie([{ name: 'sb-pollito-project-auth-token.0', value: 'opaque' }], supabaseUrl),
    true,
  );
});

test('does not mistake PKCE verifier or unrelated cookies for a session', () => {
  assert.equal(
    hasSupabaseAuthCookie(
      [{ name: 'sb-pollito-project-auth-token-code-verifier', value: 'opaque' }],
      supabaseUrl,
    ),
    false,
  );
  assert.equal(hasSupabaseAuthCookie([{ name: 'theme', value: 'dark' }], supabaseUrl), false);
});
