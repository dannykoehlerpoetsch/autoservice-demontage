import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/de.json';
import { PORTFOLIO_URL } from '@/lib/site';
import DemoBanner from '../DemoBanner';

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <DemoBanner />
    </NextIntlClientProvider>
  );
}

describe('DemoBanner', () => {
  it('sits as its own landmark region above the content', () => {
    renderBanner();

    expect(
      screen.getByRole('complementary', { name: 'Hinweis: Demo-Projekt' })
    ).toBeInTheDocument();
  });

  it('says in plain text that the workshop is only a demo', () => {
    renderBanner();

    expect(screen.getByText(messages.DemoBanner.text)).toBeInTheDocument();
  });

  it('links the portfolio website as a real external link', () => {
    renderBanner();

    const link = screen.getByRole('link', { name: /Zum Portfolio/ });
    expect(link).toHaveAttribute('href', PORTFOLIO_URL);
    // No locale prefix: the link leaves the app, a next-intl `Link` would rewrite it.
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
  });

  it('announces the new window instead of only showing it', () => {
    renderBanner();

    expect(screen.getByRole('link', { name: /Zum Portfolio/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Zum Portfolio/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
    expect(screen.getByText(messages.DemoBanner.newTab)).toBeInTheDocument();
  });
});
