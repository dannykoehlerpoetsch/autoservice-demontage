import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';
import BookingProvider, { useBooking } from '../BookingProvider';
import AppointmentConfirmation from '../AppointmentConfirmation';
import type { AppointmentInput } from '@/lib/appointment/schema';
import deMessages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/termin-anfrage/bestaetigung'),
  useRouter: vi.fn(() => ({ push: pushMock, replace: vi.fn() })),
}));

/**
 * The confirmation page may not claim anything it does not do: no booking, no mail, no booking
 * number. Checked are the summary, the way back into the form, the preview – and what happens when
 * the state is not (or no longer) there.
 */

const FULL_APPOINTMENT = {
  name: 'Jennifer Krüger',
  phone: '+49 170 1234567',
  email: 'j.krueger@beispiel.de',
  service: 'bremsen',
  date: '2026-11-20',
  note: 'Bremsen quietschen beim Anhalten.',
} as const satisfies AppointmentInput;

const WITHOUT_CONTACT = {
  ...FULL_APPOINTMENT,
  phone: '',
  email: '',
  note: '',
} as const satisfies AppointmentInput;

function SummaryView({ appointment }: { appointment: AppointmentInput }) {
  const { completeRequest } = useBooking();
  const [fertig, setFertig] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          completeRequest(appointment);
          setFertig(true);
        }}
      >
        Demo-Anfrage abschließen
      </button>
      {fertig && <AppointmentConfirmation />}
    </>
  );
}

