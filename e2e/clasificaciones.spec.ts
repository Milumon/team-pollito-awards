import { expect, test } from '@playwright/test';

const metricOrder = ['viewers', 'gifts'] as const;
const periodOrder = ['last_live', '7_days', '28_days', '60_days'] as const;
const canonicalHref = 'https://teampollito.milumon.dev/clasificaciones';
const publicFilterUrls = [
  '/clasificaciones?metrica=espectadores&periodo=ultimo-live',
  '/clasificaciones?metrica=espectadores&periodo=7-dias',
  '/clasificaciones?metrica=espectadores&periodo=28-dias',
  '/clasificaciones?metrica=espectadores&periodo=60-dias',
  '/clasificaciones?metrica=regalos&periodo=ultimo-live',
  '/clasificaciones?metrica=regalos&periodo=7-dias',
  '/clasificaciones?metrica=regalos&periodo=28-dias',
  '/clasificaciones?metrica=regalos&periodo=60-dias',
];

const buildEntries = (count: number, valueBase: number) => (
  Array.from({ length: count }, (_, index) => ({
    position: index + 1,
    display_id: `usuario-${index + 1}`,
    nickname: `Usuario ${index + 1}`,
    value: String(valueBase - index),
    profile: index === 0
      ? {
          roblox_user: 'pollito-oficial',
          roblox_display_name: 'Pollito Oficial',
          roblox_avatar_url: null,
        }
      : null,
  }))
);

const rankingFixture = {
  batch_id: 'batch-publico',
  captured_at: '2026-07-26T18:30:00Z',
  sets: metricOrder.flatMap((metric) => periodOrder.map((period) => ({
    metric,
    period,
    window: {
      begin: '2026-07-19T18:30:00Z',
      end: '2026-07-26T18:30:00Z',
    },
    entries: metric === 'viewers' && period === 'last_live'
      ? buildEntries(12, 3000)
      : buildEntries(3, metric === 'gifts' ? 900 : 1200),
    me: null,
  }))),
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/members', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/interviews/slots', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/testimonials', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/tiktok/rankings/current**', (route) =>
    route.fulfill({ json: rankingFixture }),
  );
});

test('publica /clasificaciones con filtros URL compartibles y canonical fija', async ({ page }) => {
  const completeRankingRequest = page.waitForRequest(
    (request) => request.url().includes('/api/tiktok/rankings/current?limit=500'),
  );
  await page.goto('/clasificaciones?metrica=regalos&periodo=7-dias');
  await completeRankingRequest;

  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=7-dias');
  await expect(page).toHaveTitle('Clasificaciones de TikTok LIVE | Team Pollito');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Explora las clasificaciones completas de TikTok LIVE de la comunidad con filtros compartibles en español.',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    canonicalHref,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://teampollito.milumon.dev/clasificaciones',
  );
  await expect(page.getByText('Regalos · 7 días')).toBeVisible();
  await expect(page.getByText('Usuario 3')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=7-dias');
  await expect(page.getByText('Regalos · 7 días')).toBeVisible();
});

test('normaliza parametros ausentes o invalidos a una URL coherente y segura', async ({ page }) => {
  await page.goto('/clasificaciones');
  await expect(page).toHaveURL('/clasificaciones?metrica=espectadores&periodo=ultimo-live');

  await page.goto('/clasificaciones?metrica=invalida&periodo=999-dias');
  await expect(page).toHaveURL('/clasificaciones?metrica=espectadores&periodo=ultimo-live');
  await expect(page.getByText('Espectadores · Último live')).toBeVisible();

  await page.goto('/clasificaciones?metrica=regalos&metrica=espectadores&periodo=7-dias');
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=7-dias');

  await page.goto('/clasificaciones?metrica=regalos&periodo=7-dias&extra=1');
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=7-dias');
});

test('declara canonical fija en todas las variantes filtradas', async ({ page }) => {
  for (const url of publicFilterUrls) {
    await page.goto(url);
    await expect(page).toHaveURL(url);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalHref);
  }
});

test('la landing mantiene el Top 10 y enlaza a la pagina completa con historial navegable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Top 10 de TikTok LIVE' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ver clasificaciones completas/i })).toHaveAttribute(
    'href',
    '/clasificaciones?metrica=espectadores&periodo=ultimo-live',
  );
  await expect(page.getByText('Usuario 10')).toBeVisible();
  await expect(page.getByText('Usuario 11')).toHaveCount(0);

  await page.getByRole('link', { name: /Ver clasificaciones completas/i }).click();
  await expect(page).toHaveURL('/clasificaciones?metrica=espectadores&periodo=ultimo-live');
  await expect(page.getByText('Usuario 11')).toBeVisible();

  await page.getByLabel('Métrica de clasificación').selectOption('gifts');
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=ultimo-live');

  await page.getByLabel('Período de clasificación').selectOption('28_days');
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=28-dias');
  await expect(page.getByText('Regalos · 28 días')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=ultimo-live');
  await expect(page.getByText('Regalos · Último live')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalHref);

  await page.goForward();
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=28-dias');
  await expect(page.getByText('Regalos · 28 días')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalHref);
});
