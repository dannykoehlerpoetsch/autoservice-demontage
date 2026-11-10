import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';
import BookingProvider, { useBookingService } from '../BookingProvider';
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
 * Die Bestätigungsseite darf nichts behaupten, was sie nicht tut: keine Buchung, keine Mail,
 * keine Buchungsnnummer. Geprüft werden die Zusammenfassung, der Weg zurück ins Formular,
 * die Vorschau – und was passiert, wenn der Zustand nicht (mehr) da ist.
 */

const VOLLE = {
  name: 'Jennifer Krüger',
  phone: '+49 170 1234567',
  email: 'j.krueger@beispiel.de',
  service: 'bremsen',
  date: '2026-11-20',
  note: 'Bremsen quietschen beim Anhalten.',
} as const satisfies AppointmentInput;

const OHNE_KONTAKT = {
  ...VOLLE,
  phone: '',
  email: '',
  note: '',
} as const satisfies AppointmentInput;

function Zusammenfassung({ angaben }: { angaben: AppointmentInput }) {
  const { completeRequest } = useBookingService();
  const [fertig, setFertig] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          completeRequest(angaben);
          setFertig(true);
        }}
      >
        Demo-Anfrage abschließen
      </button>
      {fertig && <AppointmentConfirmation />}
    </>
  );
}

