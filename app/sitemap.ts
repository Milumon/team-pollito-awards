import type { MetadataRoute } from 'next';

const siteUrl = 'https://teampollito.milumon.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/premios', '/clasificaciones'].map((path) => ({
    url: `${siteUrl}${path}`,
  }));
}
