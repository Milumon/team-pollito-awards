import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/results', (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route('**/api/nominees', (route) =>
    route.fulfill({ json: { nominees: [] } }),
  );
  await page.route('**/rest/v1/categories**', (route) =>
    route.fulfill({ json: [] }),
  );
});

test('publica Premios en su URL canonica y conserva la ruta al recargar', async ({
  page,
}) => {
  await page.goto('/premios');

  await expect(page).toHaveURL('/premios');
  await expect(page).toHaveTitle('Pollitos Awards 2026 | Team Pollito');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://teampollito.milumon.dev/premios',
  );
  await expect(page.getByRole('heading', { name: /Ganadores/i })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL('/premios');
  await expect(page.getByRole('heading', { name: /Ganadores/i })).toBeVisible();
});

test('navega mediante enlaces y respeta Atras y Adelante', async ({ page }) => {
  await page.goto('/');

  await page.locator('a[href="/premios"]').click();
  await expect(page).toHaveURL('/premios');

  await page.goBack();
  await expect(page).toHaveURL('/');

  await page.goForward();
  await expect(page).toHaveURL('/premios');
});

test('vuelve a /premios despues de iniciar la autenticacion', async ({ page }) => {
  let requestedRedirectTo: string | null = null;

  await page.route('http://127.0.0.1:54321/auth/v1/authorize**', async (route) => {
    requestedRedirectTo = new URL(route.request().url()).searchParams.get('redirect_to');

    await route.fulfill({
      status: 302,
      headers: {
        location: requestedRedirectTo ?? 'http://127.0.0.1:3100/premios',
      },
    });
  });

  await page.goto('/premios');
  await page.getByRole('button', { name: /Inici.a sesi.n con Google/i }).click();
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect.poll(() => requestedRedirectTo).toBe('http://127.0.0.1:3100/premios');
  await expect(page).toHaveURL('/premios');
});

test('redirige permanentemente la ruta historica sin perder el retorno', async ({
  request,
}) => {
  const response = await request.get('/awards?retorno=%2Fpremios', {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe('/premios?retorno=%2Fpremios');
});