function renderConfirmation(opts: { appointment?: AppointmentInput; locale?: 'de' | 'en' } = {}) {
  const { appointment = FULL_APPOINTMENT, locale = 'de' } = opts;

  const result = render(
    <NextIntlClientProvider locale={locale} messages={locale === 'de' ? deMessages : enMessages}>
      <BookingProvider>
        <SummaryView appointment={appointment} />
      </BookingProvider>
    </NextIntlClientProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Demo-Anfrage abschließen' }));

  return result;
}

function openPreview(buttonName = 'E-Mail-Vorschau ansehen') {
  fireEvent.click(screen.getByRole('button', { name: buttonName }));
  return screen.getByRole('dialog');
}

describe('AppointmentConfirmation', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('collects every detail with the translated field names', () => {
    renderConfirmation();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Demo-Anfrage erfolgreich abgeschlossen' })
    ).toBeInTheDocument();

    const summary = document.querySelector('dl');
    expect(summary).not.toBeNull();

    for (const [field, value] of [
      [deMessages.Appointment.fields.name, FULL_APPOINTMENT.name],
      [deMessages.Appointment.fields.service, 'Bremsenservice'],
      [deMessages.Appointment.fields.date, 'Freitag, 20. November 2026'],
      [deMessages.Appointment.fields.email, FULL_APPOINTMENT.email],
      [deMessages.Appointment.fields.phone, FULL_APPOINTMENT.phone],
      [deMessages.Appointment.fields.note, FULL_APPOINTMENT.note],
    ]) {
      expect(summary!.textContent, field).toContain(field);
      expect(summary!.textContent, value).toContain(value);
    }
  });

  it('states clearly that nothing was sent and nothing was booked', () => {
    renderConfirmation();

    expect(screen.getByText(/Simulation für ein Frontend-Portfolio/)).toBeInTheDocument();
    expect(screen.getByText(/Deine Eingaben wurden nicht an eine Werkstatt/)).toBeInTheDocument();
    expect(screen.getByText(/Es wurde kein echter Termin gebucht/)).toBeInTheDocument();
  });

  it('shows no invented booking number and no send button', () => {
    renderConfirmation();

    const buttons = screen.getAllByRole('button').map((k) => k.textContent ?? '');

    expect(buttons.some((text) => /senden|versend|buchen/i.test(text))).toBe(false);
    expect(screen.getByText('Demo-Anfrage erfolgreich abgeschlossen')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[#/][0-9a-f]{8}-[0-9a-f]{4}/i);
  });

  it('labels empty optional fields as "Not provided"', () => {
    renderConfirmation({ appointment: { ...WITHOUT_CONTACT, note: 'Bremsen quietschen.' } });

    expect(screen.getAllByText('Nicht angegeben')).toHaveLength(2);
    expect(screen.getByText('Bremsen quietschen.')).toBeInTheDocument();
  });

  it('shows its own notice for an empty note', () => {
    renderConfirmation({ appointment: { ...FULL_APPOINTMENT, note: '' } });

    expect(screen.getByText(deMessages.AppointmentConfirmation.noNote)).toBeInTheDocument();
  });

  it('opens the email preview with sender, recipient, subject and body', () => {
    renderConfirmation();
    const dialog = openPreview();

    expect(
      within(dialog).getByRole('heading', { name: 'Vorschau der Bestätigungs-E-Mail' })
    ).toBeInTheDocument();

    for (const value of [
      deMessages.DemoEmail.from,
      FULL_APPOINTMENT.email,
      'Deine Demo-Terminanfrage – Bremsenservice',
      'Hallo Jennifer Krüger,',
      'Terminwunsch: Freitag, 20. November 2026',
      'Es wurde keine E-Mail versendet',
    ]) {
      expect(dialog).toHaveTextContent(value);
    }
  });

  it('closes the preview with Escape', async () => {
    renderConfirmation();
    const trigger = screen.getByRole('button', { name: 'E-Mail-Vorschau ansehen' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // After closing, focus sits back in the document and not in a
    // detached node. That it lands on the trigger is checked by the E2E run in the real
    // browser – jsdom does not replay Radix's focus restoration.
    expect(document.contains(document.activeElement)).toBe(true);
  });

  it('closes the preview through the button', () => {
    renderConfirmation();
    const dialog = openPreview();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Vorschau schließen' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a long note in full without truncating it', () => {
    const longNote = `${'Bremsen quietschen beim Anhalten. '.repeat(12)}`.trim();
    renderConfirmation({ appointment: { ...FULL_APPOINTMENT, note: longNote } });

    expect(screen.getByText(longNote)).toBeInTheDocument();

    const dialog = openPreview();
    expect(dialog).toHaveTextContent(longNote);
  });

  it('leads back to the form without losing the details', () => {
    renderConfirmation();

    fireEvent.click(screen.getByRole('button', { name: 'Angaben bearbeiten' }));

    expect(pushMock).toHaveBeenCalledWith('/termin-anfrage');
    // The summary is kept – the same request is edited.
    expect(screen.getByText(FULL_APPOINTMENT.name)).toBeInTheDocument();
  });

  it('starts a new request and clears the state', () => {
    renderConfirmation();

    fireEvent.click(screen.getByRole('button', { name: 'Neue Demo-Anfrage' }));

    expect(pushMock).toHaveBeenCalledWith('/termin-anfrage');
    // Without details there is nothing to summarise – the view flips to the message.
    expect(
      screen.getByRole('heading', { name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeInTheDocument();
  });

  it('leads back to the homepage', () => {
    renderConfirmation();

    const homeLink = screen.getByRole('link', { name: /Zurück zur Startseite/ });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('translatedly points at the lost temporary state when there is none', () => {
    render(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <BookingProvider>
          <AppointmentConfirmation />
        </BookingProvider>
      </NextIntlClientProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Deine Demo-Anfrage ist nicht mehr verfügbar. Da dieses Projekt keine Daten speichert, kannst du jederzeit eine neue Anfrage erstellen.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Neue Demo-Anfrage stellen' })).toHaveAttribute(
      'href',
      '/termin-anfrage'
    );
  });

  describe('English', () => {
    it('translates the summary and the preview', () => {
      renderConfirmation({ locale: 'en' });

      expect(
        screen.getByRole('heading', { level: 1, name: 'Demo request completed' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View email preview' })).toBeInTheDocument();

      const dialog = openPreview('View email preview');
      expect(
        within(dialog).getByRole('heading', { name: 'Confirmation email preview' })
      ).toBeInTheDocument();
      expect(dialog).toHaveTextContent('Hello Jennifer Krüger,');
      expect(dialog).toHaveTextContent('Preferred date: Friday, November 20, 2026');
      expect(dialog).toHaveTextContent('No email was sent');
      expect(enMessages.AppointmentConfirmation.title).toBe('Demo request completed');
    });

    it('translates the service name in the summary', () => {
      renderConfirmation({ locale: 'en' });

      expect(screen.getByText('Brake service')).toBeInTheDocument();
      expect(screen.queryByText('Not provided')).not.toBeInTheDocument();
    });
  });
});
