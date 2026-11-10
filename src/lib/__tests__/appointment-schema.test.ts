import { describe, it, expect } from 'vitest';
import {
  ERROR_KEYS,
  FIELD_LIMITS,
  MAX_ADVANCE_DAYS,
  getAppointmentDateBounds,
  isValidEmail,
  isValidPhone,
  parseAppointmentRequest,
  readAppointmentValues,
  type AppointmentField,
  type AppointmentValues,
} from '@/lib/appointment/schema';
import { addIsoDays } from '@/lib/dates';

/**
 * Das Schema ist die einzige Prüfstelle der Demo-Anfrage: Das Formular prüft damit, und nichts
 * prüft dieselbe Regel ein zweites Mal. Diese Datei hält die Regeln fest – die freiwilligen
 * Felder, die Einschleuseversuche und die Terminrenzen.
 */

// Unsichtbare und Steuerzeichen als Quelle, damit diese Datei selbst frei davon bleibt.
const ZWSP = String.fromCharCode(0x200b);
const NBSP = String.fromCharCode(0xa0);
const BIDI = String.fromCharCode(0x202e);
const NUL = String.fromCharCode(0);
const VT = String.fromCharCode(0x0b);

const HEUTE = '2026-05-08';
const grenzen = getAppointmentDateBounds(HEUTE);

function werte(abweichungen: Partial<AppointmentValues> = {}): AppointmentValues {
  return {
    name: 'Jennifer Krüger',
    phone: '+49 170 1234567',
    email: 'j.krueger@beispiel.de',
    service: 'bremsen',
    date: '2026-05-12',
    note: 'Bremsen quietschen beim Anhalten.',
    ...abweichungen,
  };
}

function prüfe(abweichungen: Partial<AppointmentValues> = {}) {
  return parseAppointmentRequest(werte(abweichungen), grenzen);
}

/** Erwartet eine Ablehnung und liefert die Meldung des genannten Feldes. */
function meldungFür(abweichungen: Partial<AppointmentValues>, feld: AppointmentField) {
  const ergebnis = prüfe(abweichungen);
  if (ergebnis.success) {
    throw new Error(`${feld} wurde akzeptiert, obwohl es abgelehnt werden müsste`);
  }
  return ergebnis.errors[feld];
}

