import { AdminUsersProvider } from '@/components/admin/AdminUsersProvider';

export default function AdminUsersLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <AdminUsersProvider>
      {children}
      {modal}
    </AdminUsersProvider>
  );
}
