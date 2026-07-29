import { InterceptedUserEditor } from '@/components/admin/InterceptedUserEditor';

export default async function AdminUserModalPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <InterceptedUserEditor userId={userId} />;
}
