import { defineConfig, devices } from '@playwright/test';

/**
 * In CI the production build already exists as an artefact from the "build" job – there the server
 * starts without building again. Locally the comfortable path stays: build first, then serve.
 *
 * Everything is compared in the DOM only: roles, texts, geometries and colour values.
 */
const serverCommand = process.env.CI
  ? 'bun run start -- -p 3100'
  : 'bun run build && bun run start -- -p 3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // The HTML report is the reason the artefact upload in CI finds anything at all.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    locale: 'de-DE',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: serverCommand,
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
