import { expect, test } from '@playwright/test';

const siteUrl = 'https://teampollito.milumon.dev';

test('publica solamente las rutas publicas canonicas en sitemap', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  const body = await response.text();

  expect(response.ok()).toBe(true);
  expect([...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])).toEqual([
    siteUrl,
    `${siteUrl}/premios`,
    `${siteUrl}/clasificaciones`,
  ]);
  expect(body).not.toContain('/admin');
  expect(body).not.toContain('/panel');
  expect(body).not.toContain('/overlay');
  expect(body).not.toContain('/acceso');
});

test('excluye superficies privadas, utilitarias y tecnicas en robots', async ({ request }) => {
  const response = await request.get('/robots.txt');
  const body = await response.text();

  expect(response.ok()).toBe(true);
  expect(body).toContain('Allow: /');
  for (const path of ['/admin', '/admin/', '/panel', '/panel/', '/acceso', '/overlay', '/api/']) {
    expect(body).toContain(`Disallow: ${path}`);
  }
  expect(body).toContain(`Sitemap: ${siteUrl}/sitemap.xml`);
});

test('mantiene metadata canonica en rutas publicas y noindex en privadas', async ({ page }) => {
  await page.route('**/api/tiktok/rankings/**', async (route) => {
    await route.fulfill({ json: { batch_id: null, sets: [], history: [] } });
  });

  for (const path of ['/', '/premios', '/clasificaciones?metrica=espectadores&periodo=ultimo-live']) {
    await page.goto(path);
    const canonicalPath = path.split('?')[0];
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      canonicalPath === '/' ? siteUrl : `${siteUrl}${canonicalPath}`,
    );
  }

  await page.goto('/acceso');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
