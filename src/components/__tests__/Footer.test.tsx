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
  it('steht als Footer im Dokumentbaum', () => {
    renderFooter();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('verlinkt das Impressum', () => {
    renderFooter();

    const link = screen.getByRole('link', { name: 'Impressum' });
    expect(link).toHaveAttribute('href', '/impressum');
  });

  it('nennt das laufende Jahr, ohne es hart zu kodieren', () => {
    renderFooter();

    expect(screen.getByRole('contentinfo')).toHaveTextContent(String(new Date().getFullYear()));
  });

  it('weist das Urheberrecht DaKoPo zu, nicht der fiktiven Werkstatt', () => {
    renderFooter();

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('DaKoPo');
    expect(footer).not.toHaveTextContent('Autoservice Demontage');
  });

  it('erklärt offen, dass es ein Demo-Projekt ist', () => {
    renderFooter();

    expect(screen.getByText(messages.Footer.demoNote)).toBeInTheDocument();
  });
});
