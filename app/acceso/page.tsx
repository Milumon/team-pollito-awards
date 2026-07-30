import { Suspense } from 'react';
import type { Metadata } from 'next';

import AccessPageClient from './page-client';

export const metadata: Metadata = {
  title: 'Acceso | Team Pollito',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccessPage() {
  return (
    <Suspense>
      <AccessPageClient />
    </Suspense>
  );
}
