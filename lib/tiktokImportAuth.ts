import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export function isTikTokImportAuthorized(request: NextRequest): boolean {
  return getAuthError(request) === null;
}

export function getAuthError(request: NextRequest): string | null {
  const configuredToken = process.env.TIKTOK_IMPORT_TOKEN || '';
  const requestToken = request.headers.get('x-tiktok-import-token') || '';
  if (!configuredToken) return 'Server TIKTOK_IMPORT_TOKEN env var is not set';
  if (!requestToken) return 'Request missing x-tiktok-import-token header';
  const configured = Buffer.from(configuredToken, 'utf8');
  const received = Buffer.from(requestToken, 'utf8');
  if (configured.length !== received.length) return `Token length mismatch: server=${configured.length}, received=${received.length}`;
  if (!timingSafeEqual(configured, received)) return 'Token value mismatch';
  return null;
}
