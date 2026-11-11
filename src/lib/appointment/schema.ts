import { z } from 'zod';
import { SERVICE_IDS, type ServiceId } from '@/lib/services';
import { addIsoDays, type IsoDate } from '@/lib/dates';

/**
 * Schema for the demo appointment request – the single validation point for user input.
 *
 * Validation runs in the browser: `AppointmentForm` calls `parseAppointmentRequest` before
 * handing anything on, and nothing crosses a network boundary afterwards. The schema is
 * deliberately free of server and environment dependencies so form input is never regulated a
 * second time (and possibly differently) somewhere else.
 *
 * Message texts do not live here but as keys in `messages/*.json` (`Appointment.errors.*`) –
 * that keeps the validation language-free.
 */

/** Maximum field lengths – they bound the form and keep the email preview readable. */
export const FIELD_LIMITS = {
  name: 60,
  phone: 30,
  email: 254,
  note: 1000,
} as const;

/** The demo accepts appointments no more than this far ahead (~12 months). */
export const MAX_ADVANCE_DAYS = 365;

/** Error codes; every value matches a key under `Appointment.errors`. */
export const ERROR_KEYS = {
  required: 'required',
  tooLong: 'tooLong',
  nameTooShort: 'nameTooShort',
  nameInvalid: 'nameInvalid',
  phoneInvalid: 'phoneInvalid',
  emailInvalid: 'emailInvalid',
  serviceInvalid: 'serviceInvalid',
  dateInvalid: 'dateInvalid',
  dateInPast: 'dateInPast',
  dateTooFar: 'dateTooFar',
  noteInvalid: 'noteInvalid',
} as const;

export type AppointmentErrorKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS];

const APPOINTMENT_ERROR_KEYS: ReadonlySet<string> = new Set<string>(Object.values(ERROR_KEYS));

export const APPOINTMENT_FIELDS = ['name', 'phone', 'email', 'service', 'date', 'note'] as const;

export type AppointmentField = (typeof APPOINTMENT_FIELDS)[number];

/**
 * Nothing in this form is sent anywhere, so only the details without which the summary makes no
 * sense are required. Email and phone number are optional – they appear in the email preview only.
 */
const REQUIRED_FIELDS: readonly AppointmentField[] = ['name', 'service', 'date'];

const FIELD_SET: ReadonlySet<string> = new Set<string>(APPOINTMENT_FIELDS);

/** Raw input, field by field as a string (empty fields as '' – never `undefined`). */
export type AppointmentValues = Record<AppointmentField, string>;

/** Validated, normalised input. Empty optional fields stay ''. */
export type AppointmentInput = {
  name: string;
  phone: string;
  email: string;
  service: ServiceId;
  /** Requested appointment as `YYYY-MM-DD`. */
  date: IsoDate;
  note: string;
};

export type AppointmentErrors = Partial<Record<AppointmentField, AppointmentErrorKey>>;

export type AppointmentParseResult =
  | { success: true; data: AppointmentInput }
  | { success: false; errors: AppointmentErrors; values: AppointmentValues };

/**
 * Allowed appointment window. `today` is the calendar day in the workshop's timezone
 * (`todayIso()` from `@/lib/dates`) – the same function runs in the browser as during
 * rendering, so "today" never differs depending on the machine's clock.
 */
export function getAppointmentDateBounds(today: IsoDate): { minDate: IsoDate; maxDate: IsoDate } {
  return { minDate: today, maxDate: addIsoDays(today, MAX_ADVANCE_DAYS) };
}

/**
 * Name: letters of any script (including umlauts and accents) plus space, dot, comma, hyphen
 * and apostrophe, starting and ending with a letter. `<`, `>`, `/`, `\`, `"` and brackets are
 * therefore structurally excluded.
 */
