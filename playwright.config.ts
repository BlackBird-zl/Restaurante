import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.QA_APP_PORT ?? 3000);

/**
 * E2E against the running app + local stack (see README). Demo state is shared, so specs run serially
 * (workers: 1) after a fresh `reset:demo`. Tenant hosts use *.localhost, which Chromium resolves to loopback.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.QA_NO_WEBSERVER ? undefined : {
    command: 'pnpm dev', url: `http://localhost:${PORT}/entrar`, reuseExistingServer: true, timeout: 180_000,
  },
});
