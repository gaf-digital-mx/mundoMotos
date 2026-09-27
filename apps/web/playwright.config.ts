import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against the real Worker (`wrangler dev`) serving the static build, so the locale
 * rewrite, headers and 404 handling are exercised exactly as in production. Set BASE_URL to run
 * the @smoke subset against a deployed environment instead.
 */
const deployedUrl = process.env.BASE_URL;
const localUrl = 'http://127.0.0.1:8788';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: deployedUrl ?? localUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      grep: /@smoke/,
    },
  ],
  ...(deployedUrl
    ? {}
    : {
        webServer: {
          command: 'pnpm --filter @mundomotos/api exec wrangler dev --port 8788 --ip 127.0.0.1',
          url: `${localUrl}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
