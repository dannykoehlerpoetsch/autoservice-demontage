import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { SITE_URL } from './site';

/**
 * Metadaten einer Route – an einer Stelle, damit Produktionsadresse, Canonical und die
 * Nichtindexierung nicht je Seite neu erfunden werden können.
 *
 * Canonical und `og:url` folgen bewusst der aufgerufenen Route (auf Englisch mit `/en`
 * davor), nicht der Startseite: eine geteilte Seite soll auf genau die Adresse zeigen, die
 * sie selbst ist.
 *
 * Die Metadaten werden je Seite vollständig zurückgegeben, nicht als Fragment – Next führt
 * `openGraph` und `twitter` nicht Feld für Feld zusammen, ein Teilobjekt aus einer Seite
 * würde das komplette Objekt aus dem Layout ersetzen.
 */
export async function seitenMetadaten(props: {
  locale: string;
  href: string;
  titel: string;
  /** Standard: die Beschreibung der Website aus dem Namespace `Metadata`. */
  beschreibung?: string;
  /** Standard: der Name der Website aus dem Namespace `Metadata`. */
  siteName?: string;
}): Promise<Metadata> {
  const { locale, href, titel } = props;
  const eigeneLocale: Locale = (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;
  const pfad = getPathname({ locale: eigeneLocale, href });
  const m = await getTranslations({ locale: eigeneLocale, namespace: 'Metadata' });
  const beschreibung = props.beschreibung ?? m('description');
  const siteName = props.siteName ?? m('title');

  return {
    metadataBase: new URL(SITE_URL),
    title: titel,
    description: beschreibung,
    alternates: { canonical: pfad },
    openGraph: {
      title: titel,
      description: beschreibung,
      url: pfad,
      siteName: siteName,
      images: [{ url: '/Heroimage.png' }],
      locale: eigeneLocale === 'de' ? 'de_DE' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: titel,
      description: beschreibung,
      images: ['/Heroimage.png'],
    },
    /*
     * Keine Indexierung, aber ohne Crawling-Sperre: damit ein Crawler `noindex` überhaupt
     * lesen kann, bleibt die robots.txt frei (siehe src/app/robots.ts). Derselbe Wert steht
     * zusätzlich als X-Robots-Tag auf jeder Antwort (siehe next.config.js).
     */
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}
