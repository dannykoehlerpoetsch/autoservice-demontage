import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sendAppointmentRequestMail, submitAppointmentRequest } from '@/lib/appointment/actions';
import { findAppointmentRequest, saveAppointmentRequest } from '@/lib/appointment/store';
import {
  getAppointmentDateBounds,
  parseAppointmentRequest,
  readAppointmentValues,
  ERROR_KEYS,
} from '@/lib/appointment/schema';
import { addIsoDays, todayIso } from '@/lib/dates';

/**
 * Die Server Actions sind der einzige Ort, an dem Nutzereingaben verarbeitet werden. Diese
 * Datei prüft drei Dinge, die im Browser nicht zu sehen sind:
 *
 * 1. gültige Anfragen landen in der Serverkopie, die Bestätigungsseite wird über eine
 *    Zufalls-ID aufgerufen,
 * 2. ungültige Anfragen laufen zurück ins Formular, statt irgendwo zu schreiben,
 * 3. der Mailversand geht ausschließlich an die Adresse *der Serverkopie* – und genau einmal.
 *    Ohne diese beiden Regeln wäre die Action ein offener Mail-Relay.
 */

const { sendMailMock, getPathnameMock, redirectMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn(),
  getPathnameMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('@/lib/appointment/mail', () => ({ sendMail: sendMailMock }));

vi.mock('@/i18n/navigation', () => ({
  getPathname: getPathnameMock,
  Link: ({ children }: { children: unknown }) => children,
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

// `redirect` wirft in Next absichtlich eine Ausnahme – hier tut es das sichtbar, damit der
// Aufruf an dieser Stelle endet.
vi.mock('next/navigation', () => ({
  redirect: (ort: string) => redirectMock(ort),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (options?: string | { locale?: string; namespace?: string }) => {
    // Erst zur Aufrufzeit importieren: zur Hoist-Zeit von `vi.mock` liegen die Importe des
    // Tests noch in der temporal dead zone.
    const { makeTranslator } = await import('@/test-utils');
    const { default: deMessages } = await import('../../../messages/de.json');
    const namespace = typeof options === 'string' ? options : (options?.namespace ?? '');

    // Deutsch, weil `resolveLocale` bei allem Unbekannten auf die Standardsprache fällt.
    return makeTranslator(deMessages as Record<string, unknown>, namespace);
  }),
}));

function terminForm(werte: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [name, wert] of Object.entries({
    locale: 'de',
    name: 'Jennifer Krüger',
    phone: '+491701234567',
    email: 'j.krueger@beispiel.de',
    service: 'bremsen',
    date: addIsoDays(todayIso(), 10),
    note: 'Bremsbelag hinten',
    ...werte,
  } as Record<string, string>)) {
    form.set(name, wert);
  }

  return form;
}

function mailForm(id: string, zustimmung = 'yes'): FormData {
  const form = new FormData();
  form.set('id', id);
  form.set('consent', zustimmung);

  return form;
}

/** Richtige Serverkopie anlegen, damit die Action eine echte ID vorfindet. */
function speichereAnfrage(werte: Record<string, string> = {}): string {
  const bounds = getAppointmentDateBounds(todayIso());
  const result = parseAppointmentRequest(readAppointmentValues(terminForm(werte)), bounds);

  if (!result.success) {
    throw new Error(`Test-Eingabe ungültig: ${JSON.stringify(result.errors)}`);
  }

  return saveAppointmentRequest(result.data, 'de');
}

describe('submitAppointmentRequest', () => {
  beforeEach(() => {
    redirectMock.mockImplementation((ort: string) => {
      throw new Error(`NEXT_REDIRECT → ${ort}`);
    });
    getPathnameMock.mockImplementation(
      ({ locale, href }: { locale: string; href: { pathname: string; query: { id: string } } }) =>
        `/${locale}${href.pathname}?id=${href.query.id}`
    );
  });

  afterEach(() => {
    redirectMock.mockReset();
  });

  it('legt die geprüfte Anfrage ab und leitet auf die Bestätigungsseite weiter', async () => {
    await expect(submitAppointmentRequest(null, terminForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledTimes(1);
    const ziel = redirectMock.mock.calls[0][0] as string;
    expect(ziel).toContain('/de/termin-anfrage/bestaetigung?id=');

    const id = new URL(`http://localhost${ziel}`).searchParams.get('id')!;
    expect(findAppointmentRequest(id)?.input.email).toBe('j.krueger@beispiel.de');
  });

  it('schickt unvollständige Anfragen mit Fehlern ins Formular zurück', async () => {
    const state = await submitAppointmentRequest(
      null,
      terminForm({ name: '', phone: '', email: '', service: '', date: '' })
    );

    expect(state?.errors.name).toBe(ERROR_KEYS.required);
    expect(state?.errors.service).toBe(ERROR_KEYS.required);
    // Die Eingaben kehren zurück – sonst steht der Nutzer mit einem leeren Formular da.
    expect(state?.values.phone).toBe('');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('lehnt ein Datum in der Vergangenheit ab, ohne etwas zu speichern', async () => {
    const state = await submitAppointmentRequest(
      null,
      terminForm({ date: addIsoDays(todayIso(), -1) })
    );

    expect(state?.errors.date).toBe(ERROR_KEYS.dateInPast);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('akzeptiert nur die Sprachen, die die App ausliefert', async () => {
    await expect(submitAppointmentRequest(null, terminForm({ locale: 'en' }))).rejects.toThrow();
    expect(getPathnameMock.mock.calls.at(-1)?.[0]).toMatchObject({ locale: 'en' });

    // Eine fremde Sprache fällt auf die Standardsprache, statt ins Leere zu führen.
    await expect(submitAppointmentRequest(null, terminForm({ locale: 'fr' }))).rejects.toThrow();
    expect(getPathnameMock.mock.calls.at(-1)?.[0]).toMatchObject({ locale: 'de' });
  });
});

describe('sendAppointmentRequestMail', () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue({ status: 'sent', provider: 'resend' });
  });

  it('verschickt an die Adresse der Serverkopie und hält den Text rein', async () => {
    const id = speichereAnfrage();

    const state = await sendAppointmentRequestMail(null, mailForm(id));

    expect(state?.status).toBe('sent');
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe('j.krueger@beispiel.de');
    // Die Leistung steht übersetzt in Betreff und Text, nicht als interne Kennung.
    expect(mail.subject).toContain('Bremsenservice');
    expect(mail.text).toContain('Jennifer Krüger');
    expect(mail.text).toContain('+491701234567');
    expect(mail.text).toContain('Bremsenservice');
    expect(mail.text).not.toContain('<');
  });

  it('nutzt eine eingeschleuste Empfängeradresse nicht', async () => {
    const id = speichereAnfrage();

    const form = mailForm(id);
    form.set('email', 'angreifer@beispiel.de');
    form.set('to', 'angreifer@beispiel.de');

    await sendAppointmentRequestMail(null, form);

    expect(sendMailMock.mock.calls[0][0].to).toBe('j.krueger@beispiel.de');
  });

  it('verschickt genau einmal – die zweite Anfrage geht ins Leere', async () => {
    const id = speichereAnfrage();

    await sendAppointmentRequestMail(null, mailForm(id));
    const zweiter = await sendAppointmentRequestMail(null, mailForm(id));

    expect(zweiter?.status).toBe('already-sent');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('fordert die Zustimmung, bevor überhaupt nachgesehen wird', async () => {
    const id = speichereAnfrage();

    const state = await sendAppointmentRequestMail(null, mailForm(id, 'no'));

    expect(state?.status).toBe('consent-required');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('weist fremde und schlecht geformte IDs ab', async () => {
    expect(await (await sendAppointmentRequestMail(null, mailForm(randomUUID())))?.status).toBe(
      'expired'
    );
    expect((await sendAppointmentRequestMail(null, mailForm('1337')))?.status).toBe('expired');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('lässt eine abgelaufene Anfrage nicht noch einmal mailen', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const id = speichereAnfrage();

    vi.advanceTimersByTime(25 * 60 * 60 * 1000);

    const state = await sendAppointmentRequestMail(null, mailForm(id));

    vi.useRealTimers();
    expect(state?.status).toBe('expired');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('spielt einen fehlenden Versand offen zurück und verbucht ihn nicht', async () => {
    sendMailMock.mockResolvedValueOnce({ status: 'not-configured' });
    const id = speichereAnfrage();

    const state = await sendAppointmentRequestMail(null, mailForm(id));

    expect(state?.status).toBe('not-configured');
    // Nicht verbucht: ist der Mailversand später eingerichtet, darf die Anfrage nochmal
    // versucht werden.
    expect(findAppointmentRequest(id)?.mailSentAt).toBeNull();
  });

  it('meldet einen Providerfehler als Fehler, nicht als Erfolg', async () => {
    sendMailMock.mockResolvedValueOnce({ status: 'failed', reason: 'Provider down' });
    const id = speichereAnfrage();

    const state = await sendAppointmentRequestMail(null, mailForm(id));

    expect(state?.status).toBe('failed');
    expect(findAppointmentRequest(id)?.mailSentAt).toBeNull();
  });
});
