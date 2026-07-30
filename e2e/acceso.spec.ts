import { createServer } from 'node:http';

import { expect, test, type Page } from '@playwright/test';

const baseUrl = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || 3100}`;
const supabasePort = Number(process.env.PLAYWRIGHT_SUPABASE_PORT || 54321);
const supabaseUrl = `http://127.0.0.1:${supabasePort}`;

const authFixtures = {
  'member-code': {
    accessToken: 'member-access-token',
    refreshToken: 'member-refresh-token',
    user: {
      id: 'user-1',
      email: 'miembro@test.dev',
    },
    profile: {
      is_admin: false,
      link_status: 'approved',
    },
  },
  'admin-code': {
    accessToken: 'admin-access-token',
    refreshToken: 'admin-refresh-token',
    user: {
      id: 'admin-1',
      email: 'admin@test.dev',
    },
    profile: {
      is_admin: true,
      link_status: 'approved',
    },
  },
  'pending-code': {
    accessToken: 'pending-access-token',
    refreshToken: 'pending-refresh-token',
    user: {
      id: 'pending-1',
      email: 'pendiente@test.dev',
    },
    profile: {
      is_admin: false,
      link_status: 'pending',
    },
  },
  'refresh-code': {
    accessToken: 'expired-access-token',
    refreshToken: 'refreshable-refresh-token',
    user: {
      id: 'refresh-user-1',
      email: 'refresh@test.dev',
    },
    profile: {
      is_admin: false,
      link_status: 'approved',
    },
  },
} as const;

const authByAccessToken = new Map<string, (typeof authFixtures)[keyof typeof authFixtures]>(
  Object.values(authFixtures).map((fixture) => [fixture.accessToken, fixture]),
);
const rejectedAccessTokens = new Set<string>();
const refreshedAccessToken = 'refreshed-access-token';
authByAccessToken.delete(authFixtures['refresh-code'].accessToken);
authByAccessToken.set(refreshedAccessToken, authFixtures['refresh-code']);
let refreshRequestCount = 0;

let supabaseMockServer: Awaited<ReturnType<typeof startSupabaseMockServer>> | null = null;

async function startSupabaseMockServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', supabaseUrl);
    response.setHeader('access-control-allow-origin', baseUrl);
    response.setHeader('access-control-allow-headers', 'authorization, apikey, content-type, x-client-info');

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/auth/v1/authorize') {
      const redirectTo = url.searchParams.get('redirect_to') || `${baseUrl}/acceso?retorno=%2F`;
      const returnPath = new URL(redirectTo).searchParams.get('retorno') || '/';
      const code = returnPath.includes('estado=pendiente')
        ? 'pending-code'
        : returnPath.includes('sesion=expirada')
          ? 'refresh-code'
          : returnPath.includes('rol=miembro')
            ? 'member-code'
            : returnPath.startsWith('/admin')
              ? 'admin-code'
              : 'member-code';
      const location = new URL(redirectTo);
      location.searchParams.set('code', code);

      response.writeHead(302, { location: location.toString() });
      response.end();
      return;
    }

    if (request.method === 'POST' && url.pathname === '/auth/v1/token') {
      const body = await new Promise<string>((resolve) => {
        let payload = '';
        request.on('data', (chunk) => {
          payload += chunk;
        });
        request.on('end', () => resolve(payload));
      });

      const contentType = request.headers['content-type'] || '';
      const params = contentType.includes('application/json')
        ? (JSON.parse(body) as { auth_code?: string; refresh_token?: string })
        : Object.fromEntries(new URLSearchParams(body));
      const code = params.auth_code;
      const refreshToken = params.refresh_token;
      const isRefresh = Boolean(refreshToken);
      const fixture =
        (code && authFixtures[code as keyof typeof authFixtures]) ||
        [...authByAccessToken.values()].find((candidate) => candidate.refreshToken === refreshToken);

      if (!fixture) {
        response.writeHead(401, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'invalid_grant' }));
        return;
      }

      if (isRefresh) {
        refreshRequestCount += 1;
      }

      const expiresIn = code === 'refresh-code' ? -60 : 3600;
      const accessToken =
        isRefresh && fixture === authFixtures['refresh-code']
          ? refreshedAccessToken
          : fixture.accessToken;

      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          access_token: accessToken,
          refresh_token: fixture.refreshToken,
          expires_in: expiresIn,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          token_type: 'bearer',
          user: {
            id: fixture.user.id,
            email: fixture.user.email,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date(0).toISOString(),
          },
        }),
      );
      return;
    }

    if (request.method === 'GET' && url.pathname === '/auth/v1/user') {
      const authorization = request.headers.authorization;
      const token = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null;
      const fixture = token && !rejectedAccessTokens.has(token)
        ? authByAccessToken.get(token)
        : null;

      if (!fixture) {
        response.writeHead(401, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'invalid_token' }));
        return;
      }

      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          id: fixture.user.id,
          email: fixture.user.email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date(0).toISOString(),
        }),
      );
      return;
    }

    if (request.method === 'GET' && url.pathname === '/rest/v1/profiles') {
      const userId = url.searchParams.get('id')?.replace(/^eq\./, '') || '';
      const fixture = Object.values(authFixtures).find((candidate) => candidate.user.id === userId);

      if (!fixture) {
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Not found' }));
        return;
      }

      response.writeHead(200, {
        'content-type': 'application/json',
        'content-range': '0-0/*',
      });
      response.end(JSON.stringify(fixture.profile));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
  });

  await new Promise<void>((resolve) => {
    server.listen(supabasePort, '127.0.0.1', () => resolve());
  });

  return server;
}

