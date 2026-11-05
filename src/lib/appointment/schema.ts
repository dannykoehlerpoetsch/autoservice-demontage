import { z } from 'zod';
import { SERVICE_IDS, type ServiceId } from '@/lib/services';
import { addIsoDays, type IsoDate } from '@/lib/dates';

/**
 * Schema für die Terminanfrage – der einzige Eingangspunkt für Nutzereingaben.
 *
 * Validiert wird ausschließlich serverseitig (Server Actions), dadurch gilt die Regel
 * auch bei deaktiviertem JavaScript und bei direkten Requests. Die Meldungstexte selbst
 * stehen hier nicht, sondern als Schlüssel in `messages/*.json` (`Appointment.errors.*`),
 * damit der Server locale-frei bleibt.
 */

/** Maximale Feldlängen – begrenzen Anfragen und halten die Mail lesbar. */
export const FIELD_LIMITS = {
  name: 60,
  phone: 30,
  email: 254,
  note: 1000,
} as const;

/** Termine nehmen wir höchstens so weit im Voraus an (≈ 12 Monate). */
export const MAX_ADVANCE_DAYS = 365;

/** Fehler-Codes; jeder Wert passt zu einem Schlüssel unter `Appointment.errors`. */
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

const REQUIRED_FIELDS: readonly AppointmentField[] = ['name', 'phone', 'email', 'service', 'date'];

const FIELD_SET: ReadonlySet<string> = new Set<string>(APPOINTMENT_FIELDS);

/** Rohe Eingaben, Feld für Feld als String (leere Felder als '' – nie `undefined`). */
export type AppointmentValues = Record<AppointmentField, string>;

/** Geprüfte, normalisierte Eingabe. */
export type AppointmentInput = {
  name: string;
  phone: string;
  email: string;
  service: ServiceId;
  /** Gewünschter Termin als `YYYY-MM-DD`. */
  date: IsoDate;
  note: string;
};

export type AppointmentErrors = Partial<Record<AppointmentField, AppointmentErrorKey>>;

export type AppointmentParseResult =
  | { success: true; data: AppointmentInput }
  | { success: false; errors: AppointmentErrors; values: AppointmentValues };

/** Erlaubter Terminrahmen, abgeleitet vom heutigen Kalendertag der Werkstatt. */
export function getAppointmentDateBounds(today: IsoDate): { minDate: IsoDate; maxDate: IsoDate } {
  return { minDate: today, maxDate: addIsoDays(today, MAX_ADVANCE_DAYS) };
}

/**
 * Name: Buchstaben beliebiger Schrift (inkl. Umlauten/Akzenten) plus Leer-, Punkt-,
 * Komma-, Binde- und Apostrophzeichen, Anfang und Ende ein Buchstabe.
 * `<`, `>`, `/`, `\`, `"` und Klammern sind damit strukturell ausgeschlossen.
 */
