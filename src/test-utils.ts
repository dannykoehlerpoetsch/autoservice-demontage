import { vi } from 'vitest';

/**
 * jsdom does not know `window.matchMedia`. ThemeToggle and the error pages ask it for the system
 * setting – without a stub they silently run into the try/catch fallback, and a test would have
 * checked that nothing happens instead of checking the real behaviour.
 *
 * Called in tests that want to pretend a dark system: `stubSystemTheme(true)`.
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
 * Translator for tests that need translations measurable, without React and without a request
 * context: server components call `getTranslations` from `next-intl/server` (mockable there, but
 * not executable), and the email preview receives its translator as an argument – both can be
 * tested with this translator.
 *
 * Reads the real values from `messages/*.json` so tests measure against the texts users actually
 * see – not against a second, invented translation. An empty namespace means "root", the keys are
 * then absolute ("Appointment.fields.name").
 */
export function makeTranslator(messages: Record<string, unknown>, namespace: string) {
  function lookup(path: string): unknown {
    return path.split('.').reduce<unknown>((current, step) => {
      if (current && typeof current === 'object' && step in (current as object)) {
        return (current as Record<string, unknown>)[step];
      }
      return undefined;
    }, messages);
  }

  const t = (key: string, values?: Record<string, string | number>) => {
    // Empty namespace = root: then the keys are absolute ("Appointment.fields.name").
    const text = lookup(namespace ? `${namespace}.${key}` : key);
    if (typeof text !== 'string') {
      throw new Error(`translation missing: ${namespace}.${key}`);
    }

    return Object.entries(values ?? {}).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
      text
    );
  };

  t.raw = (key: string) => lookup(namespace ? `${namespace}.${key}` : key);

  return t;
}
