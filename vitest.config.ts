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
      // text für den CI-Log, html für den Artefakt-Browser, json-summary als Datenbasis
      // für die Lauf-Zusammenfassung auf der PR-Seite. Kein lcov: der Reporter schreibt
      // zusätzlich eine zweite Kopie als coverage/lcov-report/ und niemand liest die Datei.
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      clean: true,
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
      // wieder wegrutscht. Server Pages (layout, page, termin-anfrage, bestaetigung) steuern
      // hier weiterhin 0 % bei – sie werden in den E2E-Specs im echten Browser geprüft, nicht
      // in jsdom. Impressum und Datenschutzerklärung sind inzwischen auch in jsdom erfasst
      // (`src/components/__tests__/Rechtsseiten.test.tsx`) mit ihren Bausteinen, die
      // Metadatenfabrik (`src/lib/__tests__/metadata.test.ts`), die Betreiberkonfiguration, die
      // robots.txt und der Ladezustand. Angehoben auf den gemessenen Stand
      // (87,52 % Statements · 84,54 % Branches · 89,43 % Funktionen · 87,50 % Lines); beim
      // nächsten Anheben zuerst an diese Zahlen denken – und nie niedriger setzen, um grün zu
      // werden.
      thresholds: {
        lines: 87,
        functions: 88,
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
