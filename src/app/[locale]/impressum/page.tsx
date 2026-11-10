import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';

function Lines({ lines }: { lines: string[] }) {
  return (
    <p className="leading-relaxed">
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </p>
  );
}

export default async function Impressum() {
  const t = await getTranslations('Impressum');

  return (
    <section className="flex flex-col items-start md:px-4 py-4 m-auto">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>

      <p className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 text-sm leading-relaxed">
        {t('disclaimer')}
      </p>

      {/*
       * Die Platzhalter unten sind keine Angaben, sondern Lücken: wer diese Seite
       * veröffentlicht, muss sie durch die echten Betreiberangaben ersetzen. Der Hinweis
       * bleibt im Text, damit niemand die eckigen Klammern für Daten hält.
       */}
      <p className="mb-6 p-4 rounded-lg border border-gray-200 text-sm leading-relaxed dark:border-gray-700">
        {t('placeholderNote')}
      </p>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-1">{t('address.heading')}</h2>
        <Lines lines={t.raw('address.lines') as string[]} />
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-1">{t('contact.heading')}</h2>
        <Lines lines={t.raw('contact.lines') as string[]} />
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-1">{t('vat.heading')}</h2>
        <Lines lines={t.raw('vat.lines') as string[]} />
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-1">{t('profession.heading')}</h2>
        <Lines lines={t.raw('profession.lines') as string[]} />
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-1">{t('dispute.heading')}</h2>
        <Lines lines={t.raw('dispute.lines') as string[]} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-1">{t('liability.heading')}</h2>
        <Lines lines={t.raw('liability.lines') as string[]} />
      </section>
    </section>
  );
}