test.beforeAll(async () => {
  supabaseMockServer = await startSupabaseMockServer();
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!supabaseMockServer) {
      resolve();
      return;
    }

    supabaseMockServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

async function mockConsoleApis(page: Page, profileOverrides: Record<string, unknown> = {}) {
  await page.route('**/api/profile/verify-roblox', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      json: {
        profile: {
          id: 'user-1',
          roblox_user_id: 123,
          roblox_user: 'PollitoVIP',
          roblox_display_name: '🐣 PollitoVIP 🐣',
          roblox_avatar_url: null,
          roblox_verified_at: new Date().toISOString(),
          tiktok_user: 'pollitovip',
          link_status: 'approved',
          rejection_reason: null,
          soundboard_disabled: false,
          perm_upload_images: true,
          perm_upload_videos: true,
          perm_upload_audio: true,
          perm_tts_text: true,
          perm_tts_record: true,
          perm_edit_nickname: true,
          perm_trigger_sounds: true,
          perm_trigger_media: true,
          perm_trigger_animations: true,
          perm_edit_sounds: true,
          ...profileOverrides,
        },
        isComplete: true,
        isBotAccount: false,
      },
    });
  });

  await page.route('**/api/interviews/my-status', async (route) => {
    await route.fulfill({
      json: {
        status: 'approved',
        roblox_user: 'PollitoVIP',
        tiktok_user: 'pollitovip',
        avatar_url: null,
        is_admin: false,
      },
    });
  });

  await page.route('**/api/stream/events', async (route) => {
    await route.fulfill({ json: { events: [] } });
  });

  await page.route('**/api/console/leaderboard', async (route) => {
    await route.fulfill({
      json: {
        weekStart: new Date().toISOString(),
        weekly: {
          usage: [{ userId: 'user-1', name: 'PollitoActivo', avatarUrl: null, count: 7 }],
          sounds: [],
          images: [],
        },
        allTime: { usage: [], sounds: [], images: [] },
      },
    });
  });

  await page.route('**/api/admin/sounds', async (route) => {
    await route.fulfill({ json: { sounds: [] } });
  });

  await page.route('**/api/stream/settings', async (route) => {
    await route.fulfill({
      json: {
        id: 1,
        is_muted: false,
        global_cooldown_seconds: 30,
        personal_cooldown_seconds: 300,
        overlay_media_repeat_count: 1,
      },
    });
  });

  await page.route('**/api/console/sounds/my-submissions', async (route) => {
    await route.fulfill({ json: { submissions: [] } });
  });

  await page.route('**/api/console/sounds/my-private', async (route) => {
    await route.fulfill({ json: { sounds: [] } });
  });

  await page.route('**/api/console/media/my-submissions', async (route) => {
    await route.fulfill({ json: { submissions: [] } });
  });

  await page.route('**/api/tiktok/rankings/current**', async (route) => {
    await route.fulfill({
      json: {
        batch_id: 'batch-1',
        captured_at: '2026-07-29T00:00:00.000Z',
        sets: [{
          metric: 'viewers',
          period: 'last_live',
          window: { begin: null, end: null },
          entries: [{
            position: 1,
            display_id: 'pollito-ranking',
            nickname: 'Pollito Ranking',
            value: '1234',
            profile: null,
          }],
          me: null,
        }],
      },
    });
  });

  await page.route('**/api/tiktok/rankings?**', async (route) => {
    await route.fulfill({ json: { history: [] } });
  });
}

