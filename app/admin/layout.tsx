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
  let session = null;
  try {
    session = await getServerSession();
  } catch {
    // Auth is gated by proxy.ts; tolerate RSC re-render failures.
  }

  if (session && !session.isAdmin) {
    forbidden();
  }

  return (
    <AdminShell adminEmail={session?.user?.email || 'Administrador'}>
      {children}
    </AdminShell>
  );
}
