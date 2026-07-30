import type { MetadataRoute } from 'next';

const siteUrl = 'https://teampollito.milumon.dev';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/panel',
        '/panel/',
        '/acceso',
        '/overlay',
        '/api/',
        '/console',
        '/login',
        '/awards',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
