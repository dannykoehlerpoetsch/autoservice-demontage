import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { toLocale } from '@/i18n/locale';
import { seitenMetadaten } from '@/lib/metadata';
import { betreiberAngabe, type BetreiberFeld } from '@/lib/legal/operator';
import { Angabe, Anschrift } from '@/components/LegalAngabe';

/**
 * Impressum dieser Portfolio-Seite: die nach § 5 Abs. 1 DDG erforderlichen Angaben der
 * betreibenden Person und ein kurzer Hinweis auf das fiktive Projekt – weiter nichts.
 *
 * Die Werte stehen in `src/lib/legal/operator.ts`. Was dort fehlt, erscheint als eindeutiger
 * Platzhalter; erfunden wird nichts. Freiwillige Angaben (Telefon, USt-IdNr.) werden nur
 * gerendert, wenn sie eingetragen sind.
 */

type ImpressumParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ImpressumParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Impressum' });

  return seitenMetadaten({ locale, href: '/impressum', titel: t('title') });
}

export default async function Impressum({ params }: ImpressumParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Impressum' });

  const platzhalter = (feld: BetreiberFeld) => t('platzhalter', { feld: t(`felder.${feld}`) });

  return (
    <section className="flex flex-col items-start gap-6 py-4 m-auto md:px-4">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {t('fictionalNotice')}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('anbieter.heading')}</h2>
        <Anschrift platzhalter={platzhalter} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('kontakt.heading')}</h2>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-gray-500 dark:text-gray-400">{t('felder.email')}:</dt>
            <dd>
              <Angabe feld="email" platzhalter={platzhalter} />
            </dd>
          </div>

          {(['telefon', 'ustIdNr'] as const)
            .filter((feld) => betreiberAngabe(feld) !== null)
            .map((feld) => (
              <div className="flex flex-wrap gap-x-2" key={feld}>
                <dt className="text-gray-500 dark:text-gray-400">{t(`felder.${feld}`)}:</dt>
                <dd>
                  <Angabe feld={feld} platzhalter={platzhalter} />
                </dd>
              </div>
            ))}
        </dl>
      </section>
    </section>
  );
}
