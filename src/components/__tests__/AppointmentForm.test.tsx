import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';
import BookingProvider, { useBookingService } from '../BookingProvider';
import AppointmentForm from '../AppointmentForm';
import { MAX_ADVANCE_DAYS } from '@/lib/appointment/schema';
import { addIsoDays, todayIso } from '@/lib/dates';
import { SERVICE_IDS, type ServiceId } from '@/lib/services';
import deMessages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/termin-anfrage'),
  useRouter: vi.fn(() => ({ push: pushMock, replace: vi.fn() })),
}));

/**
 * Das Formular ist der einzige Prüfer der Eingaben – diese Datei hält darum fest, was eine
 * gültige Anfrage hinterlässt, was abgewiesen wird und dass dabei nichts das Browserfenster
 * verlässt. Der Kalender selbst wird vom E2E-Lauf geprüft; hier zählt der Wert im Formular.
 */

type SondeErgebnis = {
  serviceId: ServiceId | null;
  request?: {
    service: ServiceId;
    name: string;
    phone: string;
    email: string;
    note: string;
    date: string;
  };
};

/** Spioniert den Zustand, den das Formular im Provider hinterlässt. */
function Sonde() {
  const { serviceId, request } = useBookingService();

  return <span data-testid="sonde">{JSON.stringify({ serviceId, request })}</span>;
}

function sonde(): SondeErgebnis {
  return JSON.parse(screen.getByTestId('sonde').textContent ?? '{}') as SondeErgebnis;
}

/**
 * Rahmen wie in der App: Der Provider hängt oberhalb, das Formular geht beim Dialog-CTA auf
 * und verschwindet wieder. Ein neuer Schlüssel zwingt beim Öffnen dasselbe Neumontieren, das
 * auch die echte Navigation tut – nur so zeigt sich, ob das Formular aus dem vorbefüllt.
 */
function Formularrahmen({ service }: { service?: ServiceId }) {
  const [offen, setOffen] = useState(false);
  const [schluessel, setSchluessel] = useState(0);
  const { selectService } = useBookingService();

  return (
    <>
      <button onClick={() => service && selectService(service)}>Leistung wählen</button>
      <button
        onClick={() => {
          setSchluessel((k) => k + 1);
          setOffen(true);
        }}
      >
        Termin öffnen
      </button>
      <button onClick={() => setOffen(false)}>Formular schließen</button>
      {offen && <AppointmentForm key={schluessel} />}
    </>
  );
}

