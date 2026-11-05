import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';
import BookingProvider, { useBookingService } from '../BookingProvider';
import AppointmentForm from '../AppointmentForm';
import deMessages from '../../../messages/de.json';
import { SERVICE_IDS, type ServiceId } from '@/lib/services';

const { submitMock } = vi.hoisted(() => ({
  submitMock: vi.fn(async () => null),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/termin-anfrage'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock('@/lib/appointment/actions', () => ({
  submitAppointmentRequest: submitMock,
}));

const MIN = '2026-05-08';
const MAX = '2027-05-08';

/** Bringt – wie der CTA im Service-Dialog – zuerst die Leistung bei und öffnet dann das Formular. */
function Harness({ seed }: { seed?: { id: ServiceId; heading: string; spaeter?: boolean } }) {
  const [opened, setOpened] = useState(!seed || seed.spaeter === true);
  const { selectService } = useBookingService();

  return (
    <>
      <button
        onClick={() => {
          if (seed) {
            selectService(seed);
          }
          setOpened(true);
        }}
      >
        Termin öffnen
      </button>
      {opened && <AppointmentForm minDate={MIN} maxDate={MAX} />}
    </>
  );
}

function renderForm(seed?: { id: ServiceId; heading: string; spaeter?: boolean }) {
  const result = render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <BookingProvider>
        <Harness seed={seed} />
      </BookingProvider>
    </NextIntlClientProvider>
  );

  // Der Regelfall: der Dialog-CTA setzt die Leistung, *dann* erscheint das Formular.
  if (seed && seed.spaeter !== true) {
    fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen' }));
  }

  return result;
}

describe('AppointmentForm', () => {
  beforeEach(() => {
    submitMock.mockReset();
    submitMock.mockResolvedValue(null);
  });

  it('zeigt alle Felder der Terminanfrage mit übersetzten Labels', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 1, name: 'Termin anfragen' })).toBeInTheDocument();

    for (const label of [
      'Name',
      'Telefonnummer',
      'E-Mail',
      'Gewünschter Service',
      'Gewünschter Termin',
      'Bemerkung',
    ]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: 'Terminanfrage senden' })).toBeInTheDocument();
    expect(screen.getByText('Mit * markierte Felder sind Pflichtangaben.')).toBeInTheDocument();
  });

  it('schickt die Feldnamen, die das Server-Schema erwartet', () => {
    const { container } = renderForm();

    const form = container.querySelector('form')!;
    const names = [...form.querySelectorAll('[name]')].map((el) => (el as HTMLInputElement).name);

    // Die sechs Felder des Schemas – plus die Sprache, die der Server in der Action nicht selbst
    // ermitteln kann.
    expect(names).toEqual(['locale', 'name', 'phone', 'email', 'service', 'date', 'note']);
  });

  it('bietet genau die bekannten Leistungen als Auswahl an', () => {
    renderForm();

    const select = screen.getByLabelText(new RegExp('Gewünschter Service'));
    const options = within(select).getAllByRole('option');

    expect(options).toHaveLength(SERVICE_IDS.length + 1); // + Platzhalter
    expect(options[0]).toHaveTextContent('Bitte Service auswählen');
    expect(options.slice(1).map((option) => option.getAttribute('value'))).toEqual([
      ...SERVICE_IDS,
    ]);
  });

  it('wählt die aus dem Dialog mitgebrachte Leistung voraus', () => {
    renderForm({ id: 'bremsen', heading: 'Bremsenservice' });

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('bremsen');
  });

  it('lässt die Serviceauswahl leer, wenn keine Leistung mitgebracht wurde', () => {
    renderForm();

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('');
  });

  it('übergibt den Terminrahmen an den Kalender und legt den Wert in ein verstecktes Feld', () => {
    const { container } = renderForm();

    const trigger = container.querySelector('button[data-min-date]')!;
    expect(trigger).toHaveAttribute('data-min-date', MIN);
    expect(trigger).toHaveAttribute('data-max-date', MAX);
    expect(trigger.getAttribute('aria-label')).toMatch(/Termin/);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    const hidden = container.querySelector('input[name="date"]')!;
    expect(hidden).toHaveAttribute('type', 'hidden');
    expect(hidden).toHaveValue('');
  });

  it('öffnet den Kalender, sperrt Vergangenheitstage und schreibt den gewählten Tag ins Formular', async () => {
    const { container } = renderForm();

    fireEvent.click(container.querySelector('button[data-min-date]')!);

    await screen.findByRole('grid');

    // react-day-picker legt das Datum auf die Zelle, der Knopf daneben ist der CTA.
    const dayButton = (iso: string) =>
      document.querySelector(`td[data-day="${iso}"] button`) as HTMLButtonElement | null;

    expect(dayButton('2026-05-01')).toBeDisabled(); // vor dem frühesten Termin
    expect(dayButton('2026-05-08')).toBeEnabled(); // der früheste wählbare Tag

    fireEvent.click(dayButton('2026-05-15')!);

    expect(container.querySelector('input[name="date"]')).toHaveValue('2026-05-15');
    // Der Rahmen bleibt eingehalten: der Tag liegt vor dem spätesten Termin.
    expect(container.querySelector('button[data-min-date]')!.getAttribute('aria-label')).toContain(
      '2026'
    );
  });

  it('hat die native Browservalidierung aus, damit das Schema meldet', () => {
    const { container } = renderForm();

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });

  it('übernimmt eine Leistung, die erst nach dem Formular eintrifft', () => {
    renderForm({ id: 'reparatur', heading: 'Reparaturen', spaeter: true });

    // Erst leer, dann der Klick des Dialog-CTA.
    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen' }));

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('reparatur');
  });
});
