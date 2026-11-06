import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import messages from '../../../messages/de.json';
import MapComponent from '../Map';

/**
 * Die Karte ist ein Google-Embed – sie darf erst nach ausdrücklicher Zustimmung laden.
 * Geprüft wird genau das: ohne Klick ist kein iframe im Dokument, mit Klick eines, und
 * "Karte ausblenden" entfernt es wieder.
 */

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

function renderMap() {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <MapComponent />
    </NextIntlClientProvider>
  );
}

describe('Map', () => {
  it('lädt Google erst nach nachweislicher Zustimmung', () => {
    const { container } = renderMap();

    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('button', { name: 'Route planen' })).toBeInTheDocument();
  });

  it('erklärt vorher, was bei der Zustimmung passiert', () => {
    renderMap();

    expect(screen.getByText(messages.Map.note)).toBeInTheDocument();
  });

  it('baut das Embed erst nach dem Klick und macht es wieder weg', () => {
    const { container } = renderMap();

    fireEvent.click(screen.getByRole('button', { name: 'Route planen' }));

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toContain('google.com/maps/embed');
    expect(iframe).toHaveAttribute('title', messages.Map.iframeTitle);
    // Nach dem Laden gibt es einen Weg zurück.
    expect(screen.getByRole('button', { name: 'Karte ausblenden' })).toBeInTheDocument();
  });

  it('entfernt das Embed beim Ausblenden wieder', () => {
    const { container } = renderMap();

    fireEvent.click(screen.getByRole('button', { name: 'Route planen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Karte ausblenden' }));

    expect(container.querySelector('iframe')).toBeNull();
  });

  it('öffnet die Routenplanung ohne Leaks an Google', () => {
    renderMap();

    fireEvent.click(screen.getByRole('button', { name: 'Route planen' }));

    const link = screen.getByRole('link', { name: 'Route auf Google Maps planen' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
