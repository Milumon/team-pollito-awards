import { InterceptedUserEditor } from '@/components/admin/InterceptedUserEditor';

export default async function InterceptedAdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <InterceptedUserEditor userId={userId} />;
}
