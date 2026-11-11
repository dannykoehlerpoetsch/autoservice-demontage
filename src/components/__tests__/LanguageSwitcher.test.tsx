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

  it('offers exactly the configured locales', () => {
    renderSwitcher('de');

    const select = screen.getByRole('combobox', { name: 'Sprache' });
    const options = within(select).getAllByRole('option');

    expect(options.map((option) => option.getAttribute('value'))).toEqual([...routing.locales]);
    expect(options.map((option) => option.textContent)).toEqual(
      routing.locales.map((locale) => locale.toUpperCase())
    );
  });

  it('shows the current language, not the default language', () => {
    renderSwitcher('de');
    expect(screen.getByRole('combobox')).toHaveValue('de');

    renderSwitcher('en');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('en');
  });

  it('is labelled, also for screen readers without sighted users', () => {
    renderSwitcher('de');

    // Once visible for operation, once as `sr-only` text for assistive technology.
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Sprache');
    expect(screen.getByText('Sprache')).toBeInTheDocument();
  });

  it('switches the language on the same page without scrolling', () => {
    renderSwitcher('de');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });

    // The switch has to happen on the current page – otherwise the user
    // lands on the homepage after switching.
    expect(replaceMock).toHaveBeenCalledWith('/termin-anfrage', {
      locale: 'en',
      scroll: false,
    });
  });
});
