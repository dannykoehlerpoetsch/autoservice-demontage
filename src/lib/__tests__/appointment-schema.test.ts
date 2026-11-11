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
 * The schema is the single validation point of the demo request: the form validates with it, and
 * nothing validates the same rule a second time. This file pins the rules down – the optional
 * fields, the injection attempts and the appointment limits.
 */

// Invisible and control characters as the source, so this file itself stays free of them.
const ZWSP = String.fromCharCode(0x200b);
const NBSP = String.fromCharCode(0xa0);
const BIDI = String.fromCharCode(0x202e);
const NUL = String.fromCharCode(0);
const VT = String.fromCharCode(0x0b);

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

function parseValues(overrides: Partial<AppointmentValues> = {}) {
  return parseAppointmentRequest(values(overrides), bounds);
}

/** Expects a rejection and returns the message of the named field. */
function messageFor(overrides: Partial<AppointmentValues>, field: AppointmentField) {
  const result = parseValues(overrides);
  if (result.success) {
    throw new Error(`${field} was accepted although it has to be rejected`);
  }
  return result.errors[field];
}

describe('Demo appointment request – schema', () => {
  it('passes a complete request and returns validated data', () => {
    const result = parseValues();

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

  it('keeps unknown form fields out of the validated data', () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(values({ note: '' }))) {
      form.append(key, value);
    }
    form.append('admin', 'true');
    form.append('price', '0');

    const result = parseAppointmentRequest(readAppointmentValues(form), bounds);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.keys(result.data).sort()).toEqual(
      ['date', 'email', 'name', 'note', 'phone', 'service'].sort()
    );
  });

  it('needs only name, service and requested date', () => {
    const result = parseValues({ phone: '', email: '', note: '' });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Empty optional fields stay empty and are not promoted to placeholders.
    expect(result.data).toMatchObject({ phone: '', email: '', note: '' });
  });

  it('reports empty required fields as "required" and optional ones not at all', () => {
    for (const field of ['name', 'service', 'date'] as const) {
      const result = parseValues({ [field]: '   ' });
      if (result.success) throw new Error(`${field} was accepted`);
      expect(result.errors[field]).toBe(ERROR_KEYS.required);
    }

    for (const field of ['phone', 'email', 'note'] as const) {
      expect(parseValues({ [field]: '' }).success, field).toBe(true);
    }
  });

  it('accepts names with umlauts, hyphens, dots and apostrophes', () => {
    for (const name of [
      'Müller-Krause',
      "Anne O'Brien",
      'Dr. José Núñez',
      'Léa de Vries',
      'Anna Maria König',
    ]) {
      expect(parseValues({ name }).success, name).toBe(true);
    }
  });

  it('rejects injection attempts in the name', () => {
    const attempts = [
      '<script>alert(1)</script>',
      'Anna <img src=x onerror=alert(1)>',
      "Robert'); DROP TABLE students;--",
      '../../etc/passwd',
      'https://example.de/<script>',
      `Anna${ZWSP}`, // Zero-Width Space
      `Anna${NBSP}K`, // non-breaking space
      `Robert${BIDI}`, // Bidi-Override
      ZWSP + ZWSP, // zero-width only
    ];

    for (const name of attempts) {
      expect(messageFor({ name }, 'name'), name).toBe(ERROR_KEYS.nameInvalid);
    }
  });

  it('limits the length of the name', () => {
    expect(messageFor({ name: 'M' }, 'name')).toBe(ERROR_KEYS.nameTooShort);
    expect(messageFor({ name: 'A'.repeat(FIELD_LIMITS.name + 1) }, 'name')).toBe(
      ERROR_KEYS.tooLong
    );
  });

  describe('Phone number (optional)', () => {
    it('may stay empty', () => {
      expect(isValidPhone('')).toBe(true);
      expect(parseValues({ phone: '' }).success).toBe(true);
    });

    it('accepts common formats', () => {
      const phoneNumbers = ['+49 170 1234567', '030 123 45 67', '(030) 1234567', '0049 30 123456'];

      for (const phone of phoneNumbers) {
        expect(parseValues({ phone }).success, phone).toBe(true);
      }
    });

    it('rejects everything else once something is entered', () => {
      const phoneNumbers = [
        '030/1234567',
        '030 1234567 ext 22',
        '12345',
        '+49 170 1234567890123456',
        'nine one two',
        '+49 170 12%0D%0ABcc:x@d.de',
      ];

      for (const phone of phoneNumbers) {
        expect(messageFor({ phone }, 'phone'), phone).toBe(ERROR_KEYS.phoneInvalid);
      }
    });
  });

  describe('Email address (optional)', () => {
    it('may stay empty', () => {
      expect(isValidEmail('')).toBe(true);
      expect(parseValues({ email: '' }).success).toBe(true);
    });

    it('expects exactly one address when the field is filled', () => {
      for (const email of ['a@b.de', 'max.mustermann+newsletter@beispiel.de']) {
        expect(parseValues({ email }).success, email).toBe(true);
      }

      const addresses = [
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

      for (const email of addresses) {
        expect(messageFor({ email }, 'email'), email).toBe(ERROR_KEYS.emailInvalid);
      }
    });
  });

  it('accepts only one of the known services', () => {
    expect(parseValues({ service: 'oelwechsel' }).success).toBe(true);

    for (const service of [
      'Inspektion und Wartung',
      'bremsen; DROP TABLE termine',
      '../../etc/passwd',
      'bremsen%00',
      'OELWECHSEL',
    ]) {
      expect(messageFor({ service }, 'service'), service).toBe(ERROR_KEYS.serviceInvalid);
    }
  });

  it('requires a real date in YYYY-MM-DD format', () => {
    for (const date of ['12.05.2026', '2026-5-12', '2026-13-01', '2027-02-30', 'morgen']) {
      expect(messageFor({ date }, 'date'), date).toBe(ERROR_KEYS.dateInvalid);
    }
  });

  it('accepts appointments no earlier than today and at most MAX_ADVANCE_DAYS later', () => {
    expect(parseValues({ date: TODAY }).success).toBe(true);
    expect(parseValues({ date: addIsoDays(TODAY, MAX_ADVANCE_DAYS) }).success).toBe(true);

    expect(messageFor({ date: addIsoDays(TODAY, -1) }, 'date')).toBe(ERROR_KEYS.dateInPast);
    expect(messageFor({ date: '1999-12-31' }, 'date')).toBe(ERROR_KEYS.dateInPast);
    expect(messageFor({ date: addIsoDays(TODAY, MAX_ADVANCE_DAYS + 1) }, 'date')).toBe(
      ERROR_KEYS.dateTooFar
    );
  });

  it('keeps the note short and free of markup', () => {
    expect(
      parseValues({ note: 'Golf IV, Baujahr 2001 – bitte Anruf unter +49 170 1234567.' }).success
    ).toBe(true);
    expect(parseValues({ note: 'Zeile eins\nZeile zwei' }).success).toBe(true);
    expect(parseValues({ note: '„Ich zitiere Dich“ 100 % & mehr (heute!)' }).success).toBe(true);

    const attempts = [
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

    for (const note of attempts) {
      expect(messageFor({ note }, 'note'), note).toBe(ERROR_KEYS.noteInvalid);
    }

    expect(messageFor({ note: 'x'.repeat(FIELD_LIMITS.note + 1) }, 'note')).toBe(
      ERROR_KEYS.tooLong
    );
  });

  it('reports only the first complaint per field', () => {
    const result = parseValues({ name: '<b>x</b>' + 'y'.repeat(80) });
    if (result.success) throw new Error('should have failed');

    expect(Object.keys(result.errors)).toEqual(['name']);
  });

  it('has a known key for every message', () => {
    const bekannt = Object.values(ERROR_KEYS);
    const result = parseValues({
      name: '',
      service: 'x',
      date: 'x',
      phone: 'x',
      email: 'x',
      note: '<',
    });
    if (result.success) throw new Error('should have failed');

    for (const message of Object.values(result.errors)) {
      expect(bekannt).toContain(message);
    }
  });
});

describe('Demo appointment request – raw values from the form', () => {
  it('ignores path segments and unknown keys', () => {
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

  it('normalises line breaks, spaces and invisible characters', () => {
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