function renderFormular(
  opts: { service?: ServiceId; locale?: 'de' | 'en'; vorDemOeffnenWaehlen?: boolean } = {}
) {
  const locale = opts.locale ?? 'de';
  const result = render(
    <NextIntlClientProvider locale={locale} messages={locale === 'de' ? deMessages : enMessages}>
      <BookingProvider>
        <Formularrahmen service={opts.service} />
        <Sonde />
      </BookingProvider>
    </NextIntlClientProvider>
  );

  // Der Regelfall: erst setzt der Dialog-CTA die Leistung, dann erscheint das Formular.
  if (opts.service && opts.vorDemOeffnenWaehlen !== false) {
    fireEvent.click(screen.getByRole('button', { name: 'Leistung wählen' }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen' }));

  return result;
}

function feld(name: string) {
  return document.getElementById(`field-${name}`) as HTMLInputElement | HTMLTextAreaElement;
}

function text(name: string, wert: string) {
  fireEvent.change(feld(name), { target: { value: wert } });
}

function service(id: string) {
  fireEvent.change(document.getElementById('field-service') as HTMLSelectElement, {
    target: { value: id },
  });
}

/** Klickt den letzten wählbaren Tag im Kalender und gibt seinen Wert zurück. */
function waehleTag() {
  fireEvent.click(document.querySelector('button[data-min-date]')!);
  const tage = document.querySelectorAll('td[data-day] button:not([disabled])');
  fireEvent.click(tage[tage.length - 1]);

  return (document.querySelector('input[name="date"]') as HTMLInputElement).value;
}

function absenden() {
  fireEvent.submit(document.querySelector('form')!);
}

/** Füllt, was das Formular gültig finden muss, und liefert den gewählten Termin. */
function gültigAusfuellen() {
  text('name', 'Jennifer Krüger');
  text('phone', '+49 170 1234567');
  text('email', 'j.krueger@beispiel.de');
  service('bremsen');

  return waehleTag();
}

describe('AppointmentForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('zeigt alle Felder mit übersetzten Labels, Pflichtmarken und Demo-Hinweis', () => {
    renderFormular();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Demo-Terminanfrage' })
    ).toBeInTheDocument();

    for (const label of [
      'Name',
      'Telefonnummer',
      'E-Mail',
      'Gewünschter Service',
      'Terminwunsch',
      'Bemerkung',
    ]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: 'Demo-Anfrage abschließen' })).toBeInTheDocument();
    expect(screen.getByText(/Es werden keine Daten versendet/)).toBeInTheDocument();
    expect(screen.getByText(/Testdaten genügen/)).toBeInTheDocument();

    // Nur die drei Pflichtfelder tragen ein Sternchen, die übrigen heißen "freiwillig".
    expect(screen.getAllByText('*')).toHaveLength(3);
    expect(screen.getAllByText('(freiwillig)')).toHaveLength(3);
  });

  it('schickt genau die Felder des Schemas – ohne Sprache und ohne versteckte Zusätze', () => {
    const { container } = renderFormular();

    const namen = [...container.querySelectorAll('form [name]')].map(
      (el) => (el as HTMLInputElement).name
    );

    expect(namen).toEqual(['name', 'phone', 'email', 'service', 'date', 'note']);
    expect(container.querySelector('input[name="locale"]')).toBeNull();
  });

  it('hat die native Browservalidierung aus, damit das Schema meldet', () => {
    const { container } = renderFormular();

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });

  it('bietet genau die bekannten Leistungen als Auswahl an', () => {
    renderFormular();

    const options = within(screen.getByLabelText(new RegExp('Gewünschter Service'))).getAllByRole(
      'option'
    );

    expect(options).toHaveLength(SERVICE_IDS.length + 1); // + Platzhalter
    expect(options[0]).toHaveTextContent('Bitte Service auswählen');
    expect(options.slice(1).map((option) => option.getAttribute('value'))).toEqual([
      ...SERVICE_IDS,
    ]);
  });

  it('wählt die aus dem Dialog mitgebrachte Leistung voraus', () => {
    renderFormular({ service: 'bremsen' });

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('bremsen');
  });

  it('lässt die Serviceauswahl leer, wenn keine Leistung mitgebracht wurde', () => {
    renderFormular();

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('');
  });

  it('nimmt eine Leistung, die erst nach dem Formular eintrifft', () => {
    renderFormular({ service: 'bremsen', vorDemOeffnenWaehlen: false });
    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Leistung wählen' }));

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('bremsen');
  });

  it('legt den Terminrahmen auf den heutigen Tag in der Zeitzone der Werkstatt', () => {
    const { container } = renderFormular();

    const ausloeser = container.querySelector('button[data-min-date]')!;
    expect(ausloeser).toHaveAttribute('data-min-date', todayIso());
    expect(ausloeser).toHaveAttribute('data-max-date', addIsoDays(todayIso(), MAX_ADVANCE_DAYS));

    const versteckt = container.querySelector('input[name="date"]')!;
    expect(versteckt).toHaveAttribute('type', 'hidden');
    expect(versteckt).toHaveValue('');
  });

  it('öffnet den Kalender, sperrt Vergangenheitstage und schreibt den Tag ins Formular', () => {
    const { container } = renderFormular();

    fireEvent.click(container.querySelector('button[data-min-date]')!);

    const tagsZelle = (iso: string) =>
      document.querySelector(`td[data-day="${iso}"] button`) as HTMLButtonElement | null;

    expect(tagsZelle(addIsoDays(todayIso(), -1))).toBeDisabled();
    expect(tagsZelle(todayIso())).toBeEnabled();

    fireEvent.click(tagsZelle(addIsoDays(todayIso(), 3))!);

    expect(container.querySelector('input[name="date"]')).toHaveValue(addIsoDays(todayIso(), 3));
  });

  describe('Abschließen', () => {
    beforeEach(() => {
      renderFormular();
    });

    it('legt eine gültige Anfrage in den Provider und wechselt zur Zusammenfassung', () => {
      const termin = gültigAusfuellen();
      absenden();

      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');

      const { serviceId, request } = sonde();
      expect(serviceId).toBe('bremsen');
      expect(request).toMatchObject({
        service: 'bremsen',
        name: 'Jennifer Krüger',
        phone: '+49 170 1234567',
        email: 'j.krueger@beispiel.de',
        date: termin,
      });
    });

    it('lässt freiwillige Felder leer und schickt die Anfrage trotzdem durch', () => {
      text('name', 'Max Mustermann');
      const termin = waehleTag();
      service('oelwechsel');
      absenden();

      expect(screen.queryByText(/Bitte dieses Feld ausfüllen/)).not.toBeInTheDocument();
      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');
      expect(sonde().request).toMatchObject({
        service: 'oelwechsel',
        name: 'Max Mustermann',
        phone: '',
        email: '',
        note: '',
        date: termin,
      });
    });

    it('übergibt eine lange Bemerkung ungekürzt', () => {
      const lang = 'Bremsen quietschen beim Anhalten. '.repeat(20).trim();
      gültigAusfuellen();
      text('note', lang);
      absenden();

      expect(sonde().request?.note).toBe(lang);
    });

    it('verschickt nichts und speichert nichts', () => {
      const fetchSpy = vi.fn();
      const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
      vi.stubGlobal('fetch', fetchSpy);

      gültigAusfuellen();
      text('note', 'Bremsen quietschen.');
      absenden();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(document.cookie).toBe('');
    });

    it('meldet leere Pflichtfelder und bleibt auf dem Formular', () => {
      absenden();

      expect(pushMock).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Bitte prüf folgende Felder');

      for (const feldName of ['name', 'service', 'date']) {
        expect(document.getElementById(`error-${feldName}`)).toHaveTextContent(
          'Bitte dieses Feld ausfüllen.'
        );
      }

      // Freiwillige Felder werden nicht angemahnt.
      expect(document.getElementById('error-phone')).toBeNull();
      expect(document.getElementById('error-email')).toBeNull();
    });

    it('lehnt eine ungültige E-Mail nur ab, wenn sie eingetragen ist', () => {
      gültigAusfuellen();
      text('email', 'max@beispiel');
      absenden();

      expect(pushMock).not.toHaveBeenCalled();
      expect(document.getElementById('error-email')).toHaveTextContent(
        'Bitte eine gültige E-Mail-Adresse angeben.'
      );

      text('email', '');
      absenden();
      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');
    });

    it('lehnt eine ungültige Telefonnummer nur ab, wenn sie eingetragen ist', () => {
      gültigAusfuellen();
      text('phone', 'nine one two');
      absenden();

      expect(pushMock).not.toHaveBeenCalled();
      expect(document.getElementById('error-phone')).toBeInTheDocument();

      text('phone', '');
      absenden();
      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');
    });

    it('wehrt ein Termindatum in der Vergangenheit auch als Feldwert ab', () => {
      gültigAusfuellen();
      (document.querySelector('input[name="date"]') as HTMLInputElement).value = '2020-01-02';
      absenden();

      expect(pushMock).not.toHaveBeenCalled();
      expect(document.getElementById('error-date')).toHaveTextContent('Vergangenheit');
    });

    it('meldet zu lange Eingaben mit der Grenze aus dem Schema', () => {
      gültigAusfuellen();
      text('note', 'x'.repeat(1001));
      absenden();

      expect(document.getElementById('error-note')).toHaveTextContent('1000');
    });

    it('zeigt Einschleuseversuche als Text und meldet pro Feld nur einmal', () => {
      text('name', '<script>alert(1)</script>');
      absenden();

      expect(document.getElementById('error-name')).toHaveTextContent('Bitte nur Buchstaben');
      expect(document.querySelectorAll('form script')).toHaveLength(0);
    });

    it('stellt die Angaben einer abgeschlossenen Anfrage wieder bereit', () => {
      gültigAusfuellen();
      const termin = (document.querySelector('input[name="date"]') as HTMLInputElement).value;
      text('note', 'Bremsen quietschen.');
      absenden();

      // Wie ein Weggehen und Zurückkehren: das Formular geht unter, der Provider bleibt.
      fireEvent.click(screen.getByRole('button', { name: 'Formular schließen' }));
      fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen' }));

      expect(feld('name')).toHaveValue('Jennifer Krüger');
      expect(feld('email')).toHaveValue('j.krueger@beispiel.de');
      expect(feld('note')).toHaveValue('Bremsen quietschen.');
      expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('bremsen');
      expect(document.querySelector('input[name="date"]')).toHaveValue(termin);
    });
  });

  describe('Englisch', () => {
    it('übersetzt Labels, Hinweis und Knopf', () => {
      renderFormular({ locale: 'en' });

      expect(
        screen.getByRole('heading', { level: 1, name: 'Demo appointment request' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Complete demo request' })).toBeInTheDocument();
      expect(screen.getByText(/This is an interactive demonstration/)).toBeInTheDocument();
      expect(screen.getAllByText('(optional)')).toHaveLength(3);
      expect(enMessages.Appointment.submit).toBe('Complete demo request');
    });
  });
});
