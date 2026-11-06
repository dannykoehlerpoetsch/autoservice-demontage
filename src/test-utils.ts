import { vi } from 'vitest';

/**
 * jsdom kennt `window.matchMedia` nicht. ThemeToggle und die Fehlerseiten fragen dort nach
 * der Systemeinstellung – ohne Stub laufen sie stumm in den try/catch-Fallback, und ein Test
 * hätte geprüft, dass nichts passiert, statt das echte Verhalten zu prüfen.
 *
 * Aufruf in Tests, die ein dunkles System vorgeben wollen: `stubSystemTheme(true)`.
 */
export function stubSystemTheme(prefersDark: boolean) {
  const matchMedia = (query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  vi.stubGlobal('matchMedia', matchMedia);
}

/**
 * Übersetzer für Tests, die Server Components aufrufen (`getTranslations` aus next-intl/server
 * braucht dort den Request-Kontext und ist deshalb mockbar, aber nicht ausführbar).
 *
 * Liest die echten Werte aus `messages/*.json`, damit Tests an den Texten messen, die auch
 * Nutzer sehen – nicht an einer zweiten, frei erfundenen Übersetzung.
 */
export function makeTranslator(messages: Record<string, unknown>, namespace: string) {
  function lookup(path: string): unknown {
    return path.split('.').reduce<unknown>((aktuell, schritt) => {
      if (aktuell && typeof aktuell === 'object' && schritt in (aktuell as object)) {
        return (aktuell as Record<string, unknown>)[schritt];
      }
      return undefined;
    }, messages);
  }

  const t = (key: string, values?: Record<string, string | number>) => {
    const text = lookup(`${namespace}.${key}`);
    if (typeof text !== 'string') {
      throw new Error(`Übersetzung fehlt: ${namespace}.${key}`);
    }

    return Object.entries(values ?? {}).reduce(
      (ergebnis, [name, wert]) => ergebnis.replaceAll(`{${name}}`, String(wert)),
      text
    );
  };

  t.raw = (key: string) => lookup(`${namespace}.${key}`);

  return t;
}
