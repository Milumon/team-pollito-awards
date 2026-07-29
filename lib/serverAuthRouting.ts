import 'server-only';

import { headers } from 'next/headers';

import { normalizeReturnPath } from './authRouting';

export const PRIVATE_RETURN_PATH_HEADER = 'x-team-pollito-return-path';

export async function getPrivateReturnPath(fallback: string) {
  const value = (await headers()).get(PRIVATE_RETURN_PATH_HEADER);
  return normalizeReturnPath(value, fallback);
}
