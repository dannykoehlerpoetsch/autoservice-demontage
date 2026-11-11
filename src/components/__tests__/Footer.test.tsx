import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import messages from '../../../messages/de.json';
import Footer from '../Footer';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

function renderFooter() {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <Footer />
    </NextIntlClientProvider>
  );
}

describe('Footer', () => {
  it('sits as a footer in the document tree', () => {
    renderFooter();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('links the legal notice', () => {
    renderFooter();

    const link = screen.getByRole('link', { name: 'Impressum' });
    expect(link).toHaveAttribute('href', '/impressum');
  });

  it('names the current year without hard-coding it', () => {
    renderFooter();

    expect(screen.getByRole('contentinfo')).toHaveTextContent(String(new Date().getFullYear()));
  });

  it('attributes the copyright to DaKoPo, not the fictional workshop', () => {
    renderFooter();

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('DaKoPo');
    expect(footer).not.toHaveTextContent('Autoservice Demontage');
  });

  it('states openly that this is a demo project', () => {
    renderFooter();

    expect(screen.getByText(messages.Footer.demoNote)).toBeInTheDocument();
  });
});
