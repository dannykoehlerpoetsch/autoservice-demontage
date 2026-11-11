import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTranslator } from '@/test-utils';

/**
 * Metadaten erzeugt jede Seite über `seitenMetadaten`. Geprüft wird hier, was dabei garantiert
 * sein muss: Produktionsadresse in Canonical und `og:url`, Nichtindexierung, und dass die Locale
 * der aufgerufenen Route folgt – nicht pauschal der Startseite.
 *
 * Die zurückgegebenen Wege sind relativ; `metadataBase` macht daraus die absolute Adresse. Dass
 * die Auslieferung genau so eine absolute Adresse liefert, prüft e2e/seo.spec.ts am gebauten
 * HTML.
 */

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (options?: { locale?: string; namespace?: string }) => {
    const messages = (await import('../../../messages/de.json')).default;

    return makeTranslator(messages as Record<string, unknown>, options?.namespace ?? '');
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  // Deutsch ist die Locale ohne Präfix, Englisch trägt `/en` vor den Pfad – wie in der echten
  // Auslieferung. `getPathname` selbst wird unten aufgerufen und mitgeprüft.
  getPathname: vi.fn(({ locale, href }: { locale: string; href: string }) =>
    locale === 'de' ? href : `/${locale}${href}`
  ),
  Link: ({ children }: { children: unknown }) => children,
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

import { seitenMetadaten } from '@/lib/metadata';
import { getPathname } from '@/i18n/navigation';
import { PRODUKTIONS_URL, SITE_URL } from '@/lib/site';
import messages from '../../../messages/de.json';

/** Aus dem relativen Weg und der Basisadresse die absolute Adresse bauen – wie Next es tut. */
function absolut(weg: unknown, basis: unknown): string {
  if (typeof weg !== 'string' || typeof basis !== 'string') {
    throw new Error(`kein relativer Weg übergeben: ${String(weg)} / ${String(basis)}`);
  }

  return new URL(weg, basis).toString();
}

describe('seitenMetadaten', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt in Canonical und og:url dieselbe Adresse der aufgerufenen Seite', async () => {
    const metadaten = await seitenMetadaten({
      locale: 'de',
      href: '/impressum',
      titel: 'Impressum',
    });
    const basis = String(metadaten.metadataBase).replace(/\/+$/, '');

    // Die Basis trägt den Schrägstrich am Ende, sobald Next sie in eine URL übersetzt.
    expect(basis).toBe(PRODUKTIONS_URL);
    expect(metadaten.alternates?.canonical).toBe('/impressum');
    expect(absolut(metadaten.alternates?.canonical, basis)).toBe(`${PRODUKTIONS_URL}/impressum`);
    expect(absolut(metadaten.openGraph?.url, basis)).toBe(`${PRODUKTIONS_URL}/impressum`);
  });

  it('stellt die englische Seite unter /en aus', async () => {
    const metadaten = await seitenMetadaten({
      locale: 'en',
      href: '/datenschutz',
      titel: 'Privacy Policy',
    });

    expect(metadaten.alternates?.canonical).toBe('/en/datenschutz');
    expect(metadaten.openGraph?.locale).toBe('en_US');
  });

  it('fällt bei einer unbekannten Locale auf die Standardsprache zurück', async () => {
    const metadaten = await seitenMetadaten({
      locale: 'fr',
      href: '/impressum',
      titel: 'Impressum',
    });

    expect(metadaten.alternates?.canonical).toBe('/impressum');
    expect(metadaten.openGraph?.locale).toBe('de_DE');
  });

  it('hält die Seite aus allen drei Gründen aus der Indexierung', async () => {
    const metadaten = await seitenMetadaten({ locale: 'de', href: '/', titel: 'Start' });

    expect(metadaten.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    });
  });

  it('nimmt die Beschreibung aus dem Namespace Metadata, wenn keine eigene gegeben ist', async () => {
    const ohneEigene = await seitenMetadaten({ locale: 'de', href: '/', titel: 'Start' });
    const mitEigene = await seitenMetadaten({
      locale: 'de',
      href: '/',
      titel: 'Start',
      beschreibung: 'eigener Text',
    });

    expect(ohneEigene.description).toBe(messages.Metadata.description);
    expect(mitEigene.description).toBe('eigener Text');
    expect(mitEigene.openGraph?.description).toBe('eigener Text');
  });

  it('trägt den Website-Namen in openGraph.siteName ein', async () => {
    const standard = await seitenMetadaten({ locale: 'de', href: '/', titel: 'Start' });
    const eigen = await seitenMetadaten({
      locale: 'de',
      href: '/',
      titel: 'Start',
      siteName: 'anderer Name',
    });

    expect(standard.openGraph?.siteName).toBe(messages.Metadata.title);
    expect(eigen.openGraph?.siteName).toBe('anderer Name');
  });

  it('hängt das Bild an die Basisadresse und nicht an localhost', async () => {
    const metadaten = await seitenMetadaten({ locale: 'de', href: '/', titel: 'Start' });
    const bild = (metadaten.openGraph?.images as Array<{ url: string }>)[0];

    expect(bild.url).toBe('/Heroimage.png');
    expect(absolut(bild.url, SITE_URL)).toBe(`${SITE_URL}/Heroimage.png`);
    expect((metadaten.twitter?.images as string[])[0]).toBe('/Heroimage.png');
    expect((metadaten.twitter as unknown as { card: string }).card).toBe('summary_large_image');
  });

  it('baut den Weg über die Routing-Auslieferung und nicht über Seitenstringe', async () => {
    await seitenMetadaten({ locale: 'de', href: '/termin-anfrage', titel: 'Terminanfrage' });

    expect(vi.mocked(getPathname)).toHaveBeenCalledWith({
      locale: 'de',
      href: '/termin-anfrage',
    });
  });
});
