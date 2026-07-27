import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const useWebServer = process.env.PLAYWRIGHT_NO_WEBSERVER !== '1';
const publicSupabaseUrl = 'http://127.0.0.1:54321';
const publicSupabaseAnonKey = 'playwright-test-key';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
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
          command: `NEXT_PUBLIC_SUPABASE_URL=${publicSupabaseUrl} NEXT_PUBLIC_SUPABASE_ANON_KEY=${publicSupabaseAnonKey} pnpm exec next dev --port ${port} --hostname 127.0.0.1`,
          url: `http://127.0.0.1:${port}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
