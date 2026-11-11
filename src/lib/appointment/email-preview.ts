import { formatIsoDateLong, intlLocaleFor, type IsoDate } from '@/lib/dates';

/**
 * Email preview for the demo appointment request – a plain text factory, no sending.
 *
 * The function produces the text a confirmation email *would have* had: from the form's input and
 * the translations of the active language. There is no endpoint, no environment variable and no
 * call outwards – `buildDemoEmailPreview` returns a string and nothing else.
 *
 * Translations come in as `translate`: `useTranslations()` from next-intl inside the form, the
 * translator from `src/test-utils.ts` in tests. That keeps the function callable without a React
 * tree and without a request context. Every key is an absolute name from `messages/*.json`; field
 * labels come from `Appointment.fields` and therefore exist only once in the project.
 */

/** Preview result – the fields as they would stand in an email header. */
export type DemoEmailPreview = {
  /** Anzeigename des fiktionalen Absenders. */
  from: string;
  /** Entered recipient address, `null` when the field stayed empty. */
  to: string | null;
  subject: string;
  /** Body as plain text – the value is rendered, not interpreted as HTML. */
  body: string;
};

/** Like the fields of an email, plus the translated service name. */
export type DemoEmailAppointment = {
  name: string;
  phone: string;
  email: string;
  note: string;
  date: IsoDate;
  serviceHeading: string;
};

/** The slice of the next-intl translation function this function needs. */
export type Translate = (key: string, values?: Readonly<Record<string, string | number>>) => string;

export type DemoEmailOptions = {
  /** `de` or `en` – decides the language of the field labels and the date. */
  locale: string;
  translate: Translate;
};

const FIELD_KEYS = ['name', 'phone', 'email', 'service', 'date', 'note'] as const;

/**
 * Empty optional fields are not left out but named explicitly – otherwise the preview looks like
 * an incomplete message. The note keeps its own text because "no note given" fits there better
 * than "Not given".
 */
function fallbackFor(key: (typeof FIELD_KEYS)[number], t: Translate, notProvided: string): string {
  return key === 'note' ? t('DemoEmail.noNote') : notProvided;
}

/**
 * Builds the preview. No side effects, no network requests, no environment variables: same input,
 * same language, same text.
 */
export function buildDemoEmailPreview(
  appointment: DemoEmailAppointment,
  { locale, translate }: DemoEmailOptions
): DemoEmailPreview {
  const t = translate;
  const notProvided = t('AppointmentConfirmation.notProvided');

  const fieldValues: Record<(typeof FIELD_KEYS)[number], string> = {
    name: appointment.name,
    phone: appointment.phone,
    email: appointment.email,
    service: appointment.serviceHeading,
    date: formatIsoDateLong(appointment.date, intlLocaleFor(locale)),
    note: appointment.note,
  };

  const rows = FIELD_KEYS.map((key) => {
    const value = fieldValues[key].trim();

    return `${t(`Appointment.fields.${key}`)}: ${value === '' ? fallbackFor(key, t, notProvided) : value}`;
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
      ...rows,
      '',
      `${t('DemoEmail.noticeHeading')}:`,
      '',
      t('DemoEmail.notice'),
      '',
      t('DemoEmail.signature'),
    ].join('\n'),
  };
}
