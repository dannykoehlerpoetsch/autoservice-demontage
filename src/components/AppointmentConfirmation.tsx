'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, CalendarCheck, Mail, Pencil, Plus } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { formatIsoDateLong, intlLocaleFor } from '@/lib/dates';
import { findServiceHeading, type ServiceListing } from '@/lib/services';
import { useBookingService } from './BookingProvider';
import DemoEmailPreviewDialog from './DemoEmailPreviewDialog';

/**
 * Zusammenfassung der abgeschlossenen Demo-Anfrage.
 *
 * Gezeigt wird, was im `BookingProvider` liegt – also nichts nach einem Neuladen. Die Seite
 * behauptet deshalb an keiner Stelle, es sei etwas versendet oder ein Termin gebucht: Sie
 * fasst zusammen, erklärt die Simulation und bietet die E-Mail-Vorschau als Text an.
 */

export default function AppointmentConfirmation() {
  const t = useTranslations('AppointmentConfirmation');
  const tField = useTranslations('Appointment.fields');
  const tServices = useTranslations('Services');
  const locale = useLocale();
  const router = useRouter();
  const { request, startNewRequest } = useBookingService();

  const [previewOpen, setPreviewOpen] = useState(false);

  if (!request) {
    return <KeineAnfrage />;
  }

  const items = tServices.raw('items') as ServiceListing[];
  const serviceHeading = findServiceHeading(items, request.service);

  const zeilen = [
    { label: tField('name'), wert: request.name },
    { label: tField('service'), wert: serviceHeading },
    { label: tField('date'), wert: formatIsoDateLong(request.date, intlLocaleFor(locale)) },
    { label: tField('email'), wert: request.email || t('notProvided') },
    { label: tField('phone'), wert: request.phone || t('notProvided') },
    { label: tField('note'), wert: request.note || t('noNote') },
  ];

  const neueAnfrage = () => {
    startNewRequest();
    router.push('/termin-anfrage');
  };

  return (
    <section className="m-auto flex w-full max-w-xl flex-col items-start px-4 py-8">
      <div className="flex items-center gap-3">
        <CalendarCheck size={30} className="shrink-0 text-brand-line" aria-hidden="true" />
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>
      <p className="mt-3">{t('intro')}</p>

      <h2 className="mt-8 text-xl font-semibold">{t('summaryHeading')}</h2>
      <dl className="mt-3 w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        {zeilen.map((zeile) => (
          <div key={zeile.label} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-gray-600 dark:text-gray-300">{zeile.label}</dt>
            <dd className="break-words whitespace-pre-line">{zeile.wert}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex w-full flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold">{t('preview.heading')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('preview.intro')}</p>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex cursor-pointer items-center gap-2 self-start rounded-md bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line"
        >
          <Mail size={18} aria-hidden="true" />
          {t('preview.button')}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push('/termin-anfrage')}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm transition-colors hover:border-brand-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line dark:border-gray-600"
        >
          <Pencil size={16} aria-hidden="true" />
          {t('edit')}
        </button>
        <button
          type="button"
          onClick={neueAnfrage}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm transition-colors hover:border-brand-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line dark:border-gray-600"
        >
          <Plus size={16} aria-hidden="true" />
          {t('new')}
        </button>
      </div>

      <Link
        href="/"
        className="mt-8 flex items-center gap-2 text-sm underline hover:text-brand-strong"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('backHome')}
      </Link>

      <DemoEmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        appointment={request}
        serviceHeading={serviceHeading}
      />
    </section>
  );
}

/**
 * Ohne Zustand gibt es nichts zusammenzufassen – nach einem Neuladen wie beim direkten
 * Aufruf. Die Meldung erklärt den Grund, statt eine Anfrage vorzuspielen.
 */
function KeineAnfrage() {
  const t = useTranslations('AppointmentConfirmation');

  return (
    <section className="m-auto flex grow flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-3xl font-bold">{t('missing.title')}</h1>
      <p className="max-w-md">{t('missing.text')}</p>
      <Link
        href="/termin-anfrage"
        className="rounded-md bg-brand-strong px-4 py-2 text-sm text-white transition-colors hover:bg-brand-strong/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line"
      >
        {t('missing.again')}
      </Link>
    </section>
  );
}
