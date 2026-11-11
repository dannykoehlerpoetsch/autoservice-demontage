import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { toLocale } from '@/i18n/locale';
import { seitenMetadaten } from '@/lib/metadata';
import { type BetreiberFeld } from '@/lib/legal/operator';
import { Angabe, Anschrift } from '@/components/LegalAngabe';

/**
 * Datenschutzerklärung dieser Seite. Sie beschreibt ausschließlich, was diese Website tatsächlich
 * tut: ausgeliefert von Vercel, zwei Dinge im Browser gespeichert (Sprache und Farbschema), ein
 * Anfrageformular ohne jede Übertragung. Verantwortliche Person, Rechte und Rechtsgrundlagen
 * sind genannt; was nur die betreibende Person klären kann, steht bewusst nicht auf dieser Seite.
 */

type DatenschutzParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: DatenschutzParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Datenschutz' });

  return seitenMetadaten({ locale, href: '/datenschutz', titel: t('title') });
}

export default async function Datenschutz({ params }: DatenschutzParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Datenschutz' });

  const feldNamen: Partial<Record<BetreiberFeld, string>> = {
    name: t('felder.name'),
    strasse: t('felder.strasse'),
    ort: t('felder.ort'),
    email: t('felder.email'),
  };
  const platzhalter = (feld: BetreiberFeld) => t('platzhalter', { feld: feldNamen[feld] ?? feld });

  return (
    <section className="flex flex-col items-start gap-6 py-4 m-auto md:px-4">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('verantwortlich.heading')}</h2>
        <p className="text-sm leading-relaxed">{t('verantwortlich.text')}</p>
        <Anschrift platzhalter={platzhalter} />
        <div className="flex flex-wrap gap-x-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t('felder.email')}:</span>
          <Angabe feld="email" platzhalter={platzhalter} />
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
