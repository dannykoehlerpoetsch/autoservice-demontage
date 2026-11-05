import { describe, it, expect } from 'vitest';
import {
  ERROR_KEYS,
  FIELD_LIMITS,
  MAX_ADVANCE_DAYS,
  getAppointmentDateBounds,
  parseAppointmentRequest,
  readAppointmentValues,
  type AppointmentField,
  type AppointmentValues,
} from '@/lib/appointment/schema';
import { addIsoDays } from '@/lib/dates';

const TODAY = '2026-05-08';
const bounds = getAppointmentDateBounds(TODAY);

function values(overrides: Partial<AppointmentValues> = {}): AppointmentValues {
  return {
    name: 'Jennifer Krüger',
    phone: '+49 170 1234567',
    email: 'j.krueger@beispiel.de',
    service: 'bremsen',
    date: '2026-05-12',
    note: 'Bremsen quietschen beim Anhalten.',
    ...overrides,
  };
}

function parse(overrides: Partial<AppointmentValues> = {}) {
  return parseAppointmentRequest(values(overrides), bounds);
}

/** Erwartet eine Ablehnung und liefert die Meldung des genannten Feldes. */
function rejectionOf(
  overrides: Partial<AppointmentValues>,
  field: AppointmentField
): string | undefined {
  const result = parse(overrides);
  if (result.success) {
    throw new Error(`"${field}" wurde akzeptiert, obwohl es abgelehnt werden müsste`);
  }
  return result.errors[field];
}

