import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev:next',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
