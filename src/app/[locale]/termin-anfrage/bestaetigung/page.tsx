import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AppointmentConfirmation from '@/components/AppointmentConfirmation';
import { toLocale } from '@/i18n/locale';
import { createPageMetadata } from '@/lib/metadata';

/**
 * Confirmation view of the demo request.
 *
 * The input is held in the `BookingProvider` – so in the browser, not here. This server component
 * therefore only delivers the shell and the translated heading; what gets summarised is decided by
 * the client. Without state (reload, direct call) the components' own message appears.
 *
 * As the only page of the site this one carries `noindex`: nothing is shown but the demo request
 * just placed, and without state only a notice anyway. A URL without search content of its own has
 * no business in search results or in the sitemap.
 */

type ConfirmationParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ConfirmationParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: toLocale(locale),
    namespace: 'AppointmentConfirmation',
  });

  return createPageMetadata({
    locale,
    href: '/termin-anfrage/bestaetigung',
    title: t('title'),
    indexable: false,
  });
}

export default function AppointmentConfirmationPage() {
  return <AppointmentConfirmation />;
}
