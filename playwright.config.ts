import { defineConfig, devices } from '@playwright/test';

/**
 * In CI liegt der Production-Build schon als Artefakt aus dem Job "build" – dort startet der
 * Server ohne erneut zu bauen. Lokal bleibt der Komfortweg: bauen und dann starten.
 *
 * Verglichen wird ausschließlich im DOM: Rollen, Texte, Geometrien und Farbwerte. Es gibt keine
 * Bildvergleiche und damit keine pflegebedürftigen Referenzbilder mehr.
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
  // Der HTML-Report ist der Grund, warum der Artifact-Upload in CI überhaupt etwas findet.
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
