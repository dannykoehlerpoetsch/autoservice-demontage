import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AppointmentForm from '@/components/AppointmentForm';
import type { Locale } from '@/i18n/routing';

/**
 * Die Seite darf nicht auf den Bauzeitpunkt festgeschrieben werden: der Kalender im Formular
 * rendert seinen Rahmen aus dem heutigen Kalendertag, und der soll im ausgelieferten HTML
 * derselbe sein wie im Browser.
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

export default function TerminAnfragePage() {
  return <AppointmentForm />;
}
