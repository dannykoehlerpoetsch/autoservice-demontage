import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { toLocale } from '@/i18n/locale';
import { createPageMetadata } from '@/lib/metadata';
import { operatorValue, type OperatorField } from '@/lib/legal/operator';
import { FieldValue, OperatorAddress } from '@/components/LegalAngabe';

/**
 * Legal notice of this portfolio page: the details required by § 5 para. 1 DDG of the person
 * operating the site and a short note about the fictional project – nothing more.
 *
 * The values stand in `src/lib/legal/operator.ts`. Whatever is missing there appears as a clear
 * placeholder; nothing is invented. Optional details (phone, VAT ID) are rendered only when entered.
 */

type LegalNoticeParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LegalNoticeParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Impressum' });

  return createPageMetadata({ locale, href: '/impressum', title: t('title') });
}

export default async function LegalNoticePage({ params }: LegalNoticeParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Impressum' });

  const placeholder = (field: OperatorField) => t('platzhalter', { field: t(`felder.${field}`) });

  return (
    <section className="flex flex-col items-start gap-6 py-4 m-auto md:px-4">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {t('fictionalNotice')}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('anbieter.heading')}</h2>
        <OperatorAddress placeholder={placeholder} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('kontakt.heading')}</h2>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-gray-500 dark:text-gray-400">{t('felder.email')}:</dt>
            <dd>
              <FieldValue field="email" placeholder={placeholder} />
            </dd>
          </div>

          {(['telefon', 'ustIdNr'] as const)
            .filter((field) => operatorValue(field) !== null)
            .map((field) => (
              <div className="flex flex-wrap gap-x-2" key={field}>
                <dt className="text-gray-500 dark:text-gray-400">{t(`felder.${field}`)}:</dt>
                <dd>
                  <FieldValue field={field} placeholder={placeholder} />
                </dd>
              </div>
            ))}
        </dl>
      </section>
    </section>
  );
}
