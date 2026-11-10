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
 * Übersetzer für Tests, die Übersetzungen messbar brauchen, ohne React und ohne
 * Request-Kontext: Server Components rufen `getTranslations` aus `next-intl/server` auf (dort
 * mockbar, aber nicht ausführbar), und die E-Mail-Vorschau bekommt ihre Übersetzerin als
 * Argument – beides lässt sich mit diesem Übersetzer prüfen.
 *
 * Liest die echten Werte aus `messages/*.json`, damit Tests an den Texten messen, die auch
 * Nutzer sehen – nicht an einer zweiten, frei erfundenen Übersetzung. Ein leerer Namespace
 * bedeutet „Wurzel“, die Schlüssel sind dann absolut ("Appointment.fields.name").
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
    // Leerer Namespace = Wurzel: dann sind die Schlüssel absolut ("Appointment.fields.name").
    const text = lookup(namespace ? `${namespace}.${key}` : key);
    if (typeof text !== 'string') {
      throw new Error(`Übersetzung fehlt: ${namespace}.${key}`);
    }

    return Object.entries(values ?? {}).reduce(
      (ergebnis, [name, wert]) => ergebnis.replaceAll(`{${name}}`, String(wert)),
      text
    );
  };

  t.raw = (key: string) => lookup(namespace ? `${namespace}.${key}` : key);

  return t;
}