async function mockAdminApis(page: Page) {
  const targetUser = {
    id: 'user-1',
    email: 'miembro@test.dev',
    createdAt: new Date(0).toISOString(),
    lastSignInAt: new Date(0).toISOString(),
    hasVerifiedRoblox: true,
    robloxUser: 'PollitoVIP',
    robloxDisplayName: 'Pollito VIP',
    robloxAvatarUrl: null,
    robloxVerifiedAt: new Date(0).toISOString(),
    tiktokUser: 'pollitovip',
    linkStatus: 'approved',
    rejectionReason: null,
    votedCount: 0,
    totalCategories: 0,
    votedPercentage: 0,
    isAdmin: false,
    soundboardDisabled: false,
    permUploadImages: true,
    permUploadVideos: true,
    permUploadAudio: true,
    permTtsText: true,
    permTtsRecord: true,
    permEditNickname: true,
    permTriggerSounds: true,
    permTriggerMedia: true,
    permTriggerAnimations: true,
    permEditSounds: true,
    testimonial: null,
    testimonialApproved: false,
    votes: [],
  };
  const adminUsers = [
    targetUser,
    ...Array.from({ length: 12 }, (_, index) => ({
      ...targetUser,
      id: `user-${index + 2}`,
      email: `miembro${index + 2}@test.dev`,
      robloxUser: `Miembro${index + 2}`,
      robloxDisplayName: `Miembro ${index + 2}`,
      tiktokUser: null,
    })),
  ];

  await page.route('**/api/admin/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith('/dashboard')) {
      await route.fulfill({
        json: {
          summary: {
            totalUsers: 13,
            approvedUsers: 13,
            newUsers: 0,
            interactions: 0,
            pendingApplications: 2,
            pendingUploads: 3,
          },
          recentAccesses: [],
          topUsers: [],
          topSounds: [{ soundId: 'risa', name: 'Risa', count: 8 }],
          topUploads: [{ userId: 'user-1', name: 'Pollito VIP', avatarUrl: null, count: 4 }],
        },
      });
      return;
    }

    if (pathname.endsWith('/stats')) {
      await route.fulfill({
        json: {
          summary: { totalUsers: 13, verifiedUsers: 13, totalVotes: 0, completedVoters: 0 },
          users: adminUsers,
          categoryStats: [],
        },
      });
      return;
    }

    if (pathname.endsWith('/interviews')) {
      await route.fulfill({ json: { slots: [] } });
      return;
    }

    if (pathname.endsWith('/overlay-link')) {
      await route.fulfill({ json: { overlay_url: 'https://example.com/overlay' } });
      return;
    }

    if (pathname.endsWith('/sounds')) {
      await route.fulfill({ json: { sounds: [] } });
      return;
    }

    if (pathname.endsWith('/logs')) {
      await route.fulfill({ json: { logs: [] } });
      return;
    }

    if (pathname.endsWith('/ping-vm')) {
      await route.fulfill({ json: { ok: true } });
      return;
    }

    if (pathname.endsWith('/tiktok/rankings')) {
      await route.fulfill({
        json: {
          history: [],
          active_batch: null,
          latest_import: null,
          import_attempts: [],
          identities: [],
          import_token_configured: false,
        },
      });
      return;
    }

    if (pathname.endsWith('/nominees')) {
      await route.fulfill({ json: { nominees: [] } });
      return;
    }

    await route.fulfill({ json: {} });
  });
}

async function signInAsAdmin(page: Page, returnPath: string) {
  await mockAdminApis(page);
  await page.goto(`/acceso?retorno=${encodeURIComponent(returnPath)}`);
  await page.getByRole('button', { name: /Continuar con Google/i }).click();
}

test('redirige al visitante desde una ruta privada hacia /acceso preservando el retorno', async ({
  page,
}) => {
  await page.goto('/console?vista=sonidos');

  await expect(page).toHaveURL('/acceso?retorno=%2Fconsole%3Fvista%3Dsonidos');
  await expect(page.getByRole('heading', { name: /Entrar a la comunidad/i })).toBeVisible();
});

test('protege las rutas futuras de /panel preservando la ruta y sus parametros', async ({ page }) => {
  await page.goto('/panel/sonidos?categoria=memes');

  await expect(page).toHaveURL(
    '/acceso?retorno=%2Fpanel%2Fsonidos%3Fcategoria%3Dmemes',
  );
});

