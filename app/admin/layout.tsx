import type { Metadata } from 'next';
import { forbidden, redirect } from 'next/navigation';

import { buildAccessPath } from '@/lib/authRouting';
import { AdminShell } from '@/components/admin/AdminShell';
import { getPrivateReturnPath } from '@/lib/serverAuthRouting';
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
  const [session, returnPath] = await Promise.all([
    getServerSession(),
    getPrivateReturnPath('/admin'),
  ]);

  if (!session) {
    redirect(buildAccessPath(returnPath));
  }

  if (!session.isAdmin) {
    forbidden();
  }

  return (
    <AdminShell adminEmail={session.user.email || 'Administrador'}>
      {children}
    </AdminShell>
  );
}
