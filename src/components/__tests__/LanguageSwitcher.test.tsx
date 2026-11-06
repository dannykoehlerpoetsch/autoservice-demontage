import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import deMessages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';
import { routing } from '@/i18n/routing';
import LanguageSwitcher from '../LanguageSwitcher';

const { replaceMock, usePathnameMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  usePathnameMock: vi.fn(() => '/termin-anfrage'),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  usePathname: usePathnameMock,
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: replaceMock })),
}));

function renderSwitcher(locale: 'de' | 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'de' ? deMessages : enMessages}>
      <LanguageSwitcher />
    </NextIntlClientProvider>
  );
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it('bietet genau die konfigurierten Locales an', () => {
    renderSwitcher('de');

    const select = screen.getByRole('combobox', { name: 'Sprache' });
    const optionen = within(select).getAllByRole('option');

    expect(optionen.map((option) => option.getAttribute('value'))).toEqual([...routing.locales]);
    expect(optionen.map((option) => option.textContent)).toEqual(
      routing.locales.map((locale) => locale.toUpperCase())
    );
  });

  it('zeigt die aktuelle Sprache an, nicht die Standardsprache', () => {
    renderSwitcher('de');
    expect(screen.getByRole('combobox')).toHaveValue('de');

    renderSwitcher('en');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('en');
  });

  it('ist beschriftet, auch für Screenreader ohne Sehende', () => {
    renderSwitcher('de');

    // Einmal für die Bedienung sichtbar, einmal als `sr-only`-Text für Assistenz.
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Sprache');
    expect(screen.getByText('Sprache')).toBeInTheDocument();
  });

  it('wechselt die Sprache auf derselben Seite ohne Scrollen', () => {
    renderSwitcher('de');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });

    // Der Wechsel muss auf der aktuellen Seite passieren – sonst landet der Nutzer
    // nach dem Umschalten auf der Startseite.
    expect(replaceMock).toHaveBeenCalledWith('/termin-anfrage', {
      locale: 'en',
      scroll: false,
    });
  });
});
