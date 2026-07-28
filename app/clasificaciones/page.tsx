import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { TikTokRankingPublicPage } from '@/components/tiktok-rankings/RankingViews';
import {
  buildPublicRankingHref,
  firstSearchParam,
  parsePublicRankingFilters,
} from '@/lib/publicRankingRoute';

export const metadata: Metadata = {
  title: 'Clasificaciones de TikTok LIVE | Team Pollito',
  description:
    'Explora las clasificaciones completas de TikTok LIVE de la comunidad con filtros compartibles en espanol.',
  alternates: {
    canonical: '/clasificaciones',
  },
  openGraph: {
    title: 'Clasificaciones de TikTok LIVE | Team Pollito',
    description:
      'Explora las clasificaciones completas de TikTok LIVE de la comunidad con filtros compartibles en espanol.',
    url: '/clasificaciones',
  },
  twitter: {
    title: 'Clasificaciones de TikTok LIVE | Team Pollito',
    description:
      'Explora las clasificaciones completas de TikTok LIVE de la comunidad con filtros compartibles en espanol.',
  },
};

type ClasificacionesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ClasificacionesPage({ searchParams }: ClasificacionesPageProps) {
  const params = await searchParams;
  const normalized = parsePublicRankingFilters({
    metrica: firstSearchParam(params.metrica),
    periodo: firstSearchParam(params.periodo),
  });
  const expectedHref = buildPublicRankingHref(normalized);
  const hasUnexpectedParams = Object.keys(params).some((key) => key !== 'metrica' && key !== 'periodo');

  if (
    firstSearchParam(params.metrica) !== normalized.metrica
    || firstSearchParam(params.periodo) !== normalized.periodo
    || hasUnexpectedParams
  ) {
    redirect(expectedHref);
  }

  return (
    <TikTokRankingPublicPage
      key={`${normalized.metric}-${normalized.period}`}
      initialMetric={normalized.metric}
      initialPeriod={normalized.period}
    />
  );
}
