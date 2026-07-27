import type { Metadata } from 'next';

import AwardsPage from '../awards/page';

export const metadata: Metadata = {
  title: 'Pollitos Awards 2026 | Team Pollito',
  description:
    'Explora los ganadores y la experiencia completa de Premios de Team Pollito en su URL canónica en español.',
  alternates: {
    canonical: '/premios',
  },
  openGraph: {
    title: 'Pollitos Awards 2026 | Team Pollito',
    description:
      'Explora los ganadores y la experiencia completa de Premios de Team Pollito en su URL canónica en español.',
    url: '/premios',
  },
  twitter: {
    title: 'Pollitos Awards 2026 | Team Pollito',
    description:
      'Explora los ganadores y la experiencia completa de Premios de Team Pollito en su URL canónica en español.',
  },
};

export default function PremiosPage() {
  return <AwardsPage />;
}
