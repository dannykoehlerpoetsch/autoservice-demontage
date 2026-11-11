import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';
import BookingProvider, { useBooking } from '../BookingProvider';
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
 * The form is the only validator of the input – this file therefore pins down what a valid request
 * leaves behind, what is rejected and that nothing leaves the browser window while doing so. The
 * calendar itself is checked by the E2E run; what counts here is the value inside the form.
 */

type ProbeState = {
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

/** Spies on the state the form leaves behind in the provider. */
function ProviderProbe() {
  const { serviceId, request } = useBooking();

  return <span data-testid="sonde">{JSON.stringify({ serviceId, request })}</span>;
}

function readProbe(): ProbeState {
  return JSON.parse(screen.getByTestId('sonde').textContent ?? '{}') as ProbeState;
}

/**
 * Frame like in the app: the provider hangs above, the form opens on the dialog CTA and disappears
 * again. A new key forces the same remounting on open that real navigation does – only this way it
 * shows whether the form arrives pre-filled from the dialog.
 */
function FormWrapper({ service }: { service?: ServiceId }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formKey, setSchluessel] = useState(0);
  const { selectService } = useBooking();

  return (
    <>
      <button onClick={() => service && selectService(service)}>Leistung wählen</button>
      <button
        onClick={() => {
          setSchluessel((k) => k + 1);
          setIsFormOpen(true);
        }}
      >
        Termin öffnen
      </button>
      <button onClick={() => setIsFormOpen(false)}>Formular schließen</button>
      {isFormOpen && <AppointmentForm key={formKey} />}
    </>
  );
}

