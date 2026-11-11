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
 * Error pages are the part of the app nobody sees voluntarily – which is exactly why little care
 * tends to go into them. `error.tsx` runs with translations, `global-error.tsx` runs without a router
 * *and* without next-intl (English as the emergency text) and therefore both have to be lit up.
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

const brokenError = Object.assign(new Error('Broken component'), { digest: 'digest-42' });

describe('error.tsx (locale error page)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  function renderError(reset = vi.fn()) {
    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <ErrorPage error={brokenError} reset={reset} />
      </NextIntlClientProvider>
    );

    return { reset };
  }

  it('explains the error in the language of the page', () => {
    renderError();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.ErrorPage.title })
    ).toBeInTheDocument();
    expect(screen.getByText(messages.ErrorPage.description)).toBeInTheDocument();
  });

  it('reports the error in the server/browser log', () => {
    renderError();

    expect(console.error).toHaveBeenCalledWith(brokenError);
  });

  it('offers a restart instead of a dead end', () => {
    const { reset } = renderError();

    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('leads back to the homepage', () => {
    renderError();

    const link = screen.getByRole('link', { name: 'Zurück zur Startseite' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('shows the translation in both languages', () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ErrorPage error={brokenError} reset={vi.fn()} />
      </NextIntlClientProvider>
    );

    const en = enMessages;
    expect(screen.getByRole('heading', { level: 1, name: en.ErrorPage.title })).toBeInTheDocument();
  });
});

describe('global-error.tsx (emergency page without a router)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('copes without next-intl and stays readable', () => {
    const reset = vi.fn();

    render(<GlobalError error={brokenError} reset={reset} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong' })
    ).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to homepage' })).toHaveAttribute('href', '/');
  });

  it('respects the stored dark setting even though it runs outside the layouts', () => {
    localStorage.setItem('theme', 'dark');

    render(<GlobalError error={brokenError} reset={vi.fn()} />);

    expect(document.documentElement).toHaveClass('dark');
  });

  it('follows the system when nothing is stored', () => {
    stubSystemTheme(true);

    render(<GlobalError error={brokenError} reset={vi.fn()} />);

    expect(document.documentElement).toHaveClass('dark');
  });
});
