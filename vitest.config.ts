import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      // text for the CI log, html for the artefact browser, json-summary as the data basis for
      // the run summary on the PR page. No lcov: that reporter writes a second copy as
      // coverage/lcov-report/ and nobody reads the file.
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      clean: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test-utils.ts',
        // Pure configuration/type files without logic.
        'src/lib/fonts.ts',
        'src/lib/debug-delay.ts',
        'src/i18n/routing.ts',
        'src/proxy.ts',
        'src/**/*.d.ts',
      ],
      // The floor of today, not a wish value: these numbers stop the coverage from sliding back
      // down. Server pages (layout, page, termin-anfrage, bestaetigung) still contribute 0 % here –
      // they are checked in the E2E specs in a real browser, not in jsdom. The legal notice and the
      // privacy policy are now covered in jsdom as well
      // (`src/components/__tests__/Rechtsseiten.test.tsx`) together with their building blocks, the
      // metadata factory (`src/lib/__tests__/metadata.test.ts`), the operator configuration, the
      // robots.txt, the base URL (`src/lib/__tests__/site.test.ts`) and the loading state.
      // Measured on the current tree: 88.04 % statements · 84.95 % branches ·
      // 89.86 % functions · 88.02 % lines. Raise the thresholds to those numbers next time –
      // and never lower them just to go green.
      thresholds: {
        lines: 87,
        functions: 89,
        branches: 84,
        statements: 87,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