const NAME_PATTERN = /^[\p{L}][\p{L}. ,'’-]*[\p{L}]$/u;

/** Phone: digits, an optional leading `+`, plus spaces, brackets and hyphens. */
const PHONE_PATTERN = /^(?:\+|\()?\d[\d ().-]*\d$/;

/** E.164: at most 15 digits, under 6 there is nothing to start with. */
const PHONE_DIGIT_RANGE: readonly [number, number] = [6, 15];

/**
 * Email for exactly one address: the local part knows no comma (otherwise a second receiving
 * address could be smuggled through one field) and no angle brackets; the domain needs at least
 * one dot and a two-letter TLD.
 */
const EMAIL_PATTERN =
  /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/**
 * Free-text brake. React escapes when rendering and the email preview is set as text – this is
 * the second layer so the raw data never becomes markup.
 *
 * Forbidden: angle brackets, backslash, backtick, square and curly brackets, pipe, control
 * characters (except line break and tab) and typical script schemes. The control characters are
 * not a text feature, they are there to catch invisible separators.
 */
const NOTE_FORBIDDEN =
  // eslint-disable-next-line no-control-regex
  /[<>\\`|{}[\]]|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|\b(?:javascript|vbscript|data)\s*:/i;

/** Invisible characters (zero-width, bidi, BOM) may disappear without a comment. */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;

/** Allowed to stay empty – whatever is entered must be a single address. */
export function isValidEmail(value: string): boolean {
  return value === '' || EMAIL_PATTERN.test(value);
}

/** Allowed to stay empty – whatever is entered must be a reachable phone number. */
export function isValidPhone(value: string): boolean {
  if (value === '') {
    return true;
  }
  if (!PHONE_PATTERN.test(value)) {
    return false;
  }

  const digits = value.replace(/\D/g, '').length;
  return digits >= PHONE_DIGIT_RANGE[0] && digits <= PHONE_DIGIT_RANGE[1];
}

/** Field that may stay empty – the length still applies to whatever was entered. */
function optionalField(max: number) {
  return z.string().max(max, { message: ERROR_KEYS.tooLong });
}

export function createAppointmentSchema(bounds: { minDate: IsoDate; maxDate: IsoDate }) {
  return z.object({
    name: z
      .string()
      .min(2, { message: ERROR_KEYS.nameTooShort })
      .max(FIELD_LIMITS.name, { message: ERROR_KEYS.tooLong })
      .regex(NAME_PATTERN, { message: ERROR_KEYS.nameInvalid }),
    phone: optionalField(FIELD_LIMITS.phone).refine(isValidPhone, {
      message: ERROR_KEYS.phoneInvalid,
    }),
    email: optionalField(FIELD_LIMITS.email).refine(isValidEmail, {
      message: ERROR_KEYS.emailInvalid,
    }),
    service: z.enum(SERVICE_IDS, { message: ERROR_KEYS.serviceInvalid }),
    date: z.iso
      .date({ message: ERROR_KEYS.dateInvalid })
      // ISO dates are zero-padded, which is why comparing them as strings works correctly.
      .refine((value) => value >= bounds.minDate, { message: ERROR_KEYS.dateInPast })
      .refine((value) => value <= bounds.maxDate, { message: ERROR_KEYS.dateTooFar }),
    note: z
      .string()
      .max(FIELD_LIMITS.note, { message: ERROR_KEYS.tooLong })
      .refine((value) => !NOTE_FORBIDDEN.test(value), { message: ERROR_KEYS.noteInvalid }),
  });
}

/** Reads the string parts of the form; `File` parts and missing values count as empty. */
function getFormString(form: FormData, key: AppointmentField): string {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * Normalises raw input before the schema validates: NFC (same characters, same validation),
 * uniform line breaks, invisible characters removed. Single-line fields are additionally
 * collapsed to one run of whitespace each.
 */
export function readAppointmentValues(form: FormData): AppointmentValues {
  const values = {} as AppointmentValues;

  for (const field of APPOINTMENT_FIELDS) {
    const normalized = getFormString(form, field)
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(INVISIBLE_CHARS, '');

    values[field] = field === 'note' ? normalized.trim() : normalized.replace(/\s+/g, ' ').trim();
  }

  return values;
}

function isAppointmentField(value: unknown): value is AppointmentField {
  return typeof value === 'string' && FIELD_SET.has(value);
}

function toErrorKey(message: string, field: AppointmentField): AppointmentErrorKey {
  if (APPOINTMENT_ERROR_KEYS.has(message)) {
    return message as AppointmentErrorKey;
  }

  // Should not happen: every rule sets its own `ERROR_KEYS`. If a zod-built-in message ever
  // gets through, the matching field fallback message takes over.
  if (message.includes('too_big')) {
    return ERROR_KEYS.tooLong;
  }

  return `${field}Invalid` as AppointmentErrorKey;
}

/**
 * Validates the input against the schema – a pure function, no network, no side effects.
 * `bounds` comes from `getAppointmentDateBounds(todayIso())`, never from the form.
 */
export function parseAppointmentRequest(
  values: AppointmentValues,
  bounds: { minDate: IsoDate; maxDate: IsoDate }
): AppointmentParseResult {
  const result = createAppointmentSchema(bounds).safeParse(values);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: AppointmentErrors = {};

  for (const issue of result.error.issues) {
    const [field] = issue.path;
    if (!isAppointmentField(field) || errors[field]) {
      continue; // the first message per field wins
    }
    errors[field] = toErrorKey(issue.message, field);
  }

  // zod reports empty required fields as "too short"/"invalid"; the matching text only appears here.
  for (const field of REQUIRED_FIELDS) {
    if (values[field].trim() === '') {
      errors[field] = ERROR_KEYS.required;
    }
  }

  return { success: false, errors, values };
}
