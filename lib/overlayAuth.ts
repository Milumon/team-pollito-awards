import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export function isOverlayAuthorized(request: NextRequest): boolean {
  const configuredToken = process.env.OVERLAY_TOKEN || '';
  const requestToken = request.headers.get('x-overlay-token') || '';
  const configuredBuffer = Buffer.from(configuredToken);
  const requestBuffer = Buffer.from(requestToken);

  if (!configuredToken || configuredBuffer.length !== requestBuffer.length) {
    return false;
  }

  return timingSafeEqual(configuredBuffer, requestBuffer);
}