describe('Demo-Terminanfrage – Schema', () => {
  it('lässt eine vollständige Anfrage durch und gibt geprüfte Daten zurück', () => {
    const ergebnis = prüfe();

    expect(ergebnis.success).toBe(true);
    if (!ergebnis.success) return;

    expect(ergebnis.data).toEqual({
      name: 'Jennifer Krüger',
      phone: '+49 170 1234567',
      email: 'j.krueger@beispiel.de',
      service: 'bremsen',
      date: '2026-05-12',
      note: 'Bremsen quietschen beim Anhalten.',
    });
  });

  it('lässt unbekannte Formularfelder nicht in die geprüften Daten', () => {
    const form = new FormData();
    for (const [key, wert] of Object.entries(werte({ note: '' }))) {
      form.append(key, wert);
    }
    form.append('admin', 'true');
    form.append('preis', '0');

    const ergebnis = parseAppointmentRequest(readAppointmentValues(form), grenzen);

    expect(ergebnis.success).toBe(true);
    if (!ergebnis.success) return;

    expect(Object.keys(ergebnis.data).sort()).toEqual(
      ['date', 'email', 'name', 'note', 'phone', 'service'].sort()
    );
  });

  it('braucht nur Name, Service und Terminwunsch', () => {
    const ergebnis = prüfe({ phone: '', email: '', note: '' });

    expect(ergebnis.success).toBe(true);
    if (!ergebnis.success) return;

    // Leere freiwillige Felder bleiben leer und werden nicht zu Platzhaltern hochgezogen.
    expect(ergebnis.data).toMatchObject({ phone: '', email: '', note: '' });
  });

  it('meldet leere Pflichtfelder als „required“, freiwillige aber gar nicht', () => {
    for (const feld of ['name', 'service', 'date'] as const) {
      const ergebnis = prüfe({ [feld]: '   ' });
      if (ergebnis.success) throw new Error(`${feld} wurde akzeptiert`);
      expect(ergebnis.errors[feld]).toBe(ERROR_KEYS.required);
    }

    for (const feld of ['phone', 'email', 'note'] as const) {
      expect(prüfe({ [feld]: '' }).success, feld).toBe(true);
    }
  });

  it('akzeptiert Namen mit Umlauten, Bindestrich, Punkt und Apostroph', () => {
    for (const name of [
      'Müller-Krause',
      "Anne O'Brien",
      'Dr. José Núñez',
      'Léa de Vries',
      'Anna Maria König',
    ]) {
      expect(prüfe({ name }).success, name).toBe(true);
    }
  });

  it('weist Einschleuseversuche im Namen zurück', () => {
    const versuche = [
      '<script>alert(1)</script>',
      'Anna <img src=x onerror=alert(1)>',
      "Robert'); DROP TABLE students;--",
      '../../etc/passwd',
      'https://example.de/<script>',
      `Anna${ZWSP}`, // Zero-Width Space
      `Anna${NBSP}K`, // geschütztes Leerzeichen
      `Robert${BIDI}`, // Bidi-Override
      ZWSP + ZWSP, // nur Zero-Width
    ];

    for (const name of versuche) {
      expect(meldungFür({ name }, 'name'), name).toBe(ERROR_KEYS.nameInvalid);
    }
  });

  it('begrenzt die Länge des Namens', () => {
    expect(meldungFür({ name: 'M' }, 'name')).toBe(ERROR_KEYS.nameTooShort);
    expect(meldungFür({ name: 'A'.repeat(FIELD_LIMITS.name + 1) }, 'name')).toBe(
      ERROR_KEYS.tooLong
    );
  });

  describe('Telefonnummer (freiwillig)', () => {
    it('darf leer bleiben', () => {
      expect(isValidPhone('')).toBe(true);
      expect(prüfe({ phone: '' }).success).toBe(true);
    });

    it('akzeptiert übliche Formate', () => {
      const nummern = ['+49 170 1234567', '030 123 45 67', '(030) 1234567', '0049 30 123456'];

      for (const phone of nummern) {
        expect(prüfe({ phone }).success, phone).toBe(true);
      }
    });

    it('lehnt alles andere ab, sobald etwas eingetragen ist', () => {
      const nummern = [
        '030/1234567',
        '030 1234567 ext 22',
        '12345',
        '+49 170 1234567890123456',
        'nine one two',
        '+49 170 12%0D%0ABcc:x@d.de',
      ];

      for (const phone of nummern) {
        expect(meldungFür({ phone }, 'phone'), phone).toBe(ERROR_KEYS.phoneInvalid);
      }
    });
  });

  describe('E-Mail-Adresse (freiwillig)', () => {
    it('darf leer bleiben', () => {
      expect(isValidEmail('')).toBe(true);
      expect(prüfe({ email: '' }).success).toBe(true);
    });

    it('erwartet genau eine Adresse, wenn das Feld gefüllt ist', () => {
      for (const email of ['a@b.de', 'max.mustermann+newsletter@beispiel.de']) {
        expect(prüfe({ email }).success, email).toBe(true);
      }

      const adressen = [
        'max@beispiel',
        'max@b',
        'max@@beispiel.de',
        'max beispiel@beispiel.de',
        'spam@example.com, max@beispiel.de',
        '<script>@beispiel.de',
        '"max"@beispiel.de',
        `a${'b'.repeat(64)}@beispiel.de`,
        `a@${'b'.repeat(64)}.de`,
      ];

      for (const email of adressen) {
        expect(meldungFür({ email }, 'email'), email).toBe(ERROR_KEYS.emailInvalid);
      }
    });
  });

  it('akzeptiert nur eine der bekannten Leistungen', () => {
    expect(prüfe({ service: 'oelwechsel' }).success).toBe(true);

    for (const service of [
      'Inspektion und Wartung',
      'bremsen; DROP TABLE termine',
      '../../etc/passwd',
      'bremsen%00',
      'OELWECHSEL',
    ]) {
      expect(meldungFür({ service }, 'service'), service).toBe(ERROR_KEYS.serviceInvalid);
    }
  });

  it('verlangt ein echtes Datum im Format YYYY-MM-DD', () => {
    for (const date of ['12.05.2026', '2026-5-12', '2026-13-01', '2027-02-30', 'morgen']) {
      expect(meldungFür({ date }, 'date'), date).toBe(ERROR_KEYS.dateInvalid);
    }
  });

  it('nimmt Termine frühestens heute und höchstens MAX_ADVANCE_DAYS später an', () => {
    expect(prüfe({ date: HEUTE }).success).toBe(true);
    expect(prüfe({ date: addIsoDays(HEUTE, MAX_ADVANCE_DAYS) }).success).toBe(true);

    expect(meldungFür({ date: addIsoDays(HEUTE, -1) }, 'date')).toBe(ERROR_KEYS.dateInPast);
    expect(meldungFür({ date: '1999-12-31' }, 'date')).toBe(ERROR_KEYS.dateInPast);
    expect(meldungFür({ date: addIsoDays(HEUTE, MAX_ADVANCE_DAYS + 1) }, 'date')).toBe(
      ERROR_KEYS.dateTooFar
    );
  });

  it('hält die Bemerkung kurz und frei von Markup', () => {
    expect(
      prüfe({ note: 'Golf IV, Baujahr 2001 – bitte Anruf unter +49 170 1234567.' }).success
    ).toBe(true);
    expect(prüfe({ note: 'Zeile eins\nZeile zwei' }).success).toBe(true);
    expect(prüfe({ note: '„Ich zitiere Dich“ 100 % & mehr (heute!)' }).success).toBe(true);

    const versuche = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'C:\\windows\\system32',
      '`MAIL_FROM`', // Backticks
      '{max}',
      'a|b',
      `a${NUL}b`,
      `zeile${VT}mit Steuerzeichen`,
    ];

    for (const note of versuche) {
      expect(meldungFür({ note }, 'note'), note).toBe(ERROR_KEYS.noteInvalid);
    }

    expect(meldungFür({ note: 'x'.repeat(FIELD_LIMITS.note + 1) }, 'note')).toBe(
      ERROR_KEYS.tooLong
    );
  });

  it('meldet pro Feld nur die erste Beschwerde', () => {
    const ergebnis = prüfe({ name: '<b>x</b>' + 'y'.repeat(80) });
    if (ergebnis.success) throw new Error('hätte scheitern müssen');

    expect(Object.keys(ergebnis.errors)).toEqual(['name']);
  });

  it('hat für jede Meldung einen bekannten Schlüssel', () => {
    const bekannt = Object.values(ERROR_KEYS);
    const ergebnis = prüfe({
      name: '',
      service: 'x',
      date: 'x',
      phone: 'x',
      email: 'x',
      note: '<',
    });
    if (ergebnis.success) throw new Error('hätte scheitern müssen');

    for (const meldung of Object.values(ergebnis.errors)) {
      expect(bekannt).toContain(meldung);
    }
  });
});

describe('Demo-Terminanfrage – Rohwerte aus dem Formular', () => {
  it('ignoriert Datei-Bestandteile und unbekannte Schlüssel', () => {
    const form = new FormData();
    form.append('name', new File(['x'], 'name.txt'));
    form.append('email', '  max@beispiel.de  ');
    form.append('admin', 'true');

    const gelessen = readAppointmentValues(form);

    expect(gelessen.name).toBe('');
    expect(gelessen.email).toBe('max@beispiel.de');
    expect(gelessen.note).toBe('');
    expect('admin' in gelessen).toBe(false);
  });

  it('vereinheitlicht Umbrüche, Leerzeichen und unsichtbare Zeichen', () => {
    const form = new FormData();
    form.append('name', '  Max   Mustermann  ');
    form.append('phone', '+49\r\n170 1234567');
    form.append('note', `zwei${ZWSP}Null\nzwölf`);
    form.append('date', '2026-05-12');

    const gelessen = readAppointmentValues(form);

    expect(gelessen.name).toBe('Max Mustermann');
    expect(gelessen.phone).toBe('+49 170 1234567');
    expect(gelessen.note).toBe(`zweiNull\nzwölf`);
    expect(gelessen.date).toBe('2026-05-12');
  });
});
