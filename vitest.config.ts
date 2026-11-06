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
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test-utils.ts',
        // Reine Konfigurations-/Typdateien ohne eigene Logik.
        'src/lib/fonts.ts',
        'src/lib/site.ts',
        'src/lib/debug-delay.ts',
        'src/i18n/routing.ts',
        'src/proxy.ts',
        'src/**/*.d.ts',
      ],
      // Boden von heute, nicht Wunschwert: diese Zahlen verhindern, dass die Abdeckung
      // wieder wegrutscht. Server Pages (layout, page, impressum, termin-anfrage,
      // bestaetigung) steuern hier 0 % bei – sie werden in den E2E-Specs im echten Browser
      // geprüft, nicht in jsdom. Beim Anheben zuerst an diese Zahlen denken.
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
