import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import AppointmentMailOptIn from '@/components/AppointmentMailOptIn';
import { formatIsoDateLong } from '@/lib/dates';
import { findAppointmentRequest } from '@/lib/appointment/store';
import type { Locale } from '@/i18n/routing';

/**
 * Bestätigung: zeigt alle Eingaben aus der Serverkopie wieder und bietet die
 * E-Mail-Kopie an. Der einzige Zugang ist die Zufalls-ID aus dem Redirect – ohne sie gibt
 * es keine Einsicht in Anfragen (und kein Versand an eine fremde Adresse).
 */

type ServiceItem = { id: string; heading: string };

type ConfirmationParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ConfirmationParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: 'AppointmentConfirmation',
  });

  return { title: t('title') };
}

function pickId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function TerminAnfrageBestaetigungPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const request = findAppointmentRequest(pickId((await searchParams).id));

  const t = await getTranslations({ locale, namespace: 'AppointmentConfirmation' });
  const tField = await getTranslations({ locale, namespace: 'Appointment.fields' });

  if (!request) {
    return (
      <section className="m-auto flex grow flex-col items-center justify-center gap-3 p-4 text-center">
        <h1 className="text-3xl font-bold">{t('expired.title')}</h1>
        <p className="max-w-md">{t('expired.text')}</p>
        <Link
          href="/termin-anfrage"
          className="rounded-md bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand/90"
        >
          {t('expired.again')}
        </Link>
      </section>
    );
  }

  const items = (await getTranslations({ locale, namespace: 'Services' })).raw(
    'items'
  ) as ServiceItem[];
  const service = items.find((item) => item.id === request.input.service)?.heading;

  const rows = [
    { label: tField('name'), value: request.input.name },
    { label: tField('phone'), value: request.input.phone },
    { label: tField('email'), value: request.input.email },
    { label: tField('service'), value: service ?? request.input.service },
    { label: tField('date'), value: formatIsoDateLong(request.input.date, locale) },
    { label: tField('note'), value: request.input.note || t('noNote') },
  ];

  return (
    <section className="m-auto flex w-full max-w-xl flex-col items-start px-4 py-8">
      <div className="flex items-center gap-3">
        <CalendarCheck size={30} className="shrink-0 text-brand" aria-hidden="true" />
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>
      <p className="mt-3">{t('intro')}</p>

      <h2 className="mt-8 text-xl font-semibold">{t('summaryHeading')}</h2>
      <dl className="mt-3 w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-gray-600 dark:text-gray-300">{row.label}</dt>
            <dd className="break-words whitespace-pre-line">{row.value}</dd>
          </div>
        ))}
      </dl>

      <AppointmentMailOptIn
        id={request.id}
        email={request.input.email}
        alreadySent={request.mailSentAt !== null}
      />

      <Link href="/" className="mt-8 flex items-center gap-2 text-sm underline hover:text-brand">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('backHome')}
      </Link>
    </section>
  );
}
