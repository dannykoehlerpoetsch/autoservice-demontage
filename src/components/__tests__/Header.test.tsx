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
    // next/image delivers the path encoded inside the loader URL. What is checked is the
    // File behind it – whether served or optimised is decided by the delivery.
    expect(decodeURIComponent(logo?.getAttribute('src') ?? '')).toContain('/Headerlogo.png');
  });

  // The image file measures 2172×724 – exactly 3:1. If the attributes deviate from that, the
  // browser stretches the logo (visible before the file loads for the first time).
  it('reports the real logo image dimensions without any rounding', () => {
    renderHeader();

    const logo = screen.getByRole('link', { name: 'Zur Startseite' }).querySelector('img');
    const width = Number(logo?.getAttribute('width'));
    const height = Number(logo?.getAttribute('height'));

    expect(width).toBe(2172);
    expect(height).toBe(724);
    expect(width / height).toBeCloseTo(3, 10);
  });

  it('controls the logo size by width and leaves the height free', () => {
    renderHeader();

    const logo = screen.getByRole('link', { name: 'Zur Startseite' }).querySelector('img');
    const classes = (logo?.getAttribute('class') ?? '').split(/\s+/);

    // h-auto instead of a fixed height: a height with the wrong width would be a stretched logo.
    expect(classes).toContain('h-auto');
    expect(classes).toContain('w-40');
    expect(classes).toContain('md:w-56');
    expect(classes.some((k) => /^h-\d+$/.test(k))).toBe(false);

    // The delivered variant stays limited to the actual width.
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
