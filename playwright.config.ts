import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 3100);
const useWebServer = process.env.PLAYWRIGHT_NO_WEBSERVER !== '1';
const supabasePort = Number(process.env.PLAYWRIGHT_SUPABASE_PORT || 54321);
const publicSupabaseUrl = `http://127.0.0.1:${supabasePort}`;
const publicSupabaseAnonKey = 'playwright-test-key';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(useWebServer
    ? {
        webServer: {
          command: `pnpm exec next dev --webpack --port ${port} --hostname 127.0.0.1`,
          env: {
            NEXT_PUBLIC_SUPABASE_URL: publicSupabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: publicSupabaseAnonKey,
            SUPABASE_SERVICE_ROLE_KEY: 'playwright-service-role-key',
          },
          url: `http://127.0.0.1:${port}`,
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
        },
      }
    : {}),
});
