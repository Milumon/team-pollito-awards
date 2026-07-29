'use client';

import { useRouter } from 'next/navigation';

import { AdminUserEditorModal } from './AdminUserEditor';

export function InterceptedUserEditor({ userId }: { userId: string }) {
  const router = useRouter();
  return <AdminUserEditorModal userId={userId} onClose={() => router.back()} />;
}
