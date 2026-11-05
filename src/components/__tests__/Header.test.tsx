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
    expect(screen.getByRole('link', { name: 'Anfahrt' })).toHaveAttribute('href', '/#anfahrt');
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