const NAME_PATTERN = /^[\p{L}][\p{L}. ,'’-]*[\p{L}]$/u;

/** Telefon: Ziffern, optional führendes `+`, dazu Leer-/Klammer-/Bindestriche. */
const PHONE_PATTERN = /^(?:\+|\()?\d[\d ().-]*\d$/;

/** E.164: höchstens 15 Ziffern, unter 6 ist nichts anzufangen. */
const PHONE_DIGIT_RANGE: readonly [number, number] = [6, 15];

/**
 * E-Mail auf eine Adresse: der lokale Teil kennt kein Komma (sonst ließe sich über ein
 * Feld eine zweite Empfangsadresse einschleusen) und keine Winkelklammern; die Domäne
 * braucht mindestens ein Punkt und eine zweistellige TLD.
 */
const EMAIL_PATTERN =
  /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/**
 * Freitext-Bremse. React escaped beim Rendern und die Mail geht als `text/plain` raus –
 * das hier ist die zweite Schicht, damit aus den Rohdaten nie Markup oder Script-
 * Anweisungen in nachgelagerte Systeme (Mail-Client, Logs, Auswertungen) wandern.
 *
 * Verboten: Winkelklammern, Backslash, Backtick, eckige und geschweifte Klammern, Pipe,
 * Steuerzeichen (mit Ausnahme von Umbruch und Tabulator) sowie typische Script-Schemes.
 * Die Steuerzeichen sind kein Textfeature, sondern sollen Header-Anhänge und unsichtbare
 * Trenner abfangen. SQL- und Shell-Injektion sind davon unabhängig ausgeschlossen, weil aus
 * den Eingaben nie eine Query oder ein Kommando gebaut wird.
 */
const NOTE_FORBIDDEN =
  // eslint-disable-next-line no-control-regex
  /[<>\\`|{}[\]]|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|\b(?:javascript|vbscript|data)\s*:/i;

/** Unsichtbare Zeichen (Zero-Width, Bidi, BOM) dürfen kommentarlos verschwinden. */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;

export function createAppointmentSchema(bounds: { minDate: IsoDate; maxDate: IsoDate }) {
  return z.object({
    name: z
      .string()
      .min(2, { message: ERROR_KEYS.nameTooShort })
      .max(FIELD_LIMITS.name, { message: ERROR_KEYS.tooLong })
      .regex(NAME_PATTERN, { message: ERROR_KEYS.nameInvalid }),
    phone: z
      .string()
      .max(FIELD_LIMITS.phone, { message: ERROR_KEYS.tooLong })
      .regex(PHONE_PATTERN, { message: ERROR_KEYS.phoneInvalid })
      .refine(
        (value) => {
          const digits = value.replace(/\D/g, '').length;
          return digits >= PHONE_DIGIT_RANGE[0] && digits <= PHONE_DIGIT_RANGE[1];
        },
        { message: ERROR_KEYS.phoneInvalid }
      ),
    email: z
      .string()
      .max(FIELD_LIMITS.email, { message: ERROR_KEYS.tooLong })
      .refine((value) => EMAIL_PATTERN.test(value), { message: ERROR_KEYS.emailInvalid }),
    service: z.enum(SERVICE_IDS, { message: ERROR_KEYS.serviceInvalid }),
    date: z.iso
      .date({ message: ERROR_KEYS.dateInvalid })
      // ISO-Daten sind nullgestellt, darum vergleicht der Stringvergleich korrekt.
      .refine((value) => value >= bounds.minDate, { message: ERROR_KEYS.dateInPast })
      .refine((value) => value <= bounds.maxDate, { message: ERROR_KEYS.dateTooFar }),
    note: z
      .string()
      .max(FIELD_LIMITS.note, { message: ERROR_KEYS.tooLong })
      .refine((value) => !NOTE_FORBIDDEN.test(value), { message: ERROR_KEYS.noteInvalid }),
  });
}

/** String-Teile des Formulars herauslesen; `File`-Teile und Fehlendes zählen als leer. */
function getFormString(form: FormData, key: AppointmentField): string {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * Roheingaben normalisieren, bevor das Schema prüft: NFC (gleiche Zeichen, gleiche
 * Prüfung), einheitliche Umbrüche, unsichtbare Zeichen raus. Einzeilige Felder werden
 * zusätzlich auf je einen Leerzeichenlauf verdichtet.
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

  // Sollte nicht vorkommen: alle Regeln setzen eigene `ERROR_KEYS`. Falls doch einmal
  // eine zod-eigene Meldung durchkommt, greift die passende Feld-Fallback-Meldung.
  if (message.includes('too_big')) {
    return ERROR_KEYS.tooLong;
  }

  return `${field}Invalid` as AppointmentErrorKey;
}

/** Eingaben gegen das Schema prüfen. `bounds` kommt vom Server, nie vom Formular. */
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
      continue; // erste Meldung pro Feld gewinnt
    }
    errors[field] = toErrorKey(issue.message, field);
  }

  // Leere Pflichtfelder meldet zod als "zu kurz"/"ungültig"; passenden Text gibt es erst hier.
  for (const field of REQUIRED_FIELDS) {
    if (values[field].trim() === '') {
      errors[field] = ERROR_KEYS.required;
    }
  }

  return { success: false, errors, values };
}
