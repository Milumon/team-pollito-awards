import type { Metadata } from 'next';
import { forbidden, redirect } from 'next/navigation';

import { buildAccessPath } from '@/lib/authRouting';
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
  const session = await getServerSession();

  if (!session) {
    redirect(buildAccessPath('/panel'));
  }

  if (session.linkStatus !== 'approved') {
    forbidden();
  }

  return <MemberConsole panelMode>{children}</MemberConsole>;
}
