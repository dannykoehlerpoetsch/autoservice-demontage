import { formatIsoDateLong, intlLocaleFor, type IsoDate } from '@/lib/dates';

/**
 * E-Mail-Vorschau für die Demo-Terminanfrage – reine Textfabrik, kein Versand.
 *
 * Die Funktion erzeugt den Text, den eine Bestätigungs-E-Mail *hätte*: aus den Eingaben des
 * Formulars und den Übersetzungen der aktiven Sprache. Es gibt keinen Endpunkt, keine
 * Umgebungsvariable und keinen Aufruf nach draußen – `buildDemoEmailPreview` gibt einen
 * String zurück und sonst nichts.
 *
 * Die Übersetzungen kommen als `translate` hinein: im Formular `useTranslations()` aus
 * next-intl, in den Tests der Übersetzer aus `src/test-utils.ts`. So bleibt die Funktion ohne
 * React-Baum und ohne Request-Kontext aufrufbar. Alle Schlüssel sind absolute Namen aus
 * `messages/*.json`; Feldbeschriftungen kommen aus `Appointment.fields` und stehen damit nur
 * einmal im Projekt.
 */

/** Rückgabe der Vorschau – die Felder, wie sie in einem E-Mail-Header stehen würden. */
export type DemoEmailPreview = {
  /** Anzeigename des fiktionalen Absenders. */
  from: string;
  /** Eingetragene Empfängeradresse, `null`, wenn das Feld leer geblieben ist. */
  to: string | null;
  subject: string;
  /** Rumpf als Klartext – der Wert wird gerendert, nicht als HTML interpretiert. */
  body: string;
};

/** Wie die Felder einer E-Mail, plus die übersetzte Leistungsbezeichnung. */
export type DemoEmailAppointment = {
  name: string;
  phone: string;
  email: string;
  note: string;
  date: IsoDate;
  serviceHeading: string;
};

/** Ausschnitt der next-intl-Übersetzerfunktion, den diese Funktion braucht. */
export type Translate = (key: string, values?: Readonly<Record<string, string | number>>) => string;

export type DemoEmailOptions = {
  /** `de` oder `en` – bestimmt Sprache der Feldlabels und des Datums. */
  locale: string;
  translate: Translate;
};

const FIELD_KEYS = ['name', 'phone', 'email', 'service', 'date', 'note'] as const;

/**
 * Leere optionale Felder werden nicht ausgelassen, sondern ausdrücklich benannt – sonst sieht
 * die Vorschau aus wie eine unvollständige Nachricht. Die Bemerkung behält ihren eigenen Text,
 * weil "keine Bemerkung angegeben" dort besser passt als "Nicht angegeben".
 */
function fallbackFor(key: (typeof FIELD_KEYS)[number], t: Translate, notProvided: string): string {
  return key === 'note' ? t('DemoEmail.noNote') : notProvided;
}

/**
 * Vorschau bauen. Keine Seiteneffekte, keine Netzwerkanfragen, keine Umgebungsvariablen:
 * dieselbe Eingabe, dieselbe Sprache, derselbe Text.
 */
export function buildDemoEmailPreview(
  appointment: DemoEmailAppointment,
  { locale, translate }: DemoEmailOptions
): DemoEmailPreview {
  const t = translate;
  const notProvided = t('AppointmentConfirmation.notProvided');

  const werte: Record<(typeof FIELD_KEYS)[number], string> = {
    name: appointment.name,
    phone: appointment.phone,
    email: appointment.email,
    service: appointment.serviceHeading,
    date: formatIsoDateLong(appointment.date, intlLocaleFor(locale)),
    note: appointment.note,
  };

  const zeilen = FIELD_KEYS.map((key) => {
    const wert = werte[key].trim();

    return `${t(`Appointment.fields.${key}`)}: ${wert === '' ? fallbackFor(key, t, notProvided) : wert}`;
  });

  return {
    from: t('DemoEmail.from'),
    to: appointment.email.trim() === '' ? null : appointment.email,
    subject: t('DemoEmail.subject', { service: appointment.serviceHeading }),
    body: [
      t('DemoEmail.greeting', { name: appointment.name }),
      '',
      t('DemoEmail.intro'),
      '',
      ...zeilen,
      '',
      `${t('DemoEmail.noticeHeading')}:`,
      '',
      t('DemoEmail.notice'),
      '',
      t('DemoEmail.signature'),
    ].join('\n'),
  };
}
