import { redirect } from 'next/navigation';

import { buildAccessPath } from '@/lib/authRouting';

type LoginPageProps = {
  searchParams?: Promise<{ retorno?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  redirect(buildAccessPath(params?.retorno));
}
