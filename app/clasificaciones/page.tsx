import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { TikTokRankingPublicPage } from '@/components/tiktok-rankings/RankingViews';
import { resolvePublicRankingRoute } from '@/lib/publicRankingRoute';

export const metadata: Metadata = {
  title: 'Clasificaciones de TikTok LIVE | Team Pollito',
  description:
    'Explora las clasificaciones completas de TikTok LIVE de la comunidad con filtros compartibles en español.',
  alternates: {
    canonical: '/clasificaciones',
  },
  openGraph: {
    title: 'Clasificaciones de TikTok LIVE | Team Pollito',
    description:
      'Explora las clasificaciones completas de TikTok LIVE de la comunidad con filtros compartibles en español.',
    url: '/clasificaciones',
  },
  twitter: {
    title: 'Clasificaciones de TikTok LIVE | Team Pollito',
    description:
      'Explora las clasificaciones completas de TikTok LIVE de la comunidad con filtros compartibles en español.',
  },
};

type ClasificacionesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ClasificacionesPage({ searchParams }: ClasificacionesPageProps) {
  const params = await searchParams;
  const { redirectHref } = resolvePublicRankingRoute(params);

  if (redirectHref) {
    redirect(redirectHref);
  }

  return <TikTokRankingPublicPage />;
}
