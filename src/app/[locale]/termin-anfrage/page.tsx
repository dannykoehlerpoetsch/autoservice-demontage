import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AppointmentForm from '@/components/AppointmentForm';
import { toLocale } from '@/i18n/locale';
import { createPageMetadata } from '@/lib/metadata';

/**
 * The page must not be pinned to the build time: the calendar in the form renders its window from
 * today's calendar day, and that should be the same in the delivered HTML as in the browser.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Appointment' });

  return createPageMetadata({ locale, href: '/termin-anfrage', title: t('title') });
}

export default function AppointmentRequestPage() {
  return <AppointmentForm />;
}
