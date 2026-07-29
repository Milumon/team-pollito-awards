import { AdminUserEditorPage } from '@/components/admin/AdminUserEditor';

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <AdminUserEditorPage userId={userId} />;
}
