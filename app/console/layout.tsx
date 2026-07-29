import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { buildAccessPath } from '@/lib/authRouting';
import { getServerSession } from '@/lib/serverSession';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  if (!session) {
    redirect(buildAccessPath('/console'));
  }

  return children;
}