test('el layout conserva el retorno exacto cuando una cookie optimista no verifica', async ({
  context,
  page,
}) => {
  await page.goto('/acceso?retorno=%2Fpanel%2Fsonidos');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();
  await expect(page).toHaveURL('/panel/sonidos');

  rejectedAccessTokens.add(authFixtures['member-code'].accessToken);
  await context.setExtraHTTPHeaders({
    'x-team-pollito-return-path': '/admin',
  });

  try {
    await page.goto('/console?vista=sonidos&orden=recientes');

    await expect(page).toHaveURL(
      '/acceso?retorno=%2Fconsole%3Fvista%3Dsonidos%26orden%3Drecientes',
    );
  } finally {
    rejectedAccessTokens.delete(authFixtures['member-code'].accessToken);
  }
});

test('Proxy propaga al navegador y al layout las cookies de una sesion refrescada', async ({
  page,
}) => {
  await mockConsoleApis(page);
  refreshRequestCount = 0;

  await page.goto('/acceso?retorno=%2Fpanel%2Fsonidos%3Fsesion%3Dexpirada');
  const privateResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().resourceType() === 'document' &&
      response.url().endsWith('/panel/sonidos?sesion=expirada')
    );
  });
  await page.getByRole('button', { name: /Continuar con Google/i }).click();
  const privateResponse = await privateResponsePromise;

  expect(refreshRequestCount).toBe(1);
  expect((await privateResponse.headerValues('set-cookie')).join(';')).toContain(
    'sb-127-auth-token',
  );
  await expect(page).toHaveURL('/panel/sonidos?sesion=expirada');
  await expect(page.getByRole('heading', { name: 'Banco' })).toBeVisible();
});

test('envia el retorno validado a OAuth desde /acceso', async ({ page }) => {
  let requestedRedirectTo: string | null = null;

  await page.route(`${supabaseUrl}/auth/v1/authorize**`, async (route) => {
    requestedRedirectTo = new URL(route.request().url()).searchParams.get('redirect_to');

    await route.fulfill({
      status: 302,
      headers: {
        location: requestedRedirectTo ?? `${baseUrl}/api/auth/callback?retorno=%2Fconsole`,
      },
    });
  });

  await page.goto('/acceso?retorno=%2Fconsole%3Fvista%3Dsonidos');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect.poll(() => requestedRedirectTo).toBe(
    `${baseUrl}/api/auth/callback?retorno=%2Fconsole%3Fvista%3Dsonidos`,
  );
});

test('bloquea retornos externos al iniciar autenticación', async ({ page }) => {
  let requestedRedirectTo: string | null = null;

  await page.route(`${supabaseUrl}/auth/v1/authorize**`, async (route) => {
    requestedRedirectTo = new URL(route.request().url()).searchParams.get('redirect_to');

    await route.fulfill({
      status: 302,
      headers: {
        location: requestedRedirectTo ?? `${baseUrl}/api/auth/callback?retorno=%2F`,
      },
    });
  });

  await page.goto('/acceso?retorno=https://evil.example/phishing');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect.poll(() => requestedRedirectTo).toBe(
    `${baseUrl}/api/auth/callback?retorno=%2F`,
  );
});

test('bloquea retornos malformados al iniciar autenticación', async ({ page }) => {
  let requestedRedirectTo: string | null = null;

  await page.route(`${supabaseUrl}/auth/v1/authorize**`, async (route) => {
    requestedRedirectTo = new URL(route.request().url()).searchParams.get('redirect_to');

    await route.fulfill({
      status: 302,
      headers: {
        location: requestedRedirectTo ?? `${baseUrl}/api/auth/callback?retorno=%2F`,
      },
    });
  });

  await page.goto('/acceso?retorno=%2F%2Fevil.example%2Fphishing');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect.poll(() => requestedRedirectTo).toBe(
    `${baseUrl}/api/auth/callback?retorno=%2F`,
  );
});

