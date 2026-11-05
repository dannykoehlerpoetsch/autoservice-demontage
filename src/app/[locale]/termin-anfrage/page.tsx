import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AppointmentForm from '@/components/AppointmentForm';
import { getAppointmentDateBounds } from '@/lib/appointment/schema';
import { todayIso } from '@/lib/dates';
import type { Locale } from '@/i18n/routing';

/**
 * Die Termingrenzen hängen am heutigen Kalendertag – die Seite darf deshalb nicht auf den
 * Build-Zeitpunkt festgeschrieben werden.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Appointment' });

  return { title: t('title') };
}

export default async function TerminAnfragePage() {
  const { minDate, maxDate } = getAppointmentDateBounds(todayIso());

  return <AppointmentForm minDate={minDate} maxDate={maxDate} />;
}
