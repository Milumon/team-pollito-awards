import type { Metadata } from 'next';

import { requireMemberAccess } from '@/lib/memberPanelAuth';
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
  await requireMemberAccess('/panel');

  return <MemberConsole panelMode>{children}</MemberConsole>;
}
