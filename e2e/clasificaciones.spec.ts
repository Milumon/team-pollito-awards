import { expect, test } from '@playwright/test';

const metricOrder = ['viewers', 'gifts'] as const;
const periodOrder = ['last_live', '7_days', '28_days', '60_days'] as const;
const canonicalHref = 'https://teampollito.milumon.dev/clasificaciones';
const publicFilterUrls = [
  '/clasificaciones',
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

test('sirve la canonical con defaults seguros sin redirigir y conserva la URL al recargar', async ({ page, request }) => {
  const response = await request.get('/clasificaciones', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers().location).toBeUndefined();

  await page.goto('/clasificaciones');
  await expect(page).toHaveURL('/clasificaciones');
  await expect(page.getByText('Espectadores · Último live')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL('/clasificaciones');
  await expect(page.getByText('Espectadores · Último live')).toBeVisible();
});

test('normaliza parametros invalidos o repetidos a una URL coherente y segura', async ({ page }) => {
  await page.goto('/clasificaciones?metrica=espectadores&periodo=ultimo-live');
  await expect(page).toHaveURL('/clasificaciones');

  await page.goto('/clasificaciones?metrica=invalida&periodo=999-dias');
  await expect(page).toHaveURL('/clasificaciones');
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

test('aplica el Design DNA y la terminologia del dominio en la pagina publica', async ({ page }) => {
  await page.goto('/clasificaciones');

  const card = page.locator('main section');
  const heading = page.getByRole('heading', { name: 'Clasificaciones de TikTok LIVE' });
  const firstRow = page.getByText('Usuario 1', { exact: true }).locator('xpath=ancestor::div[contains(@class,"border-3")][1]');
  const secondRow = page.getByText('Usuario 2', { exact: true }).locator('xpath=ancestor::div[contains(@class,"border-3")][1]');
  await expect(card).toHaveClass(/border-3/);
  await expect(card).toHaveClass(/brutalist-shadow/);
  await expect(page.locator('main')).toHaveCSS('font-family', /Inter/);
  await expect(page.getByText('Clasificaciones', { exact: true })).toHaveClass(/bg-\[#FFD500\]/);
  await expect(heading).toHaveClass(/uppercase/);
  await expect(heading).toHaveCSS('font-family', /Anton/);
  await expect(page.getByRole('link', { name: /Volver a la comunidad/i })).toHaveClass(/rounded-2xl/);
  await expect(firstRow).toHaveClass(/border-3/);
  await expect(firstRow).toHaveClass(/shadow-\[6px_6px_0_0_#000\]/);
  await expect(firstRow.getByText('♪').locator('..')).toHaveClass(/rounded-2xl/);
  await expect(firstRow.getByText('Miembro Oficial')).toHaveClass(/bg-\[#FFD500\]/);
  await expect(firstRow.getByText('0 min', { exact: true })).toHaveCSS('font-family', /Inter/);
  await expect(secondRow).toHaveClass(/border-3/);
  await expect(secondRow).toHaveClass(/bg-white/);
  await expect(secondRow).toHaveClass(/shadow-\[6px_6px_0_0_#000\]/);
  await expect(page.getByText('Snapshot de Ranking publicado', { exact: false })).toBeVisible();
});

test('aplica el Design DNA a los estados de carga y vacio publicos', async ({ page }) => {
  let releaseResponse = () => {};
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/tiktok/rankings/current**', async (route) => {
    await responseGate;
    await route.fulfill({ json: { batch_id: null, captured_at: null, sets: [] } });
  });

  await page.goto('/clasificaciones');
  const loading = page.getByText('Cargando Snapshot de Ranking...');
  await expect(loading).toBeVisible();
  await expect(loading).toHaveClass(/border-3/);
  await expect(loading).toHaveClass(/shadow-\[6px_6px_0_0_#000\]/);

  releaseResponse();
  const emptyTitle = page.getByText('Aún no hay Snapshot de Ranking publicado');
  await expect(emptyTitle).toBeVisible();
  await expect(emptyTitle).toHaveCSS('font-family', /Anton/);
  await expect(emptyTitle.locator('..')).toHaveClass(/border-3/);
  await expect(emptyTitle.locator('..')).toHaveClass(/bg-\[#FFD500\]/);
});

test('aplica el Design DNA al estado de error publico', async ({ page }) => {
  await page.route('**/api/tiktok/rankings/current**', (route) => route.fulfill({
    status: 500,
    json: { error: 'No disponible' },
  }));

  await page.goto('/clasificaciones');
  const errorTitle = page.getByText('No se pudo cargar el Snapshot de Ranking');
  await expect(errorTitle).toBeVisible();
  await expect(errorTitle).toHaveCSS('font-family', /Anton/);
  await expect(errorTitle.locator('..')).toHaveClass(/rounded-2xl/);
  await expect(errorTitle.locator('..')).toHaveClass(/border-3/);
  await expect(errorTitle.locator('..')).toHaveClass(/bg-\[#FFD500\]/);
  await expect(errorTitle.locator('..')).toHaveClass(/shadow-\[6px_6px_0_0_#000\]/);
});

test('usa el termino de dominio en un periodo sin actividad', async ({ page }) => {
  await page.route('**/api/tiktok/rankings/current**', (route) => route.fulfill({
    json: {
      ...rankingFixture,
      sets: rankingFixture.sets.map((set) => set.metric === 'viewers' && set.period === 'last_live'
        ? { ...set, entries: [] }
        : set),
    },
  }));

  await page.goto('/clasificaciones');
  await expect(page.getByText('Snapshot de Ranking sin actividad en este período')).toBeVisible();
});

test('la landing mantiene el Top 10 y enlaza a la pagina completa con historial navegable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Top 10 de TikTok LIVE' })).toBeVisible();
  await expect(page.getByText('Miembro', { exact: true })).toBeVisible();
  await expect(page.getByText('Miembro Oficial', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Ver clasificaciones completas/i })).toHaveAttribute(
    'href',
    '/clasificaciones',
  );
  await expect(page.getByText('Usuario 10')).toBeVisible();
  await expect(page.getByText('Usuario 11')).toHaveCount(0);

  await page.getByRole('link', { name: /Ver clasificaciones completas/i }).click();
  await expect(page).toHaveURL('/clasificaciones');
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

  await page.goBack();
  await expect(page).toHaveURL('/clasificaciones');
  await expect(page.getByText('Espectadores · Último live')).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=ultimo-live');
  await expect(page.getByText('Regalos · Último live')).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL('/clasificaciones?metrica=regalos&periodo=28-dias');
  await expect(page.getByText('Regalos · 28 días')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalHref);
});
