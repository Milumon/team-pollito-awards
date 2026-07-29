import { AdminUsersProvider } from '@/components/admin/AdminUsersProvider';

export default function AdminUsersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminUsersProvider>
      {children}
    </AdminUsersProvider>
  );
}
