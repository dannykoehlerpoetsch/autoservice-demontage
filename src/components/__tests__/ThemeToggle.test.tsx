import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/de.json';
import { stubSystemTheme } from '@/test-utils';
import ThemeToggle from '../ThemeToggle';

/**
 * Der Dark-Mode wird außerhalb von React auf dem <html>-Element gesetzt (siehe
 * `src/lib/theme-script.ts`). Geprüft wird hier also nicht die Klasse eines Knopfes, sondern
 * dass der Knopf das globale <html> und den Speicherplatz korrekt erwischt.
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

  it('startet hell und verspricht den Dunkelmodus', () => {
    renderToggle();

    expect(screen.getByRole('button', { name: 'Dunkelmodus aktivieren' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('setzt die dunkle Klasse aufs <html>-Element und merkt sich die Wahl', () => {
    renderToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Dunkelmodus aktivieren' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    // Der Knopf muss jetzt das Zurückschalten ankündigen – sonst ist er für
    // Screenreader-Nutzer ein Rätsel.
    expect(screen.getByRole('button', { name: 'Hellmodus aktivieren' })).toBeInTheDocument();
  });

  it('schaltet in zwei Klicken zurück auf hell', () => {
    renderToggle();
    const knopf = () => screen.getByRole('button');

    fireEvent.click(knopf());
    fireEvent.click(knopf());

    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('überschreibt die zurückgesetzte <html>-Klasse nach einem Locale-Wechsel', () => {
    localStorage.setItem('theme', 'dark');

    renderToggle('de');
    expect(document.documentElement).toHaveClass('dark');

    // Der Root-Render beim Locale-Wechsel klebt die Klasse neu – der Effekt muss sie
    // erneut setzen, sonst ist der Dark-Mode nach der Sprachumschaltung weg.
    document.documentElement.classList.remove('dark');
    renderToggle('de');

    expect(document.documentElement).toHaveClass('dark');
  });

  it('folgt dem System, wenn nichts gespeichert ist', async () => {
    stubSystemTheme(true);

    renderToggle();

    await screen.findByRole('button', { name: 'Hellmodus aktivieren' });
    expect(document.documentElement).toHaveClass('dark');
    // Die Systemeinstellung wird nicht als eigene Speicherung deklariert.
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('ist trotz blockiertem localStorage präsent', () => {
    // Private Modi werfen beim Lesen; der try/catch in `applyStoredOrSystemTheme` muss
    // das abfangen, sonst hängt der ganze Header in einem Fehler-Boundary.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blockiert');
    });

    renderToggle();

    expect(screen.getByRole('button', { name: 'Dunkelmodus aktivieren' })).toBeInTheDocument();
  });
});
