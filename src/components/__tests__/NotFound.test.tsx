import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { makeTranslator } from '@/test-utils';

/**
 * 404-Seiten laufen als Server Components und brauchen dafür den Request-Kontext von
 * next-intl. Der Mock gibt die echten Texte aus `messages/de.json` zurück – gemessen wird
 * also der Text, den Nutzer sehen, nicht eine zweite Übersetzung.
 */

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (options?: string | { locale?: string; namespace?: string }) => {
    const namespace = typeof options === 'string' ? options : (options?.namespace ?? '');
    const messages = (await import('../../../messages/de.json')).default;

    return makeTranslator(messages, namespace);
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock('@/lib/fonts', () => ({ sans: { className: 'font-sans' } }));

import NotFound from '../../app/[locale]/not-found';
import GlobalNotFound from '../../app/global-not-found';
import { THEME_INIT_SCRIPT } from '@/lib/theme-script';
import messages from '../../../messages/de.json';

describe('not-found.tsx (Locale-404)', () => {
  it('nennt die Seite nicht gefunden und führt nach Hause', async () => {
    const ansicht = await NotFound();
    render(<>{ansicht}</>);

    expect(
      screen.getByRole('heading', { level: 1, name: messages.NotFound.title })
    ).toBeInTheDocument();
    expect(screen.getByText(messages.NotFound.description)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: messages.NotFound.backHome });
    expect(link).toHaveAttribute('href', '/');
  });
});

describe('global-not-found.tsx (404 ohne Locale)', () => {
  it('antwortet auch ohne Locale im Pfad', () => {
    render(<GlobalNotFound />);

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(
      screen.getByText("The page you requested doesn't exist or has been moved.")
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to homepage' })).toHaveAttribute('href', '/');
  });

  it('startet das Theme-Skript mit, damit die 404 nicht hell aufdunkelt', () => {
    // Static markup: nach dem ersten Mount wirft ThemeInit das <script> selbst aus dem Baum
    // (siehe ThemeInit.tsx) – hier zählt der Auslieferungszustand.
    const html = renderToStaticMarkup(<GlobalNotFound />);

    expect(html).toContain('id="theme-init"');
    expect(html).toContain(THEME_INIT_SCRIPT);
  });
});
