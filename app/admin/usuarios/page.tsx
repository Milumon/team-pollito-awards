import { Suspense } from 'react';
import { AdminUsersList } from '@/components/admin/AdminUsersList';

export default function AdminUsersPage() {
  return <Suspense><AdminUsersList /></Suspense>;
}
