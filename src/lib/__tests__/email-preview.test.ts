import { describe, it, expect, vi } from 'vitest';
import { buildDemoEmailPreview, type DemoEmailAppointment } from '@/lib/appointment/email-preview';
import { makeTranslator } from '@/test-utils';
import deMessages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';

/**
 * The email preview is the only place where the input becomes running text. While doing so it may
 * send nothing outwards and invent nothing – checked here are both languages, the personalisation,
 * missing optional details and whether the function really computes purely.
 */

function appointment(overrides: Partial<DemoEmailAppointment> = {}): DemoEmailAppointment {
  return {
    name: 'Jennifer Krüger',
    phone: '+49 170 1234567',
    email: 'j.krueger@beispiel.de',
    note: 'Bremsen quietschen beim Anhalten.',
    date: '2026-11-20',
    serviceHeading: 'Bremsenservice',
    ...overrides,
  };
}

function buildPreview(
  messages: Record<string, unknown>,
  overrides: Partial<DemoEmailAppointment> = {},
  locale: 'de' | 'en' = 'de'
) {
  return buildDemoEmailPreview(appointment(overrides), {
    locale,
    translate: makeTranslator(messages, ''),
  });
}

describe('Email preview – German', () => {
  it('names sender, recipient and subject with the chosen service', () => {
    const preview = buildPreview(deMessages);

    expect(preview.from).toBe(deMessages.DemoEmail.from);
    expect(preview.to).toBe('j.krueger@beispiel.de');
    expect(preview.subject).toBe('Deine Demo-Terminanfrage – Bremsenservice');
  });

  it('addresses the person with the entered name', () => {
    const preview = buildPreview(deMessages, { name: 'Max Mustermann' });

    expect(preview.body.startsWith('Hallo Max Mustermann,')).toBe(true);
    // The name only stands in the salutation – there is no invented salutation.
    expect(preview.body).not.toContain('Sehr geehrte');
  });

  it('shows service, requested date and all details with the translated field names', () => {
    const preview = buildPreview(deMessages);

    expect(preview.body).toContain('Gewünschter Service: Bremsenservice');
    expect(preview.body).toContain('Terminwunsch: Freitag, 20. November 2026');
    expect(preview.body).toContain('Name: Jennifer Krüger');
    expect(preview.body).toContain('Telefonnummer: +49 170 1234567');
    expect(preview.body).toContain('E-Mail: j.krueger@beispiel.de');
    expect(preview.body).toContain('Bemerkung: Bremsen quietschen beim Anhalten.');
  });

  it('explicitly states that nothing was sent', () => {
    const preview = buildPreview(deMessages);

    expect(preview.body).toContain('Wichtiger Hinweis');
    expect(preview.body).toContain('Es wurde keine E-Mail versendet');
    expect(preview.body).toContain('kein Werkstatttermin vereinbart');
  });

  it('names missing optional details instead of dropping rows', () => {
    const preview = buildPreview(deMessages, { phone: '', email: '', note: '' });

    expect(preview.to).toBeNull();
    expect(preview.body).toContain('Telefonnummer: Nicht angegeben');
    expect(preview.body).toContain('E-Mail: Nicht angegeben');
    expect(preview.body).toContain(`Bemerkung: ${deMessages.DemoEmail.noNote}`);
  });
});

describe('Email preview – English', () => {
  it('uses the English texts including the date', () => {
    const preview = buildPreview(enMessages, { serviceHeading: 'Brake service' }, 'en');

    expect(preview.from).toBe(enMessages.DemoEmail.from);
    expect(preview.subject).toBe('Your demo appointment request – Brake service');
    expect(preview.body.startsWith('Hello Jennifer Krüger,')).toBe(true);
    expect(preview.body).toContain('Notes: Bremsen quietschen beim Anhalten.');
    expect(preview.body).toContain('Preferred date: Friday, November 20, 2026');
    expect(preview.body).toContain('No email was sent');
  });

  it('does not translate the service name itself but takes the one brought along', () => {
    const preview = buildPreview(enMessages, { serviceHeading: 'Tire service' }, 'en');

    expect(preview.subject).toContain('Tire service');
    expect(preview.body).toContain('Requested service: Tire service');
    // The internal identifier does not appear anywhere.
    expect(preview.body).not.toContain('reifen');
  });
});

describe('Email preview – long input and cleanliness', () => {
  it('renders long notes in full without truncating them', () => {
    const longNote = 'Bremsen quietschen. '.repeat(40);
    const preview = buildPreview(deMessages, { note: longNote });

    expect(preview.body).toContain(longNote.trim());
    expect(preview.body.length).toBeGreaterThan(longNote.length);
  });

  it('treats input as text and not as markup', () => {
    const preview = buildPreview(deMessages, { name: '<b>Max</b>', note: '<img src=x>' });

    // The body stays a string; the angle brackets stand inside it as characters.
    expect(typeof preview.body).toBe('string');
    expect(preview.body).toContain('<b>Max</b>');
    expect(preview.body).toContain('<img src=x>');
  });

  it('computes purely: same input, same output, no call outside', () => {
    const fetchSpy = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    vi.stubGlobal('fetch', fetchSpy);

    const erster = buildPreview(deMessages);
    const again = buildPreview(deMessages);

    expect(again).toEqual(erster);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('ignores environment variables, including old mail credentials', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_123');
    vi.stubEnv('MAIL_FROM', 'Werkstatt <terms@example.com>');

    expect(buildPreview(deMessages)).toEqual(buildPreview(deMessages));
    expect(buildPreview(deMessages).subject).toBe('Deine Demo-Terminanfrage – Bremsenservice');
  });
});

describe('Email preview – field labels', () => {
  it('takes the field names from the form so they are translated only once', () => {
    const paare = [
      [deMessages, 'de'],
      [enMessages, 'en'],
    ] as const;

    for (const [messages, locale] of paare) {
      const preview = buildPreview(messages, {}, locale);
      const fieldTexts = Object.values(messages.Appointment.fields as Record<string, string>);

      for (const field of fieldTexts) {
        expect(preview.body, field).toContain(`${field}:`);
      }
    }
  });
});