function renderBestaetigung(opts: { angaben?: AppointmentInput; locale?: 'de' | 'en' } = {}) {
  const { angaben = VOLLE, locale = 'de' } = opts;

  const result = render(
    <NextIntlClientProvider locale={locale} messages={locale === 'de' ? deMessages : enMessages}>
      <BookingProvider>
        <Zusammenfassung angaben={angaben} />
      </BookingProvider>
    </NextIntlClientProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Demo-Anfrage abschließen' }));

  return result;
}

function vorschauOeffnen(knopfName = 'E-Mail-Vorschau ansehen') {
  fireEvent.click(screen.getByRole('button', { name: knopfName }));
  return screen.getByRole('dialog');
}

describe('AppointmentConfirmation', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('fasst alle Angaben mit den übersetzten Feldnamen zusammen', () => {
    renderBestaetigung();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Demo-Anfrage erfolgreich abgeschlossen' })
    ).toBeInTheDocument();

    const zusammenfassung = document.querySelector('dl');
    expect(zusammenfassung).not.toBeNull();

    for (const [feld, wert] of [
      [deMessages.Appointment.fields.name, VOLLE.name],
      [deMessages.Appointment.fields.service, 'Bremsenservice'],
      [deMessages.Appointment.fields.date, 'Freitag, 20. November 2026'],
      [deMessages.Appointment.fields.email, VOLLE.email],
      [deMessages.Appointment.fields.phone, VOLLE.phone],
      [deMessages.Appointment.fields.note, VOLLE.note],
    ]) {
      expect(zusammenfassung!.textContent, feld).toContain(feld);
      expect(zusammenfassung!.textContent, wert).toContain(wert);
    }
  });

  it('sagt klar, dass nichts versendet und nichts gebucht wurde', () => {
    renderBestaetigung();

    expect(screen.getByText(/Simulation für ein Frontend-Portfolio/)).toBeInTheDocument();
    expect(screen.getByText(/Deine Eingaben wurden nicht an eine Werkstatt/)).toBeInTheDocument();
    expect(screen.getByText(/Es wurde kein echter Termin gebucht/)).toBeInTheDocument();
  });

  it('zeigt keine erfundene Buchungsnummer und keinen Versandknopf', () => {
    renderBestaetigung();

    const knoepfe = screen.getAllByRole('button').map((k) => k.textContent ?? '');

    expect(knoepfe.some((text) => /senden|versend|buchen/i.test(text))).toBe(false);
    expect(screen.getByText('Demo-Anfrage erfolgreich abgeschlossen')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[#/][0-9a-f]{8}-[0-9a-f]{4}/i);
  });

  it('benennt leere freiwillige Felder als „Nicht angegeben“', () => {
    renderBestaetigung({ angaben: { ...OHNE_KONTAKT, note: 'Bremsen quietschen.' } });

    expect(screen.getAllByText('Nicht angegeben')).toHaveLength(2);
    expect(screen.getByText('Bremsen quietschen.')).toBeInTheDocument();
  });

  it('zeigt für eine leere Bemerkung den eigenen Hinweis', () => {
    renderBestaetigung({ angaben: { ...VOLLE, note: '' } });

    expect(screen.getByText(deMessages.AppointmentConfirmation.noNote)).toBeInTheDocument();
  });

  it('öffnet die E-Mail-Vorschau mit Absender, Empfänger, Betreff und Text', () => {
    renderBestaetigung();
    const dialog = vorschauOeffnen();

    expect(
      within(dialog).getByRole('heading', { name: 'Vorschau der Bestätigungs-E-Mail' })
    ).toBeInTheDocument();

    for (const wert of [
      deMessages.DemoEmail.from,
      VOLLE.email,
      'Deine Demo-Terminanfrage – Bremsenservice',
      'Hallo Jennifer Krüger,',
      'Terminwunsch: Freitag, 20. November 2026',
      'Es wurde keine E-Mail versendet',
    ]) {
      expect(dialog).toHaveTextContent(wert);
    }
  });

  it('schließt die Vorschau mit Escape', async () => {
    renderBestaetigung();
    const ausloeser = screen.getByRole('button', { name: 'E-Mail-Vorschau ansehen' });
    fireEvent.click(ausloeser);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Nach dem Schließen liegt der Fokus wieder im Dokument und nicht in einem
    // entfernten Knoten. Dass er beim Auslöser landet, prüft der E2E-Lauf im echten
    // Browser – jsdom stellt die Fokus-Rückgabe von Radix nicht nach.
    expect(document.contains(document.activeElement)).toBe(true);
  });

  it('schließt die Vorschau über den Knopf', () => {
    renderBestaetigung();
    const dialog = vorschauOeffnen();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Vorschau schließen' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('zeigt eine lange Bemerkung vollständig, ohne sie zu kürzen', () => {
    const lang = `${'Bremsen quietschen beim Anhalten. '.repeat(12)}`.trim();
    renderBestaetigung({ angaben: { ...VOLLE, note: lang } });

    expect(screen.getByText(lang)).toBeInTheDocument();

    const dialog = vorschauOeffnen();
    expect(dialog).toHaveTextContent(lang);
  });

  it('führt zurück ins Formular, ohne die Angaben zu verlieren', () => {
    renderBestaetigung();

    fireEvent.click(screen.getByRole('button', { name: 'Angaben bearbeiten' }));

    expect(pushMock).toHaveBeenCalledWith('/termin-anfrage');
    // Die Zusammenfassung bleibt erhalten – bearsbeitet wird dieselbe Anfrage.
    expect(screen.getByText(VOLLE.name)).toBeInTheDocument();
  });

  it('startet eine neue Anfrage und räumt den Zustand', () => {
    renderBestaetigung();

    fireEvent.click(screen.getByRole('button', { name: 'Neue Demo-Anfrage' }));

    expect(pushMock).toHaveBeenCalledWith('/termin-anfrage');
    // Ohne Angaben ist nichts zusammenzufassen – die Ansicht kippt auf die Meldung.
    expect(
      screen.getByRole('heading', { name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeInTheDocument();
  });

  it('führt zurück zur Startseite', () => {
    renderBestaetigung();

    const nachHause = screen.getByRole('link', { name: /Zurück zur Startseite/ });
    expect(nachHause).toHaveAttribute('href', '/');
  });

  it('weist ohne Zustand übersetzt auf den verlorenen temporären Zustand hin', () => {
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

  describe('Englisch', () => {
    it('übersetzt Zusammenfassung und Vorschau', () => {
      renderBestaetigung({ locale: 'en' });

      expect(
        screen.getByRole('heading', { level: 1, name: 'Demo request completed' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View email preview' })).toBeInTheDocument();

      const dialog = vorschauOeffnen('View email preview');
      expect(
        within(dialog).getByRole('heading', { name: 'Confirmation email preview' })
      ).toBeInTheDocument();
      expect(dialog).toHaveTextContent('Hello Jennifer Krüger,');
      expect(dialog).toHaveTextContent('Preferred date: Friday, November 20, 2026');
      expect(dialog).toHaveTextContent('No email was sent');
      expect(enMessages.AppointmentConfirmation.title).toBe('Demo request completed');
    });

    it('übersetzt die Servicebezeichnung in der Zusammenfassung', () => {
      renderBestaetigung({ locale: 'en' });

      expect(screen.getByText('Brake service')).toBeInTheDocument();
      expect(screen.queryByText('Not provided')).not.toBeInTheDocument();
    });
  });
});
