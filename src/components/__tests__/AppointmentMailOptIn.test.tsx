import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/de.json';
import AppointmentMailOptIn from '../AppointmentMailOptIn';

/**
 * Die E-Mail-Kopie ist der einzige Weg, auf dem eine Server-Action verschickt. Deshalb prüft
 * diese Datei zwei Dinge: was ins Formular geschrieben wird (ID + Zustimmung) und dass jede
 * Rückmeldung der Action wirklich in der passenden Zeile landet – statt eines stillen
 * Erfolgs, wo eine Ablehnung gemeint war.
 */

const { actionMock } = vi.hoisted(() => ({ actionMock: vi.fn() }));

vi.mock('@/lib/appointment/actions', () => ({
  sendAppointmentRequestMail: actionMock,
}));

const EMAIL = 'j.krueger@beispiel.de';

function renderOptIn(props: { id?: string; email?: string; alreadySent?: boolean } = {}) {
  const angaben = { id: 'c0ffee00-0000-4000-8000-000000000000', email: EMAIL, ...props };
  const result = render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <AppointmentMailOptIn alreadySent={false} {...angaben} />
    </NextIntlClientProvider>
  );

  return { ...result, props: angaben };
}

function sendeEin(container: HTMLElement) {
  const formular = container.querySelector('form')!;
  fireEvent.submit(formular);
}

describe('AppointmentMailOptIn', () => {
  beforeEach(() => {
    actionMock.mockReset();
    actionMock.mockResolvedValue(null);
  });

  it('zeigt Überschrift, Hinweis und die Adresse der Anfrage', () => {
    renderOptIn();

    expect(screen.getByRole('heading', { name: 'Kopie per E-Mail' })).toBeInTheDocument();
    expect(screen.getByText(messages.AppointmentConfirmation.mail.intro)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: `Diese Anfrage an ${EMAIL} senden` })
    ).toBeInTheDocument();
  });

  it('nimmt die Zustimmung voraus und schickt ID wie Zustimmung als Felder', async () => {
    const { container, props } = renderOptIn();

    const box = screen.getByRole('checkbox');
    expect(box).toBeChecked();

    sendeEin(container);

    await waitFor(() => expect(actionMock).toHaveBeenCalled());
    const formData = actionMock.mock.calls[0][1] as FormData;
    expect(formData.get('id')).toBe(props.id);
    expect(formData.get('consent')).toBe('yes');
  });

  it('schickt consent=no, wenn die Box abgewählt ist', async () => {
    const { container } = renderOptIn();

    fireEvent.click(screen.getByRole('checkbox'));
    sendeEin(container);

    await waitFor(() => expect(actionMock).toHaveBeenCalled());
    const formData = actionMock.mock.calls[0][1] as FormData;
    // Nicht die Box selbst geht ans Formular, sondern das versteckte Feld daneben.
    expect(container.querySelector('input[name="consent"]')).toHaveValue('no');
    expect(formData.get('consent')).toBe('no');
  });

  it('ist ohne Versandknopf, wenn die Anfrage schon gemailt wurde', () => {
    const { container } = renderOptIn({ alreadySent: true });

    expect(screen.getByText(messages.AppointmentConfirmation.mail.alreadySent)).toBeInTheDocument();
    expect(container.querySelector('form')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('spielt jede Rückmeldung der Action in der richtigen Zeile ab', async () => {
    const fälle: Array<[string, Record<string, unknown>, string]> = [
      [
        'sent',
        { email: EMAIL },
        messages.AppointmentConfirmation.mail.sent.replace('{email}', EMAIL),
      ],
      ['consent-required', {}, messages.AppointmentConfirmation.mail.consentRequired],
      ['not-configured', {}, messages.AppointmentConfirmation.mail.notConfigured],
      ['failed', {}, messages.AppointmentConfirmation.mail.failed],
      ['expired', {}, messages.AppointmentConfirmation.mail.expired],
      ['already-sent', { email: EMAIL }, messages.AppointmentConfirmation.mail.alreadySent],
    ];

    for (const [status, extra, erwartung] of fälle) {
      actionMock.mockResolvedValueOnce({ status, ...extra });

      const { container, unmount } = renderOptIn();
      sendeEin(container);

      await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
      expect(screen.getByRole('status')).toHaveTextContent(erwartung);

      unmount();
    }
  });

  it('sperrt den Knopf, während die Action läuft', async () => {
    let ende: (wert: null) => void = () => {};
    actionMock.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          ende = resolve;
        })
    );

    const { container } = renderOptIn();
    sendeEin(container);

    const knopf = await screen.findByRole('button', { name: 'E-Mail wird gesendet …' });
    expect(knopf).toBeDisabled();

    ende(null);
    await screen.findByRole('button', { name: 'Anfrage per E-Mail senden' });
  });
});
