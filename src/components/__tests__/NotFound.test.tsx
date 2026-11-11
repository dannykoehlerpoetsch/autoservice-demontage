import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { makeTranslator } from '@/test-utils';

/**
 * 404 pages run as server components and need next-intl's request context for that. The mock returns
 * the real texts from `messages/de.json` – what is measured is therefore the text users see, not a
 * second translation.
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

describe('not-found.tsx (locale 404)', () => {
  it('says the page was not found and leads home', async () => {
    const view = await NotFound();
    render(<>{view}</>);

    expect(
      screen.getByRole('heading', { level: 1, name: messages.NotFound.title })
    ).toBeInTheDocument();
    expect(screen.getByText(messages.NotFound.description)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: messages.NotFound.backHome });
    expect(link).toHaveAttribute('href', '/');
  });
});

describe('global-not-found.tsx (404 without a locale)', () => {
  it('responds even without a locale in the path', () => {
    render(<GlobalNotFound />);

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(
      screen.getByText("The page you requested doesn't exist or has been moved.")
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to homepage' })).toHaveAttribute('href', '/');
  });

  it('runs the theme script so the 404 does not flash light', () => {
    // Static markup: after the first mount ThemeInit throws the <script> out of the tree itself
    // (see ThemeInit.tsx) – what counts here is the delivered state.
    const html = renderToStaticMarkup(<GlobalNotFound />);

    expect(html).toContain('id="theme-init"');
    expect(html).toContain(THEME_INIT_SCRIPT);
  });
});
