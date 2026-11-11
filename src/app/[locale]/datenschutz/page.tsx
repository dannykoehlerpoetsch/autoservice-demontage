import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { toLocale } from '@/i18n/locale';
import { createPageMetadata } from '@/lib/metadata';
import { type OperatorField } from '@/lib/legal/operator';
import { FieldValue, OperatorAddress } from '@/components/LegalAngabe';

/**
 * Privacy policy of this page. It describes exclusively what this website actually does: served by
 * Vercel, two things stored in the browser (language and colour scheme), a request form without any
 * transmission. The responsible person, rights and legal bases are named; whatever only the person
 * operating the site can clarify deliberately does not stand on this page.
 */

type PrivacyPolicyParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PrivacyPolicyParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Datenschutz' });

  return createPageMetadata({ locale, href: '/datenschutz', title: t('title') });
}

export default async function PrivacyPolicyPage({ params }: PrivacyPolicyParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Datenschutz' });

  const fieldLabels: Partial<Record<OperatorField, string>> = {
    name: t('felder.name'),
    strasse: t('felder.strasse'),
    ort: t('felder.ort'),
    email: t('felder.email'),
  };
  const placeholder = (field: OperatorField) =>
    t('platzhalter', { field: fieldLabels[field] ?? field });

  return (
    <section className="flex flex-col items-start gap-6 py-4 m-auto md:px-4">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('verantwortlich.heading')}</h2>
        <p className="text-sm leading-relaxed">{t('verantwortlich.text')}</p>
        <OperatorAddress placeholder={placeholder} />
        <div className="flex flex-wrap gap-x-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t('felder.email')}:</span>
          <FieldValue field="email" placeholder={placeholder} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('hosting.heading')}</h2>
        <p className="text-sm leading-relaxed">{t('hosting.text')}</p>
        <p className="text-sm leading-relaxed">{t('hosting.anbieter')}</p>
        <p className="text-sm leading-relaxed">{t('hosting.schriften')}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('darstellung.heading')}</h2>
        <p className="text-sm leading-relaxed">{t('darstellung.sprache')}</p>
        <p className="text-sm leading-relaxed">{t('darstellung.farbe')}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('anfrage.heading')}</h2>
        <p className="text-sm leading-relaxed">{t('anfrage.text')}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('rechte.heading')}</h2>
        <p className="text-sm leading-relaxed">{t('rechte.text')}</p>
        <ul className="flex flex-col gap-1 text-sm leading-relaxed">
          {(t.raw('rechte.items') as string[]).map((recht) => (
            <li key={recht}>{recht}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