function renderForm(
  opts: { service?: ServiceId; locale?: 'de' | 'en'; selectionBeforeOpen?: boolean } = {}
) {
  const locale = opts.locale ?? 'de';
  const result = render(
    <NextIntlClientProvider locale={locale} messages={locale === 'de' ? deMessages : enMessages}>
      <BookingProvider>
        <FormWrapper service={opts.service} />
        <ProviderProbe />
      </BookingProvider>
    </NextIntlClientProvider>
  );

  // The normal case: first the dialog CTA sets the service, then the form appears.
  if (opts.service && opts.selectionBeforeOpen !== false) {
    fireEvent.click(screen.getByRole('button', { name: 'Leistung wählen' }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen' }));

  return result;
}

function field(name: string) {
  return document.getElementById(`field-${name}`) as HTMLInputElement | HTMLTextAreaElement;
}

function text(name: string, value: string) {
  fireEvent.change(field(name), { target: { value: value } });
}

function service(id: string) {
  fireEvent.change(document.getElementById('field-service') as HTMLSelectElement, {
    target: { value: id },
  });
}

/** Clicks the last selectable day in the calendar and returns its value. */
function selectDay() {
  fireEvent.click(document.querySelector('button[data-min-date]')!);
  const dayButtons = document.querySelectorAll('td[data-day] button:not([disabled])');
  fireEvent.click(dayButtons[dayButtons.length - 1]);

  return (document.querySelector('input[name="date"]') as HTMLInputElement).value;
}

function submitForm() {
  fireEvent.submit(document.querySelector('form')!);
}

/** Fills whatever the form must find valid and returns the chosen appointment. */
function fillValidValues() {
  text('name', 'Jennifer Krüger');
  text('phone', '+49 170 1234567');
  text('email', 'j.krueger@beispiel.de');
  service('bremsen');

  return selectDay();
}

describe('AppointmentForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('shows all fields with translated labels, required marks and the demo notice', () => {
    renderForm();

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

    // Only the three required fields carry an asterisk, the others are labelled "optional".
    expect(screen.getAllByText('*')).toHaveLength(3);
    expect(screen.getAllByText('(freiwillig)')).toHaveLength(3);
  });

  it("sends exactly the schema's fields – without language and hidden extras", () => {
    const { container } = renderForm();

    const names = [...container.querySelectorAll('form [name]')].map(
      (el) => (el as HTMLInputElement).name
    );

    expect(names).toEqual(['name', 'phone', 'email', 'service', 'date', 'note']);
    expect(container.querySelector('input[name="locale"]')).toBeNull();
  });

  it('turns native browser validation off so the schema reports', () => {
    const { container } = renderForm();

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });

  it('offers exactly the known services as choices', () => {
    renderForm();

    const options = within(screen.getByLabelText(new RegExp('Gewünschter Service'))).getAllByRole(
      'option'
    );

    expect(options).toHaveLength(SERVICE_IDS.length + 1); // + placeholder
    expect(options[0]).toHaveTextContent('Bitte Service auswählen');
    expect(options.slice(1).map((option) => option.getAttribute('value'))).toEqual([
      ...SERVICE_IDS,
    ]);
  });

  it('preselects the service brought from the dialog', () => {
    renderForm({ service: 'bremsen' });

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('bremsen');
  });

  it('leaves the service choice empty when no service was brought along', () => {
    renderForm();

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('');
  });

  it('accepts a service that arrives only after the form', () => {
    renderForm({ service: 'bremsen', selectionBeforeOpen: false });
    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Leistung wählen' }));

    expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('bremsen');
  });

  it("anchors the appointment window to today in the workshop's timezone", () => {
    const { container } = renderForm();

    const trigger = container.querySelector('button[data-min-date]')!;
    expect(trigger).toHaveAttribute('data-min-date', todayIso());
    expect(trigger).toHaveAttribute('data-max-date', addIsoDays(todayIso(), MAX_ADVANCE_DAYS));

    const hiddenInput = container.querySelector('input[name="date"]')!;
    expect(hiddenInput).toHaveAttribute('type', 'hidden');
    expect(hiddenInput).toHaveValue('');
  });

  it('opens the calendar, blocks past days and writes the day into the form', () => {
    const { container } = renderForm();

    fireEvent.click(container.querySelector('button[data-min-date]')!);

    const dayCell = (iso: string) =>
      document.querySelector(`td[data-day="${iso}"] button`) as HTMLButtonElement | null;

    expect(dayCell(addIsoDays(todayIso(), -1))).toBeDisabled();
    expect(dayCell(todayIso())).toBeEnabled();

    fireEvent.click(dayCell(addIsoDays(todayIso(), 3))!);

    expect(container.querySelector('input[name="date"]')).toHaveValue(addIsoDays(todayIso(), 3));
  });

  describe('Finish', () => {
    beforeEach(() => {
      renderForm();
    });

    it('puts a valid request into the provider and switches to the summary', () => {
      const appointmentDate = fillValidValues();
      submitForm();

      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');

      const { serviceId, request } = readProbe();
      expect(serviceId).toBe('bremsen');
      expect(request).toMatchObject({
        service: 'bremsen',
        name: 'Jennifer Krüger',
        phone: '+49 170 1234567',
        email: 'j.krueger@beispiel.de',
        date: appointmentDate,
      });
    });

    it('leaves optional fields empty and still submits the request', () => {
      text('name', 'Max Mustermann');
      const appointmentDate = selectDay();
      service('oelwechsel');
      submitForm();

      expect(screen.queryByText(/Bitte dieses Feld ausfüllen/)).not.toBeInTheDocument();
      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');
      expect(readProbe().request).toMatchObject({
        service: 'oelwechsel',
        name: 'Max Mustermann',
        phone: '',
        email: '',
        note: '',
        date: appointmentDate,
      });
    });

    it('passes a long note unchanged', () => {
      const longNote = 'Bremsen quietschen beim Anhalten. '.repeat(20).trim();
      fillValidValues();
      text('note', longNote);
      submitForm();

      expect(readProbe().request?.note).toBe(longNote);
    });

    it('sends nothing and stores nothing', () => {
      const fetchSpy = vi.fn();
      const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
      vi.stubGlobal('fetch', fetchSpy);

      fillValidValues();
      text('note', 'Bremsen quietschen.');
      submitForm();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(document.cookie).toBe('');
    });

    it('reports empty required fields and stays on the form', () => {
      submitForm();

      expect(pushMock).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Bitte prüf folgende Felder');

      for (const fieldName of ['name', 'service', 'date']) {
        expect(document.getElementById(`error-${fieldName}`)).toHaveTextContent(
          'Bitte dieses Feld ausfüllen.'
        );
      }

      // Optional fields are not complained about.
      expect(document.getElementById('error-phone')).toBeNull();
      expect(document.getElementById('error-email')).toBeNull();
    });

    it('rejects an invalid email only when it is filled in', () => {
      fillValidValues();
      text('email', 'max@beispiel');
      submitForm();

      expect(pushMock).not.toHaveBeenCalled();
      expect(document.getElementById('error-email')).toHaveTextContent(
        'Bitte eine gültige E-Mail-Adresse angeben.'
      );

      text('email', '');
      submitForm();
      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');
    });

    it('rejects an invalid phone number only when it is filled in', () => {
      fillValidValues();
      text('phone', 'nine one two');
      submitForm();

      expect(pushMock).not.toHaveBeenCalled();
      expect(document.getElementById('error-phone')).toBeInTheDocument();

      text('phone', '');
      submitForm();
      expect(pushMock).toHaveBeenCalledWith('/termin-anfrage/bestaetigung');
    });

    it('rejects an appointment date in the past also as a field value', () => {
      fillValidValues();
      (document.querySelector('input[name="date"]') as HTMLInputElement).value = '2020-01-02';
      submitForm();

      expect(pushMock).not.toHaveBeenCalled();
      expect(document.getElementById('error-date')).toHaveTextContent('Vergangenheit');
    });

    it('reports overly long input with the limit from the schema', () => {
      fillValidValues();
      text('note', 'x'.repeat(1001));
      submitForm();

      expect(document.getElementById('error-note')).toHaveTextContent('1000');
    });

    it('shows injection attempts as text and reports each field only once', () => {
      text('name', '<script>alert(1)</script>');
      submitForm();

      expect(document.getElementById('error-name')).toHaveTextContent('Bitte nur Buchstaben');
      expect(document.querySelectorAll('form script')).toHaveLength(0);
    });

    it('provides the details of a finished request again', () => {
      fillValidValues();
      const appointmentDate = (document.querySelector('input[name="date"]') as HTMLInputElement)
        .value;
      text('note', 'Bremsen quietschen.');
      submitForm();

      // Like walking away and coming back: the form goes away, the provider stays.
      fireEvent.click(screen.getByRole('button', { name: 'Formular schließen' }));
      fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen' }));

      expect(field('name')).toHaveValue('Jennifer Krüger');
      expect(field('email')).toHaveValue('j.krueger@beispiel.de');
      expect(field('note')).toHaveValue('Bremsen quietschen.');
      expect(screen.getByLabelText(new RegExp('Gewünschter Service'))).toHaveValue('bremsen');
      expect(document.querySelector('input[name="date"]')).toHaveValue(appointmentDate);
    });
  });

  describe('English', () => {
    it('translates labels, notice and button', () => {
      renderForm({ locale: 'en' });

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
