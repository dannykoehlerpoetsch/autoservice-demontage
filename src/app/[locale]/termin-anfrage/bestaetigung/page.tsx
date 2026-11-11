import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AppointmentConfirmation from '@/components/AppointmentConfirmation';
import { toLocale } from '@/i18n/locale';
import { seitenMetadaten } from '@/lib/metadata';

/**
 * Bestätigungsansicht der Demo-Anfrage.
 *
 * Gehalten werden die Eingaben im `BookingProvider` – also im Browser, nicht hier. Diese
 * Server-Komponente liefert deshalb nur die Hülle und die übersetzte Titelzeile; was
 * zusammengefasst wird, entscheidet der Client. Ohne Zustand (Neuladen, direkter Aufruf)
 * erscheint die Meldung der Komponenten selbst.
 */

type ConfirmationParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ConfirmationParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: toLocale(locale),
    namespace: 'AppointmentConfirmation',
  });

  return seitenMetadaten({ locale, href: '/termin-anfrage/bestaetigung', titel: t('title') });
}

export default function TerminAnfrageBestaetigungPage() {
  return <AppointmentConfirmation />;
}
