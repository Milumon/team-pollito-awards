import 'server-only';

import { forbidden, redirect } from 'next/navigation';

import { buildAccessPath } from './authRouting';
import { getPrivateReturnPath } from './serverAuthRouting';
import { getServerSession } from './serverSession';

export async function requireMemberAccess(fallback: string) {
  const [session, returnPath] = await Promise.all([
    getServerSession(),
    getPrivateReturnPath(fallback),
  ]);

  if (!session) {
    redirect(buildAccessPath(returnPath));
  }

  if (session.linkStatus !== 'approved') {
    forbidden();
  }
}
