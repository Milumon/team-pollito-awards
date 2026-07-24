import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export function isTikTokImportAuthorized(request: NextRequest): boolean {
  const configuredToken = process.env.TIKTOK_IMPORT_TOKEN || '';
  const requestToken = request.headers.get('x-tiktok-import-token') || '';
  const configured = Buffer.from(configuredToken, 'utf8');
  const received = Buffer.from(requestToken, 'utf8');
  return configured.length > 0 && configured.length === received.length && timingSafeEqual(configured, received);
}
