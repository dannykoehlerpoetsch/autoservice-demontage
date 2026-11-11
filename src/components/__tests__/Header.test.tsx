import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { MouseEvent, ReactNode } from 'react';
import messages from '../../../messages/de.json';

const { usePathnameMock, useRouterMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => '/'),
  useRouterMock: vi.fn(() => ({ replace: vi.fn() })),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: (e: MouseEvent) => void;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
}));

import Header from '../Header';

function renderHeader() {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <Header />
    </NextIntlClientProvider>
  );
}

describe('Header', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/');
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders translated nav links with the correct hrefs', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Leistungen' })).toHaveAttribute('href', '/#services');
    expect(screen.getByRole('link', { name: 'Demo-Ablauf' })).toHaveAttribute('href', '/#demo');
  });

  it('names the new brand in the logo alt text', () => {
    renderHeader();

    const logo = screen.getByRole('link', { name: 'Zur Startseite' }).querySelector('img');

    expect(logo).toHaveAttribute('alt', messages.Header.logoAlt);
    expect(logo?.getAttribute('alt')).toContain('Autoservice Demontage');
    // next/image liefert den Pfad verschlüsselt in der Loader-Adresse aus. Geprüft wird die
    // Datei dahinter – ob ausgeliefert oder optimiert, entscheidet die Auslieferung.
    expect(decodeURIComponent(logo?.getAttribute('src') ?? '')).toContain('/Headerlogo.png');
  });

  // Die Bilddatei misst 2172×724 – genau 3:1. Weichen die Attribute davon ab, dehnt der
  // Browser das Logo (sichtbar vor dem ersten Laden der Datei).
  it('gibt die echten Bildmaße des Logos an, ohne jede Rundung', () => {
    renderHeader();

    const logo = screen.getByRole('link', { name: 'Zur Startseite' }).querySelector('img');
    const breite = Number(logo?.getAttribute('width'));
    const hoehe = Number(logo?.getAttribute('height'));

    expect(breite).toBe(2172);
    expect(hoehe).toBe(724);
    expect(breite / hoehe).toBeCloseTo(3, 10);
  });

  it('steuert die Logo-Größe über die Breite und lässt die Höhe frei', () => {
    renderHeader();

    const logo = screen.getByRole('link', { name: 'Zur Startseite' }).querySelector('img');
    const klassen = (logo?.getAttribute('class') ?? '').split(/\s+/);

    // h-auto statt einer festen Höhe: eine Höhe mit falscher Breite wäre ein gezerrtes Logo.
    expect(klassen).toContain('h-auto');
    expect(klassen).toContain('w-40');
    expect(klassen).toContain('md:w-56');
    expect(klassen.some((k) => /^h-\d+$/.test(k))).toBe(false);

    // Die ausgelieferte Variante bleibt an der tatsächlichen Breite begrenzt.
    expect(logo).toHaveAttribute('sizes', expect.stringContaining('252px'));
  });

  it('smooth-scrolls instead of navigating when already on the homepage', () => {
    usePathnameMock.mockReturnValue('/');
    renderHeader();

    const scrollIntoView = vi.fn();
    const section = document.createElement('section');
    section.id = 'services';
    section.scrollIntoView = scrollIntoView;
    document.body.appendChild(section);

    fireEvent.click(screen.getByRole('link', { name: 'Leistungen' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    document.body.removeChild(section);
  });

  it('scrolls to the demo section through the same mechanism', () => {
    usePathnameMock.mockReturnValue('/');
    renderHeader();

    const scrollIntoView = vi.fn();
    const section = document.createElement('section');
    section.id = 'demo';
    section.scrollIntoView = scrollIntoView;
    document.body.appendChild(section);

    fireEvent.click(screen.getByRole('link', { name: 'Demo-Ablauf' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    document.body.removeChild(section);
  });

  it('does not intercept the click when navigating from another page', () => {
    usePathnameMock.mockReturnValue('/impressum');
    renderHeader();

    const scrollIntoView = vi.fn();
    const section = document.createElement('section');
    section.id = 'services';
    section.scrollIntoView = scrollIntoView;
    document.body.appendChild(section);

    fireEvent.click(screen.getByRole('link', { name: 'Leistungen' }));

    expect(scrollIntoView).not.toHaveBeenCalled();
    document.body.removeChild(section);
  });

  it('toggles the mobile menu', () => {
    usePathnameMock.mockReturnValue('/');
    renderHeader();

    const toggle = screen.getByLabelText('Menu öffnen');
    fireEvent.click(toggle);

    expect(screen.getByLabelText('Menu schließen')).toBeInTheDocument();
  });

  const openMobileMenu = () => {
    fireEvent.click(screen.getByLabelText('Menu öffnen'));
  };

  it('closes the mobile menu on a pointer press outside of it', () => {
    renderHeader();
    openMobileMenu();

    fireEvent.pointerDown(document.body);

    expect(screen.getByLabelText('Menu öffnen')).toBeInTheDocument();
  });

  it('keeps the mobile menu open on a pointer press inside of it', () => {
    renderHeader();
    openMobileMenu();

    const mobileMenu = document.querySelectorAll('nav')[1];
    fireEvent.pointerDown(mobileMenu);

    expect(screen.getByLabelText('Menu schließen')).toBeInTheDocument();
  });

  it('does not close the mobile menu when the language switcher inside is used', () => {
    renderHeader();
    openMobileMenu();

    fireEvent.pointerDown(screen.getAllByLabelText('Sprache')[1]);

    expect(screen.getByLabelText('Menu schließen')).toBeInTheDocument();
  });

  it('still closes the mobile menu when its toggle button is clicked again', () => {
    renderHeader();
    openMobileMenu();

    fireEvent.click(screen.getByLabelText('Menu schließen'));

    expect(screen.getByLabelText('Menu öffnen')).toBeInTheDocument();
  });
});
