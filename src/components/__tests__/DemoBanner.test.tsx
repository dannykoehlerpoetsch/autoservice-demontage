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
  it('steht als eigene Merkenregion über dem Inhalt', () => {
    renderBanner();

    expect(
      screen.getByRole('complementary', { name: 'Hinweis: Demo-Projekt' })
    ).toBeInTheDocument();
  });

  it('sagt in Klartext, dass die Werkstatt nur demo ist', () => {
    renderBanner();

    expect(screen.getByText(messages.DemoBanner.text)).toBeInTheDocument();
  });

  it('verlinkt die Portfoliowebsite als echten externen Link', () => {
    renderBanner();

    const link = screen.getByRole('link', { name: /Zum Portfolio/ });
    expect(link).toHaveAttribute('href', PORTFOLIO_URL);
    // Kein Locale-Prefix: der Link verlässt die App, next-intl-`Link` würde ihn umbauen.
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
  });

  it('kündigt das neue Fenster an, statt es nur zu zeigen', () => {
    renderBanner();

    expect(screen.getByRole('link', { name: /Zum Portfolio/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Zum Portfolio/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
    expect(screen.getByText(messages.DemoBanner.newTab)).toBeInTheDocument();
  });
});