describe('Terminanfrage – Schema', () => {
  it('lässt eine vollständige Anfrage durch und gibt geprüfte Daten zurück', () => {
    const result = parse();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
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
    for (const [key, value] of Object.entries(values({ note: '' }))) {
      form.append(key, value);
    }
    form.append('admin', 'true');
    form.append('preis', '0');

    const result = parseAppointmentRequest(readAppointmentValues(form), bounds);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.keys(result.data).sort()).toEqual(
      ['date', 'email', 'name', 'note', 'phone', 'service'].sort()
    );
  });

  it('akzeptiert eine leere Bemerkung und meldet leere Pflichtfelder als „required“', () => {
    expect(parse({ note: '' }).success).toBe(true);

    for (const field of ['name', 'phone', 'email', 'service', 'date'] as const) {
      const result = parse({ [field]: '   ' });
      if (result.success) throw new Error(`${field} wurde akzeptiert`);
      expect(result.errors[field]).toBe(ERROR_KEYS.required);
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
      expect(parse({ name }).success, name).toBe(true);
    }
  });

  it('weist Einschleuseversuche im Namen zurück', () => {
    const attempts = [
      '<script>alert(1)</script>',
      'Anna <img src=x onerror=alert(1)>',
      "Robert'); DROP TABLE students;--",
      '../../etc/passwd',
      'https://example.de/<script>',
      'Anna\u200B', // Zero-Width Space
      'Anna\u00A0K', // geschütztes Leerzeichen
      'Robert\u202E', // Bidi-Override
      '\u200B\u200B', // nur Zero-Width
    ];

    for (const name of attempts) {
      expect(rejectionOf({ name }, 'name'), name).toBe(ERROR_KEYS.nameInvalid);
    }
  });

  it('begrenzt die Länge des Namens', () => {
    expect(rejectionOf({ name: 'M' }, 'name')).toBe(ERROR_KEYS.nameTooShort);
    expect(rejectionOf({ name: 'A'.repeat(FIELD_LIMITS.name + 1) }, 'name')).toBe(
      ERROR_KEYS.tooLong
    );
  });

  it('akzeptiert übliche Telefonformate und lehnt Unsinn ab', () => {
    const phones = ['+49 170 1234567', '0341 123 45 67', '(0341) 1234567', '0049 341 123456'];

    for (const phone of phones) {
      expect(parse({ phone }).success, phone).toBe(true);
    }

    for (const phone of [
      '0341/1234567',
      '0341 1234567 ext 22',
      '12345',
      '+49 170 1234567890123456',
      'nine one two',
      '+49 170 12%0D%0ABcc:x@d.de',
    ]) {
      expect(rejectionOf({ phone }, 'phone'), phone).toBe(ERROR_KEYS.phoneInvalid);
    }
  });

  it('erwartet genau eine E-Mail-Adresse', () => {
    for (const email of ['a@b.de', 'max.mustermann+newsletter@bennis-autoservice.de']) {
      expect(parse({ email }).success, email).toBe(true);
    }

    for (const email of [
      'max@bennis',
      'max@b',
      'max@@bennis.de',
      'max bennis@bennis.de',
      'spam@example.com, max@bennis.de',
      '<script>@bennis.de',
      '"max"@bennis.de',
      `a${'b'.repeat(64)}@bennis.de`,
      `a@${'b'.repeat(64)}.de`,
    ]) {
      expect(rejectionOf({ email }, 'email'), email).toBe(ERROR_KEYS.emailInvalid);
    }
  });

  it('akzeptiert nur eine der bekannten Leistungen', () => {
    expect(parse({ service: 'oelwechsel' }).success).toBe(true);

    for (const service of [
      'Inspektion und Wartung',
      'bremsen; DROP TABLE termine',
      '../../etc/passwd',
      'bremsen%00',
      'OELWECHSEL',
    ]) {
      expect(rejectionOf({ service }, 'service'), service).toBe(ERROR_KEYS.serviceInvalid);
    }
  });

  it('verlangt ein echtes Datum im Format YYYY-MM-DD', () => {
    for (const date of [
      '12.05.2026',
      '2026/05/12',
      '2026-5-12',
      '2026-13-01',
      '2027-02-30',
      'morgen',
    ]) {
      expect(rejectionOf({ date }, 'date'), date).toBe(ERROR_KEYS.dateInvalid);
    }
  });

  it('nimmt Termine frühestens heute und höchstens MAX_ADVANCE_DAYS später an', () => {
    expect(parse({ date: TODAY }).success).toBe(true);
    expect(parse({ date: addIsoDays(TODAY, MAX_ADVANCE_DAYS) }).success).toBe(true);

    expect(rejectionOf({ date: addIsoDays(TODAY, -1) }, 'date')).toBe(ERROR_KEYS.dateInPast);
    expect(rejectionOf({ date: '1999-12-31' }, 'date')).toBe(ERROR_KEYS.dateInPast);
    expect(rejectionOf({ date: addIsoDays(TODAY, MAX_ADVANCE_DAYS + 1) }, 'date')).toBe(
      ERROR_KEYS.dateTooFar
    );
  });

  it('hält die Bemerkung kurz und frei von Markup', () => {
    expect(
      parse({ note: 'Golf IV, Baujahr 2001 – bitte Anruf unter +49 170 1234567.' }).success
    ).toBe(true);
    expect(parse({ note: 'Zeile eins\nZeile zwei' }).success).toBe(true);
    expect(parse({ note: '„Ich zitiere Dich“ 100% & mehr (heute!)' }).success).toBe(true);

    const attempts = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'C:\\windows\\system32',
      '`${process.env.MAIL_FROM}`',
      '{max}',
      'a|b',
      'a\u0000b',
      'zeile\u000Bmit Steuerzeichen',
    ];

    for (const note of attempts) {
      expect(rejectionOf({ note }, 'note'), note).toBe(ERROR_KEYS.noteInvalid);
    }

    expect(rejectionOf({ note: 'x'.repeat(FIELD_LIMITS.note + 1) }, 'note')).toBe(
      ERROR_KEYS.tooLong
    );
  });

  it('meldet pro Feld nur die erste Beschwerde', () => {
    const result = parse({ name: '<b>x</b>' + 'y'.repeat(80) });
    if (result.success) throw new Error('hätte scheitern müssen');

    expect(Object.keys(result.errors)).toEqual(['name']);
  });

  it('hat für jede Meldung einen bekannten Schlüssel', () => {
    const known = Object.values(ERROR_KEYS);
    const result = parse({ name: '', phone: 'x', email: 'x', service: 'x', date: 'x', note: '<' });
    if (result.success) throw new Error('hätte scheitern müssen');

    for (const key of Object.values(result.errors)) {
      expect(known).toContain(key);
    }
  });
});

describe('Terminanfrage – Rohwerte aus dem Formular', () => {
  it('ignoriert Datei-Bestandteile und unbekannte Schlüssel', () => {
    const form = new FormData();
    form.append('name', new File(['x'], 'name.txt'));
    form.append('email', '  max@bennis.de  ');
    form.append('admin', 'true');

    const read = readAppointmentValues(form);

    expect(read.name).toBe('');
    expect(read.email).toBe('max@bennis.de');
    expect(read.note).toBe('');
    expect('admin' in read).toBe(false);
  });

  it('vereinheitlicht Umbrüche, Leerzeichen und unsichtbare Zeichen', () => {
    const form = new FormData();
    form.append('name', '  Max   Mustermann  ');
    form.append('phone', '+49\r\n170 1234567');
    form.append('note', 'zwei\u200BNull\nzwölf');
    form.append('date', '2026-05-12');

    const read = readAppointmentValues(form);

    expect(read.name).toBe('Max Mustermann');
    expect(read.phone).toBe('+49 170 1234567');
    expect(read.note).toBe('zweiNull\nzwölf');
    expect(read.date).toBe('2026-05-12');
  });
});
