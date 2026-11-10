import { describe, it, expect, vi } from 'vitest';
import { buildDemoEmailPreview, type DemoEmailAppointment } from '@/lib/appointment/email-preview';
import { makeTranslator } from '@/test-utils';
import deMessages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';

/**
 * Die E-Mail-Vorschau ist der einzige Ort, an dem aus den Eingaben ein Fließtext wird. Sie
 * darf dabei nichts nach draußen schicken und nichts erfinden – geprüft werden hier beide
 * Sprachen, die Personalisierung, fehlende freiwillige Angaben und die Frage, ob die Funktion
 * wirklich rein rechnet.
 */

function anfrage(abweichungen: Partial<DemoEmailAppointment> = {}): DemoEmailAppointment {
  return {
    name: 'Jennifer Krüger',
    phone: '+49 170 1234567',
    email: 'j.krueger@beispiel.de',
    note: 'Bremsen quietschen beim Anhalten.',
    date: '2026-11-20',
    serviceHeading: 'Bremsenservice',
    ...abweichungen,
  };
}

function vorschau(
  nachrichten: Record<string, unknown>,
  abweichungen: Partial<DemoEmailAppointment> = {},
  locale: 'de' | 'en' = 'de'
) {
  return buildDemoEmailPreview(anfrage(abweichungen), {
    locale,
    translate: makeTranslator(nachrichten, ''),
  });
}

describe('E-Mail-Vorschau – Deutsch', () => {
  it('nennt Absender, Empfänger und Betreff mit der gewählten Leistung', () => {
    const preview = vorschau(deMessages);

    expect(preview.from).toBe(deMessages.DemoEmail.from);
    expect(preview.to).toBe('j.krueger@beispiel.de');
    expect(preview.subject).toBe('Deine Demo-Terminanfrage – Bremsenservice');
  });

  it('spricht die Person mit dem eingetragenen Namen an', () => {
    const preview = vorschau(deMessages, { name: 'Max Mustermann' });

    expect(preview.body.startsWith('Hallo Max Mustermann,')).toBe(true);
    // Der Name steht nur in der Anrede – eine erfundene Anrede gibt es nicht.
    expect(preview.body).not.toContain('Sehr geehrte');
  });

  it('zeigt Service, Terminwunsch und alle Angaben mit den übersetzten Feldnamen', () => {
    const preview = vorschau(deMessages);

    expect(preview.body).toContain('Gewünschter Service: Bremsenservice');
    expect(preview.body).toContain('Terminwunsch: Freitag, 20. November 2026');
    expect(preview.body).toContain('Name: Jennifer Krüger');
    expect(preview.body).toContain('Telefonnummer: +49 170 1234567');
    expect(preview.body).toContain('E-Mail: j.krueger@beispiel.de');
    expect(preview.body).toContain('Bemerkung: Bremsen quietschen beim Anhalten.');
  });

  it('weist ausdrücklich darauf hin, dass nichts versendet wurde', () => {
    const preview = vorschau(deMessages);

    expect(preview.body).toContain('Wichtiger Hinweis');
    expect(preview.body).toContain('Es wurde keine E-Mail versendet');
    expect(preview.body).toContain('kein Werkstatttermin vereinbart');
  });

  it('benennt fehlende freiwillige Angaben, statt Zeilen wegzulassen', () => {
    const preview = vorschau(deMessages, { phone: '', email: '', note: '' });

    expect(preview.to).toBeNull();
    expect(preview.body).toContain('Telefonnummer: Nicht angegeben');
    expect(preview.body).toContain('E-Mail: Nicht angegeben');
    expect(preview.body).toContain(`Bemerkung: ${deMessages.DemoEmail.noNote}`);
  });
});

describe('E-Mail-Vorschau – Englisch', () => {
  it('nutzt die englischen Texte inklusive Datum', () => {
    const preview = vorschau(enMessages, { serviceHeading: 'Brake service' }, 'en');

    expect(preview.from).toBe(enMessages.DemoEmail.from);
    expect(preview.subject).toBe('Your demo appointment request – Brake service');
    expect(preview.body.startsWith('Hello Jennifer Krüger,')).toBe(true);
    expect(preview.body).toContain('Notes: Bremsen quietschen beim Anhalten.');
    expect(preview.body).toContain('Preferred date: Friday, November 20, 2026');
    expect(preview.body).toContain('No email was sent');
  });

  it('übersetzt die Servicebezeichnung nicht selbst, sondern nimmt die mitgebrachte', () => {
    const preview = vorschau(enMessages, { serviceHeading: 'Tire service' }, 'en');

    expect(preview.subject).toContain('Tire service');
    expect(preview.body).toContain('Requested service: Tire service');
    // Die interne Kennung taucht nirgends auf.
    expect(preview.body).not.toContain('reifen');
  });
});

describe('E-Mail-Vorschau – lange Eingaben und Reinheit', () => {
  it('gibt lange Bemerkungen vollständig wieder, ohne sie zu kürzen', () => {
    const lang = 'Bremsen quietschen. '.repeat(40);
    const preview = vorschau(deMessages, { note: lang });

    expect(preview.body).toContain(lang.trim());
    expect(preview.body.length).toBeGreaterThan(lang.length);
  });

  it('behandelt Eingaben als Text und nicht als Markup', () => {
    const preview = vorschau(deMessages, { name: '<b>Max</b>', note: '<img src=x>' });

    // Der Rumpf bleibt ein String; die spitzen Klammern stehen darin als Zeichen.
    expect(typeof preview.body).toBe('string');
    expect(preview.body).toContain('<b>Max</b>');
    expect(preview.body).toContain('<img src=x>');
  });

  it('rechnet rein: gleicher Eingang, gleicher Ausgang, kein Aufruf nach draußen', () => {
    const fetchSpy = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    vi.stubGlobal('fetch', fetchSpy);

    const erster = vorschau(deMessages);
    const zweiter = vorschau(deMessages);

    expect(zweiter).toEqual(erster);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('ignoriert Umgebungsvariablen, auch alte Mail-Zugänge', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_123');
    vi.stubEnv('MAIL_FROM', 'Werkstatt <terms@example.com>');

    expect(vorschau(deMessages)).toEqual(vorschau(deMessages));
    expect(vorschau(deMessages).subject).toBe('Deine Demo-Terminanfrage – Bremsenservice');
  });
});

describe('E-Mail-Vorschau – Feldlabels', () => {
  it('nimmt die Feldnamen aus dem Formular, damit sie nur einmal übersetzt sind', () => {
    const paare = [
      [deMessages, 'de'],
      [enMessages, 'en'],
    ] as const;

    for (const [nachrichten, locale] of paare) {
      const preview = vorschau(nachrichten, {}, locale);
      const felder = Object.values(nachrichten.Appointment.fields as Record<string, string>);

      for (const feld of felder) {
        expect(preview.body, feld).toContain(`${feld}:`);
      }
    }
  });
});
