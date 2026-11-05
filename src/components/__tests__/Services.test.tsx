import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import BookingProvider, { useBookingService } from '../BookingProvider';
import Services from '../Services';
import { SERVICE_IDS } from '@/lib/services';
import deMessages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: pushMock, replace: vi.fn() })),
}));

/** Spioniert, was der Dialog im Booking-Context hinterlässt. */
function ServiceProbe() {
  const { service } = useBookingService();
  return <span data-testid="probe">{service ? `${service.id}|${service.heading}` : 'leer'}</span>;
}

function renderServices() {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <BookingProvider>
        <Services />
        <ServiceProbe />
      </BookingProvider>
    </NextIntlClientProvider>
  );
}

describe('Services', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders one clickable card per translated service', () => {
    renderServices();

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(deMessages.Services.items.length);

    for (const { heading, service } of deMessages.Services.items) {
      expect(screen.getByText(heading)).toBeInTheDocument();
      expect(screen.getByText(service)).toBeInTheDocument();
    }
  });

  it('opens a dialog with heading, details, one CTA and one close control', () => {
    renderServices();
    const [first] = deMessages.Services.items;

    fireEvent.click(screen.getByText(first.heading));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: first.heading })).toBeInTheDocument();
    expect(screen.getByText(first.details)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Jetzt Termin für ${first.heading} buchen` })
    ).toBeInTheDocument();
    // Kein zweiter Schließen-Button mehr unter dem Text.
    expect(within(dialog).getAllByRole('button')).toHaveLength(2);
  });

  it('shows the details of the service that was clicked', () => {
    renderServices();
    const brakes = deMessages.Services.items[3];

    fireEvent.click(screen.getByText(brakes.heading));

    expect(screen.getByText(brakes.details)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: brakes.heading })).toBeInTheDocument();
  });

  it('closes the dialog via the close button in the corner', () => {
    renderServices();
    const [first] = deMessages.Services.items;

    fireEvent.click(screen.getByText(first.heading));
    expect(screen.queryByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stores the clicked service and navigates to the appointment form', () => {
    renderServices();
    const oilChange = deMessages.Services.items[4];

    fireEvent.click(screen.getByText(oilChange.heading));
    fireEvent.click(
      screen.getByRole('button', { name: `Jetzt Termin für ${oilChange.heading} buchen` })
    );

    expect(screen.getByTestId('probe')).toHaveTextContent(`${oilChange.id}|${oilChange.heading}`);
    expect(pushMock).toHaveBeenCalledWith('/termin-anfrage');
    // Der Dialog ist geschlossen, damit hinter der neuen Seite nichts offen bleibt.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers a stable id for every service in both locales, in the same order', () => {
    for (const messages of [deMessages, enMessages]) {
      expect(messages.Services.items.map((item) => item.id)).toEqual([...SERVICE_IDS]);
    }
  });

  it('gives every service a short and a detailed description in both locales', () => {
    for (const messages of [deMessages, enMessages]) {
      expect(messages.Services.items).toHaveLength(8);
      for (const item of messages.Services.items) {
        expect(item.service).toBeTruthy();
        expect(item.details).toBeTruthy();
      }
    }
  });
});
