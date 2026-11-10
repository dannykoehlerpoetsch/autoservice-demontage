import { z } from 'zod';
import { SERVICE_IDS, type ServiceId } from '@/lib/services';
import { addIsoDays, type IsoDate } from '@/lib/dates';

/**
 * Schema für die Demo-Terminanfrage – die einzige Prüfstelle für Nutzereingaben.
 *
 * Geprüft wird im Browser: `AppointmentForm` ruft `parseAppointmentRequest` vor jedem
 * Weiterreichen auf, danach wandert nichts mehr über eine Netzwerkgrenze. Das Schema ist
 * bewusst frei von Server- und Umgebungsabhängigkeiten, damit Formulareingaben nicht ein
 * zweites Mal (und womöglich anders) irgendwoanders geregelt werden.
 *
 * Meldungstexte stehen hier nicht, sondern als Schlüssel in `messages/*.json`
 * (`Appointment.errors.*`) – die Prüfung bleibt so sprachfrei.
 */

/** Maximale Feldlängen – begrenzen das Formular und halten die E-Mail-Vorschau lesbar. */
export const FIELD_LIMITS = {
  name: 60,
  phone: 30,
  email: 254,
  note: 1000,
} as const;

/** Termine nimmt die Demo höchstens so weit im Voraus an (≈ 12 Monate). */
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

/**
 * Nichts in diesem Formular wird versendet, deshalb sind nur die Angaben Pflicht, ohne die
 * die Zusammenfassung keinen Sinn ergibt. E-Mail und Telefonnummer sind freiwillig – sie
 * erscheinen ausschließlich in der E-Mail-Vorschau.
 */
const REQUIRED_FIELDS: readonly AppointmentField[] = ['name', 'service', 'date'];

const FIELD_SET: ReadonlySet<string> = new Set<string>(APPOINTMENT_FIELDS);

/** Rohe Eingaben, Feld für Feld als String (leere Felder als '' – nie `undefined`). */
export type AppointmentValues = Record<AppointmentField, string>;

/** Geprüfte, normalisierte Eingabe. Leere optionale Felder bleiben ''. */
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

/**
 * Erlaubter Terminrahmen. `today` ist der Kalendertag in der Zeitzone der Werkstatt
 * (`todayIso()` aus `@/lib/dates`) – dieselbe Funktion läuft im Browser wie beim Rendern,
 * deshalb fällt "heute" nicht je nach Rechneruhr unterschiedlich aus.
 */
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
 * Freitext-Bremse. React escaped beim Rendern, und die E-Mail-Vorschau wird als Text
 * gesetzt – das hier ist die zweite Schicht, damit aus den Rohdaten nie Markup wird.
 *
 * Verboten: Winkelklammern, Backslash, Backtick, eckige und geschweifte Klammern, Pipe,
 * Steuerzeichen (mit Ausnahme von Umbruch und Tabulator) sowie typische Script-Schemes.
 * Die Steuerzeichen sind kein Textfeature, sondern sollen unsichtbare Trenner abfangen.
 */
const NOTE_FORBIDDEN =
  // eslint-disable-next-line no-control-regex
  /[<>\\`|{}[\]]|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|\b(?:javascript|vbscript|data)\s*:/i;

/** Unsichtbare Zeichen (Zero-Width, Bidi, BOM) dürfen kommentarlos verschwinden. */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;

/** Leer ist erlaubt – was eingetragen wird, muss eine einzelne Adresse sein. */
export function isValidEmail(value: string): boolean {
  return value === '' || EMAIL_PATTERN.test(value);
}

/** Leer ist erlaubt – was eingetragen wird, muss eine erreichbare Rufnummer sein. */
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

/** Feld, das leer bleiben darf – Länge gilt trotzdem für das, was eingetragen wurde. */
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

/**
 * Eingaben gegen das Schema prüfen – reine Funktion, kein Netzwerk, keine Side Effects.
 * `bounds` kommt aus `getAppointmentDateBounds(todayIso())`, nie aus dem Formular.
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
