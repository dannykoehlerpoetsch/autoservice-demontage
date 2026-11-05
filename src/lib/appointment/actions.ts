'use server';

import { getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { todayIso, formatIsoDateLong } from '@/lib/dates';
import { sendMail, type MailMessage } from './mail';
import {
  parseAppointmentRequest,
  readAppointmentValues,
  getAppointmentDateBounds,
  type AppointmentErrors,
  type AppointmentField,
} from './schema';
import {
  findAppointmentRequest,
  isAppointmentId,
  markAppointmentRequestMailed,
  saveAppointmentRequest,
  type StoredAppointmentRequest,
} from './store';

/**
 * Server Actions der Terminanfrage. Sie sind der einzige Ort, an dem Nutzerangaben
 * verarbeitet werden – validiert wird ausschließlich über `schema.ts`, geprüft wird nur,
 * was in der Serverkopie (`store.ts`) steht.
 */

export type AppointmentFormState = {
  errors: AppointmentErrors;
  values: Record<AppointmentField, string>;
} | null;

export type MailFormState = {
  status: 'consent-required' | 'failed' | 'not-configured' | 'sent' | 'already-sent' | 'expired';
  /** Nur für die Erfolgs-/Hinweiszeile nötig. */
  email?: string;
} | null;

/**
 * Sprache der Anfrage. `getLocale()` ist in Server Actions nicht zu haben, deshalb liegt sie
 * als verstecktes Feld im Formular – erlaubt sind trotzdem nur die konfigurierten Locales.
 */
function resolveLocale(value: unknown): Locale {
  return typeof value === 'string' && routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale;
}

export async function submitAppointmentRequest(
  _previous: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const values = readAppointmentValues(formData);
  const bounds = getAppointmentDateBounds(todayIso());
  const result = parseAppointmentRequest(values, bounds);

  if (!result.success) {
    return { errors: result.errors, values: result.values };
  }

  const locale = resolveLocale(formData.get('locale'));
  const id = saveAppointmentRequest(result.data, locale);

  // Die Bestätigungsseite liegt hinter der Zufalls-ID derselben Serverkopie.
  redirect(
    getPathname({
      locale,
      href: { pathname: '/termin-anfrage/bestaetigung', query: { id } },
    })
  );
}

/**
 * Bestätigungs-Mail an die in der Anfrage hinterlegte Adresse. Ein zweiter Versand
 * derselben Anfrage wird abgelehnt – ohne Serverkopie und diese Sperre wäre die Action
 * ein offener Mail-Relay für beliebige Adressen.
 */
export async function sendAppointmentRequestMail(
  _previous: MailFormState,
  formData: FormData
): Promise<MailFormState> {
  const id = formData.get('id');
  if (!isAppointmentId(id)) {
    return { status: 'expired' };
  }

  if (formData.get('consent') !== 'yes') {
    return { status: 'consent-required' };
  }

  const request = findAppointmentRequest(id);
  if (!request) {
    return { status: 'expired' };
  }

  if (request.mailSentAt !== null) {
    return { status: 'already-sent', email: request.input.email };
  }

  const mail = await buildMailMessage(request);
  const result = await sendMail(mail);

  if (result.status === 'sent') {
    markAppointmentRequestMailed(id);
    return { status: 'sent', email: mail.to };
  }

  // Bei "not-configured" bleibt die Anfrage unversendet – in der Demo-Umgebung der
  // Normalfall, die UI erklärt sie offen statt einen Erfolg vorzuspielen.
  return { status: result.status, email: mail.to };
}

type ServiceItem = { id: string; heading: string };

async function buildMailMessage(request: StoredAppointmentRequest): Promise<MailMessage> {
  const { input, locale } = request;

  const t = await getTranslations({ locale, namespace: 'Mail' });
  const tField = await getTranslations({ locale, namespace: 'Appointment.fields' });
  const items = (await getTranslations({ locale, namespace: 'Services' })).raw(
    'items'
  ) as ServiceItem[];

  const service = items.find((item) => item.id === input.service)?.heading ?? input.service;

  const lines = [
    t('greeting', { name: input.name }),
    '',
    t('intro'),
    '',
    `${tField('name')}: ${input.name}`,
    `${tField('phone')}: ${input.phone}`,
    `${tField('email')}: ${input.email}`,
    `${tField('service')}: ${service}`,
    `${tField('date')}: ${formatIsoDateLong(input.date, locale)}`,
    `${tField('note')}: ${input.note || t('noNote')}`,
    '',
    t('outro'),
    '',
    t('signature'),
    '',
    t('demoNote'),
  ];

  return {
    to: input.email,
    subject: t('subject', { service }),
    // Bewusst nur Text: Nutzerangaben landen nirgends als HTML.
    text: lines.join('\n'),
  };
}
