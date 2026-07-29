import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';

import { AdminShell } from '@/components/admin/AdminShell';
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

  if (session && !session.isAdmin) {
    forbidden();
  }

  return (
    <AdminShell adminEmail={session?.user?.email || 'Administrador'}>
      {children}
    </AdminShell>
  );
}
