import type { Metadata } from 'next';
import { forbidden, redirect } from 'next/navigation';

import { buildAccessPath } from '@/lib/authRouting';
import { getServerSession } from '@/lib/serverSession';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  if (!session) {
    redirect(buildAccessPath('/admin'));
  }

  if (!session.isAdmin) {
    forbidden();
  }

  return children;
}
