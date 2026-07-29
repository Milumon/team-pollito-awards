import type { Metadata } from 'next';
import { forbidden, redirect } from 'next/navigation';

import { buildAccessPath } from '@/lib/authRouting';
import { getPrivateReturnPath } from '@/lib/serverAuthRouting';
import { getServerSession } from '@/lib/serverSession';
import MemberConsole from '@/components/console/MemberConsole';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MemberPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, returnPath] = await Promise.all([
    getServerSession(),
    getPrivateReturnPath('/panel'),
  ]);

  if (!session) {
    redirect(buildAccessPath(returnPath));
  }

  if (session.linkStatus !== 'approved') {
    forbidden();
  }

  return <MemberConsole initialSession={session.authSession} panelMode>{children}</MemberConsole>;
}
