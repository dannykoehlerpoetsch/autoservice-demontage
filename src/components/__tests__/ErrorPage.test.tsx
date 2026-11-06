import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import messages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';
import { stubSystemTheme } from '@/test-utils';
import ErrorPage from '../../app/[locale]/error';
import GlobalError from '../../app/global-error';

/**
 * Fehlerseiten sind der Teil der App, den niemand freiwillig sieht – und genau darum steckt
 * dort selten Pflege. `error.tsx` läuft mit Übersetzungen, `global-error.tsx` läuft ohne
 * Router *und* ohne next-intl (Englisch als Notfalltext) und muss deshalb beides ausleuchten.
 */

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

// next/font wird beim Test-Render nicht geladen – nur die Klassenkette ist relevant.
vi.mock('@/lib/fonts', () => ({ sans: { className: 'font-sans' } }));

const fehler = Object.assign(new Error('Kaputter Baustein'), { digest: 'digest-42' });

describe('error.tsx (Locale-Fehlerseite)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  function renderFehler(reset = vi.fn()) {
    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <ErrorPage error={fehler} reset={reset} />
      </NextIntlClientProvider>
    );

    return { reset };
  }

  it('erklärt den Fehler in der Sprache der Seite', () => {
    renderFehler();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.ErrorPage.title })
    ).toBeInTheDocument();
    expect(screen.getByText(messages.ErrorPage.description)).toBeInTheDocument();
  });

  it('meldet den Fehler im Server-/Browser-Log', () => {
    renderFehler();

    expect(console.error).toHaveBeenCalledWith(fehler);
  });

  it('bietet Neustart statt Sackgasse', () => {
    const { reset } = renderFehler();

    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('führt zurück zur Startseite', () => {
    renderFehler();

    const link = screen.getByRole('link', { name: 'Zurück zur Startseite' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('zeigt die Übersetzung in beiden Sprachen', () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ErrorPage error={fehler} reset={vi.fn()} />
      </NextIntlClientProvider>
    );

    const en = enMessages;
    expect(screen.getByRole('heading', { level: 1, name: en.ErrorPage.title })).toBeInTheDocument();
  });
});

describe('global-error.tsx (Notfallseite ohne Router)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('kommt ohne next-intl durch und bleibt lesbar', () => {
    const reset = vi.fn();

    render(<GlobalError error={fehler} reset={reset} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong' })
    ).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to homepage' })).toHaveAttribute('href', '/');
  });

  it('respektiert die gespeicherte Dunkel-Einstellung, obwohl es außerhalb der Layouts läuft', () => {
    localStorage.setItem('theme', 'dark');

    render(<GlobalError error={fehler} reset={vi.fn()} />);

    expect(document.documentElement).toHaveClass('dark');
  });

  it('folgt dem System, wenn nichts gespeichert ist', () => {
    stubSystemTheme(true);

    render(<GlobalError error={fehler} reset={vi.fn()} />);

    expect(document.documentElement).toHaveClass('dark');
  });
});