test('ignora hosts reenviados al resolver el callback', async ({ request }) => {
  const response = await request.get('/api/auth/callback?retorno=%2Fadmin', {
    headers: {
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'https',
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(
    `${baseUrl}/acceso?retorno=%2Fadmin`,
  );
});

test('redirige /console a Sonidos tras autenticar al Miembro Oficial', async ({
  page,
}) => {
  await mockConsoleApis(page);

  await page.goto('/acceso?retorno=%2Fconsole');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect(page).toHaveURL('/panel/sonidos');
  await expect(page.getByRole('heading', { name: 'Banco' })).toBeVisible();

  const response = await page.request.get('/console', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe('/panel/sonidos');
});

test('redirige /panel al Inicio del Panel del Miembro', async ({ page }) => {
  await mockConsoleApis(page);

  await page.goto('/acceso?retorno=%2Fpanel');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect(page).toHaveURL('/panel/inicio');
  await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible();
});

test('abre /panel/inicio directamente sin serializar credenciales ni duplicar su carga inicial', async ({ page }) => {
  let profileRequestCount = 0;
  await mockConsoleApis(page);
  await page.route('**/api/profile/verify-roblox', async (route) => {
    profileRequestCount += 1;
    await route.fallback();
  });

  await page.goto('/panel/inicio');
  await expect(page).toHaveURL('/acceso?retorno=%2Fpanel%2Finicio');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect(page).toHaveURL('/panel/inicio');
  await expect(page.getByRole('heading', { name: /Panel del Miembro/i })).toBeVisible();
  await expect.poll(() => profileRequestCount).toBe(1);

  const reloadResponse = await page.reload();
  const responseBody = await reloadResponse?.text();
  expect(responseBody).not.toContain(authFixtures['member-code'].accessToken);
  expect(responseBody).not.toContain(authFixtures['member-code'].refreshToken);
  await expect(page).toHaveURL('/panel/inicio');
});

test('navega entre Inicio y Sonidos preservando el filtro, recarga e historial', async ({ page }) => {
  await mockConsoleApis(page);
  await page.goto('/acceso?retorno=%2Fpanel%2Finicio');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await page.locator('aside').getByRole('link', { name: 'Sonidos' }).click();
  await expect(page).toHaveURL('/panel/sonidos');
  await expect(page.getByRole('heading', { name: 'Banco' })).toBeVisible();

  await page.getByRole('link', { name: /Imágenes/i }).click();
  await expect(page).toHaveURL('/panel/sonidos?tipo=multimedia');
  await expect(page.getByText('No hay imágenes disponibles en este momento.')).toBeVisible();

  await page.getByRole('link', { name: /Audios/i }).click();
  await expect(page).toHaveURL('/panel/sonidos?tipo=audios');
  await expect(page.getByText('No hay audios disponibles en este momento.')).toBeVisible();

  await page.getByRole('link', { name: /Videos/i }).click();
  await expect(page).toHaveURL('/panel/sonidos?tipo=videos');
  await expect(page.getByText('No hay videos disponibles en este momento.')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL('/panel/sonidos?tipo=videos');
  await expect(page.getByRole('link', { name: /Videos/i })).toHaveAttribute('aria-current', 'page');

  await page.locator('aside').getByRole('link', { name: 'Inicio' }).click();
  await expect(page).toHaveURL('/panel/inicio');
  await page.goBack();
  await expect(page).toHaveURL('/panel/sonidos?tipo=videos');
  await expect(page.getByText('No hay videos disponibles en este momento.')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL('/panel/inicio');
});

test('normaliza un tipo de Sonidos inválido a la URL de audios', async ({ page }) => {
  await mockConsoleApis(page);
  await page.goto('/acceso?retorno=%2Fpanel%2Fsonidos%3Ftipo%3Dinvalido');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect(page).toHaveURL('/panel/sonidos?tipo=audios');
  await expect(page.getByRole('link', { name: /Audios/i })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('No hay audios disponibles en este momento.')).toBeVisible();
});

test('abre Voz por deep link y conserva el modo navegable en recarga e historial', async ({ page }) => {
  await mockConsoleApis(page);
  await page.goto('/panel/voz?modo=grabacion');
  await expect(page).toHaveURL('/acceso?retorno=%2Fpanel%2Fvoz%3Fmodo%3Dgrabacion');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect(page).toHaveURL('/panel/voz?modo=grabacion');
  await expect(page.getByRole('heading', { name: 'Mensaje de Voz' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Grabar/i })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: /Empezar a Grabar/i })).toBeVisible();

  await page.getByRole('link', { name: /Texto/i }).click();
  await expect(page).toHaveURL('/panel/voz?modo=texto');
  await page.getByRole('textbox').fill('Borrador privado');
  await expect(page).toHaveURL('/panel/voz?modo=texto');

  await page.reload();
  await expect(page).toHaveURL('/panel/voz?modo=texto');
  await expect(page.getByRole('textbox')).toHaveValue('');

  await page.goBack();
  await expect(page).toHaveURL('/panel/voz?modo=grabacion');
  await expect(page.getByRole('button', { name: /Empezar a Grabar/i })).toBeVisible();
});

test('abre Efectos por deep link y conserva confirmación, cooldown, stream e historial', async ({ page }) => {
  let submittedEvent: Record<string, unknown> | null = null;
  await mockConsoleApis(page);
  await page.route('**/api/stream/events', async (route) => {
    if (route.request().method() === 'POST') {
      submittedEvent = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ json: { event: { id: 'event-1' } } });
      return;
    }

    await route.fulfill({ json: { events: [] } });
  });

  await page.goto('/panel/efectos');
  await expect(page).toHaveURL('/acceso?retorno=%2Fpanel%2Fefectos');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  const desktopNavigation = page.locator('aside').getByText('Navegación').locator('..');
  await expect(page).toHaveURL('/panel/efectos');
  await expect(desktopNavigation.getByRole('link', { name: 'Efectos' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: /Lluvia de Huevos/i }).click();
  await expect(page.getByText('¿Quieres mostrar esta animación en pantalla?')).toBeVisible();
  await expect(page).toHaveURL('/panel/efectos');
  await page.getByRole('button', { name: /Enviar/i }).click();

  await expect.poll(() => submittedEvent).toMatchObject({ type: 'animation', content: 'eggs' });
  await expect(page.getByRole('button', { name: /Lluvia de Huevos/i })).toBeDisabled();
  await expect(page.getByText(/Cooldown \(60s\)/).first()).toBeVisible();

  await desktopNavigation.getByRole('link', { name: 'Voz' }).click();
  await expect(page).toHaveURL('/panel/voz?modo=texto');
  await page.goBack();
  await expect(page).toHaveURL('/panel/efectos');
  await expect(page.getByText('¿Quieres mostrar esta animación en pantalla?')).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL('/panel/efectos');
  await expect(page.getByRole('heading', { name: 'Efectos Visuales' })).toBeVisible();
});

test('conserva el permiso de Efectos sin serializar el rechazo', async ({ page }) => {
  await mockConsoleApis(page, { perm_trigger_animations: false });
  await page.goto('/acceso?retorno=%2Fpanel%2Fefectos');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await page.getByRole('button', { name: /Lluvia de Huevos/i }).click();
  await expect(page.getByText('No tenés permiso para activar animaciones.')).toBeVisible();
  await expect(page.getByText('¿Quieres mostrar esta animación en pantalla?')).toHaveCount(0);
  await expect(page).toHaveURL('/panel/efectos');
});

test('ofrece navegación móvil con la URL como estado activo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockConsoleApis(page);
  await page.goto('/panel/sonidos?tipo=multimedia');
  await expect(page).toHaveURL('/acceso?retorno=%2Fpanel%2Fsonidos%3Ftipo%3Dmultimedia');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  const mobileNavigation = page.locator('nav').filter({ has: page.getByRole('link', { name: 'Inicio' }) });
  await expect(mobileNavigation.getByRole('link', { name: 'Sonidos' })).toHaveAttribute('aria-current', 'page');

  await mobileNavigation.getByRole('link', { name: 'Inicio' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/panel/inicio');
  await expect(mobileNavigation.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');

  await mobileNavigation.getByRole('link', { name: 'Voz' }).click();
  await expect(page).toHaveURL('/panel/voz?modo=texto');
  await expect(mobileNavigation.getByRole('link', { name: 'Voz' })).toHaveAttribute('aria-current', 'page');

  await mobileNavigation.getByRole('link', { name: 'Efectos' }).click();
  await expect(page).toHaveURL('/panel/efectos');
  await expect(mobileNavigation.getByRole('link', { name: 'Efectos' })).toHaveAttribute('aria-current', 'page');
});

test('un Miembro Oficial conserva /panel con query al recargar y usar el historial', async ({
  page,
}) => {
  const panelPath = '/panel/sonidos?categoria=memes';

  await page.goto('/acceso?retorno=%2Fpanel%2Fsonidos%3Fcategoria%3Dmemes');
  await page.getByRole('button', { name: /Continuar con Google/i }).click();

  await expect(page).toHaveURL(panelPath);
  await page.reload();
  await expect(page).toHaveURL(panelPath);

  await page.goto('/ruta-publica-inexistente');
  await page.goBack();
  await expect(page).toHaveURL(panelPath);
});

test('responde 403 a una cuenta autenticada que no es Miembro Oficial', async ({ page }) => {
  await page.goto('/acceso?retorno=%2Fconsole%3Festado%3Dpendiente');
  const responsePromise = page.waitForResponse((response) => {
    return (
      response.request().resourceType() === 'document' &&
      response.url().endsWith('/console?estado=pendiente')
    );
  });
  await page.getByRole('button', { name: /Continuar con Google/i }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(403);
  await expect(page.getByRole('heading', { name: /ACCESO RESTRINGIDO/i })).toBeVisible();
});

test('responde 403 a un usuario autenticado sin rol Admin en /admin', async ({ page }) => {
  await page.goto('/acceso?retorno=%2Fadmin%3Frol%3Dmiembro');
  const responsePromise = page.waitForResponse((response) => {
    return (
      response.request().resourceType() === 'document' &&
      response.url().endsWith('/admin?rol=miembro')
    );
  });
  await page.getByRole('button', { name: /Continuar con Google/i }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(403);
  await expect(page).toHaveURL('/admin?rol=miembro');
  await expect(page.getByRole('heading', { name: /ACCESO RESTRINGIDO/i })).toBeVisible();
});

test('permite que un Administrador retome /admin tras pasar por /acceso', async ({ page }) => {
  await signInAsAdmin(page, '/admin');

  await expect(page).toHaveURL('/admin/inicio');
  await expect(page.getByRole('heading', { name: 'Panel de Control' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sonidos más utilizados' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Miembros con más envíos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Acciones pendientes' })).toBeVisible();
});

test('recorre las operaciones de stream Admin mediante rutas canonicas', async ({ page }) => {
  await signInAsAdmin(page, '/admin/transmision');
  await expect(page).toHaveURL('/admin/transmision');
  await expect(page.getByRole('heading', { name: 'Cooldowns del Stream' })).toBeVisible();

  await page.getByRole('link', { name: 'Overlay', exact: true }).first().click();
  await expect(page).toHaveURL('/admin/overlay');

  await page.getByRole('link', { name: 'Sonidos', exact: true }).first().click();
  await expect(page).toHaveURL('/admin/sonidos');

  await page.getByRole('link', { name: 'Multimedia', exact: true }).first().click();
  await expect(page).toHaveURL('/admin/multimedia');

  await page.getByRole('link', { name: 'Estado de transmisión', exact: true }).first().click();
  await expect(page).toHaveURL('/admin/estado-transmision');
});

test('redirige /admin/operaciones a Transmisión', async ({ page }) => {
  await signInAsAdmin(page, '/admin/operaciones');
  await expect(page).toHaveURL('/admin/transmision');
});

const communityAdminRoutes = [
  {
    path: '/admin/postulaciones',
    link: 'Postulaciones',
    heading: 'Postulaciones Pendientes',
    nextPath: '/admin/testimonios',
    nextLink: 'Testimonios',
    nextHeading: 'Opiniones de la Comunidad',
  },
  {
    path: '/admin/testimonios',
    link: 'Testimonios',
    heading: 'Opiniones de la Comunidad',
    nextPath: '/admin/clasificaciones',
    nextLink: 'Clasificaciones',
    nextHeading: 'Rankings TikTok',
  },
  {
    path: '/admin/clasificaciones',
    link: 'Clasificaciones',
    heading: 'Rankings TikTok',
    nextPath: '/admin/agenda',
    nextLink: 'Agenda',
    nextHeading: 'Crear Horario',
  },
  {
    path: '/admin/agenda',
    link: 'Agenda',
    heading: 'Crear Horario',
    nextPath: '/admin/nominados',
    nextLink: 'Nominados',
    nextHeading: 'Nominados Registrados',
  },
  {
    path: '/admin/nominados',
    link: 'Nominados',
    heading: 'Nominados Registrados',
    nextPath: '/admin/votos',
    nextLink: 'Votos',
    nextHeading: 'Resultados Parciales',
  },
  {
    path: '/admin/votos',
    link: 'Votos',
    heading: 'Resultados Parciales',
    nextPath: '/admin/postulaciones',
    nextLink: 'Postulaciones',
    nextHeading: 'Postulaciones Pendientes',
  },
] as const;

for (const route of communityAdminRoutes) {
  test(`conserva deep link y transicion de ${route.link}`, async ({ page }) => {
    await signInAsAdmin(page, route.path);

    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    await expect(page.getByRole('link', { name: route.link, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.reload();
    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();

    await page.getByRole('link', { name: route.nextLink, exact: true }).click();
    await expect(page).toHaveURL(route.nextPath);
    await expect(page.getByRole('heading', { name: route.nextHeading })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(route.nextPath);
  });
}

test('expone las operaciones comunitarias en la navegacion movil', async ({ page }) => {
  await signInAsAdmin(page, '/admin/postulaciones');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menu' }).click();
  const mobileNavigation = page.getByRole('complementary', {
    name: 'Navegación móvil del Panel de Control',
  });

  for (const route of communityAdminRoutes) {
    await expect(
      mobileNavigation.getByRole('link', { name: route.link, exact: true }),
    ).toBeVisible();
  }
  await expect(
    mobileNavigation.getByRole('link', { name: 'Postulaciones', exact: true }),
  ).toHaveAttribute('aria-current', 'page');

  await mobileNavigation.getByRole('link', { name: 'Agenda', exact: true }).click();
  await expect(page).toHaveURL('/admin/agenda');
  await expect(page.getByRole('heading', { name: 'Crear Horario' })).toBeVisible();

  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(
    page
      .getByRole('complementary', { name: 'Navegación móvil del Panel de Control' })
      .getByRole('link', { name: 'Agenda', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
});

test('conserva la busqueda de Usuarios en la URL al recargar', async ({ page }) => {
  await signInAsAdmin(page, '/admin/usuarios');
  await page.getByRole('textbox', { name: 'Buscar usuarios' }).fill('Pollito');
  await page.getByRole('textbox', { name: 'Buscar usuarios' }).press('Enter');

  await expect(page).toHaveURL('/admin/usuarios?busqueda=Pollito');
  await expect(page.getByRole('textbox', { name: 'Buscar usuarios' })).toHaveValue('Pollito');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Editar Pollito VIP' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Buscar usuarios' }).fill('Miembro 2');
  await page.getByRole('textbox', { name: 'Buscar usuarios' }).press('Enter');
  await expect(page).toHaveURL('/admin/usuarios?busqueda=Miembro+2');

  await page.goBack();
  await expect(page).toHaveURL('/admin/usuarios?busqueda=Pollito');
  await page.goForward();
  await expect(page).toHaveURL('/admin/usuarios?busqueda=Miembro+2');
});

test('conserva pagina en URL directa, recarga y Atras/Adelante', async ({ page }) => {
  await signInAsAdmin(page, '/admin/usuarios?pagina=2');

  await expect(page).toHaveURL('/admin/usuarios?pagina=2');
  await expect(page.getByText('PÁG. 2 / 2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('PÁG. 2 / 2')).toBeVisible();

  await page.getByRole('button', { name: 'Página anterior' }).click();
  await expect(page).toHaveURL('/admin/usuarios');
  await page.goBack();
  await expect(page).toHaveURL('/admin/usuarios?pagina=2');
  await page.goForward();
  await expect(page).toHaveURL('/admin/usuarios');
});

test('un visitante conserva el deep link Admin exacto al ir a acceso', async ({ page }) => {
  await page.goto('/admin/usuarios/user-1?origen=revision&pagina=2');

  await expect(page).toHaveURL(
    '/acceso?retorno=%2Fadmin%2Fusuarios%2Fuser-1%3Forigen%3Drevision%26pagina%3D2',
  );
});

test('abre el editor de usuario como pagina directa sin confundir identidades', async ({ page }) => {
  await signInAsAdmin(page, '/admin/usuarios/user-1');

  await expect(page).toHaveURL('/admin/usuarios/user-1');
  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeVisible();
  await expect(page.getByText('miembro@test.dev')).toBeVisible();
  await expect(page.getByText('admin@test.dev')).toBeVisible();
  await expect(page.getByLabel('Estado de vinculación')).toHaveValue('approved');
  await expect(page.getByText('APPROVED')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.reload();

  await expect(page).toHaveURL('/admin/usuarios/user-1');
  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('abre el editor de usuario como pagina y respeta navegacion', async ({ page }) => {
  await signInAsAdmin(page, '/admin/usuarios');
  await page.getByRole('link', { name: 'Editar Pollito VIP' }).click();

  await expect(page).toHaveURL('/admin/usuarios/user-1');
  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeVisible();

  await page.getByRole('link', { name: '← Volver a Usuarios' }).click();
  await expect(page).toHaveURL('/admin/usuarios');

  await page.goBack();
  await expect(page).toHaveURL('/admin/usuarios/user-1');
  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL('/admin/usuarios');

  await page.getByRole('link', { name: 'Editar Pollito VIP' }).click();
  await expect(page).toHaveURL('/admin/usuarios/user-1');
  await page.reload();
  await expect(page).toHaveURL('/admin/usuarios/user-1');
  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeVisible();
});

test('responde 403 server-side a un Miembro Oficial en una ruta Admin anidada', async ({ page }) => {
  await page.goto('/acceso?retorno=%2Fadmin%2Fusuarios%3Frol%3Dmiembro');
  const responsePromise = page.waitForResponse((response) =>
    response.request().resourceType() === 'document' &&
    response.url().endsWith('/admin/usuarios?rol=miembro'),
  );
  await page.getByRole('button', { name: /Continuar con Google/i }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(403);
  await expect(page.getByRole('heading', { name: /ACCESO RESTRINGIDO/i })).toBeVisible();
});
