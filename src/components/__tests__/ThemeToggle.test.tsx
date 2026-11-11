import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/de.json';
import { stubSystemTheme } from '@/test-utils';
import ThemeToggle from '../ThemeToggle';

/**
 * Dark mode is set on the <html> element outside of React (see `src/lib/theme-script.ts`). What is
 * checked here is therefore not the class of a button but that the button correctly hits the global
 * <html> and the storage slot.
 */

function renderToggle(locale: 'de' | 'en' = 'de') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeToggle />
    </NextIntlClientProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('starts light and promises dark mode', () => {
    renderToggle();

    expect(screen.getByRole('button', { name: 'Dunkelmodus aktivieren' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('sets the dark class on the <html> element and remembers the choice', () => {
    renderToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Dunkelmodus aktivieren' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    // The button now has to announce switching back – otherwise it is a
    // riddle for screen reader users.
    expect(screen.getByRole('button', { name: 'Hellmodus aktivieren' })).toBeInTheDocument();
  });

  it('switches back to light in two clicks', () => {
    renderToggle();
    const button = () => screen.getByRole('button');

    fireEvent.click(button());
    fireEvent.click(button());

    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('overrides the reset <html> class after a locale change', () => {
    localStorage.setItem('theme', 'dark');

    renderToggle('de');
    expect(document.documentElement).toHaveClass('dark');

    // The root render on a locale change sticks the class back on – the effect has to
    // set it again, otherwise dark mode is gone after the language switch.
    document.documentElement.classList.remove('dark');
    renderToggle('de');

    expect(document.documentElement).toHaveClass('dark');
  });

  it('follows the system when nothing is stored', async () => {
    stubSystemTheme(true);

    renderToggle();

    await screen.findByRole('button', { name: 'Hellmodus aktivieren' });
    expect(document.documentElement).toHaveClass('dark');
    // The system setting is not declared as its own storage.
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('is present despite blocked localStorage', () => {
    // Private modes throw when reading; the try/catch in `applyStoredOrSystemTheme` has
    // to catch that, otherwise the whole header hangs in an error boundary.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    renderToggle();

    expect(screen.getByRole('button', { name: 'Dunkelmodus aktivieren' })).toBeInTheDocument();
  });
});
