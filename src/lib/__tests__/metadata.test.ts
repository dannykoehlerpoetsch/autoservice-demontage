import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTranslator } from '@/test-utils';

/**
 * Every page produces metadata through `createPageMetadata`. Checked here is what must be guaranteed
 * while doing so: production URL in canonical and `og:url`, indexing as the rule and its exception,
 * hreflang for both languages, and that the locale follows the requested route – not blanketly the
 * homepage.
 *
 * The returned paths are relative; `metadataBase` turns them into the absolute URL. That the
 * delivery really serves such an absolute URL is checked by e2e/seo.spec.ts against the built HTML.
 */

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (options?: { locale?: string; namespace?: string }) => {
    const messages = (await import('../../../messages/de.json')).default;

    return makeTranslator(messages as Record<string, unknown>, options?.namespace ?? '');
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  // German is the locale without a prefix, English puts `/en` in front of the path – the homepage
  // without its own path part ends after `/en`. That is exactly how the real routing serves it.
  getPathname: vi.fn(({ locale, href }: { locale: string; href: string }) => {
    if (locale === 'de') {
      return href;
    }

    return href === '/' ? `/${locale}` : `/${locale}${href}`;
  }),
  Link: ({ children }: { children: unknown }) => children,
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

import { createPageMetadata } from '@/lib/metadata';
import { getPathname } from '@/i18n/navigation';
import { PRODUCTION_URL, SITE_URL } from '@/lib/site';
import messages from '../../../messages/de.json';

/** Builds the absolute URL from the relative path and the base URL – the way Next does it. */
function absolut(relativePath: unknown, baseUrl: unknown): string {
  if (typeof relativePath !== 'string' || typeof baseUrl !== 'string') {
    throw new Error(`no relative path given: ${String(relativePath)} / ${String(baseUrl)}`);
  }

  return new URL(relativePath, baseUrl).toString();
}

describe('createPageMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the same URL for the requested page in canonical and og:url', async () => {
    const metadata = await createPageMetadata({
      locale: 'de',
      href: '/impressum',
      title: 'Impressum',
    });
    const baseUrl = String(metadata.metadataBase).replace(/\/+$/, '');

    // The base carries the trailing slash as soon as Next turns it into a URL.
    expect(baseUrl).toBe(PRODUCTION_URL);
    expect(metadata.alternates?.canonical).toBe('/impressum');
    expect(absolut(metadata.alternates?.canonical, baseUrl)).toBe(`${PRODUCTION_URL}/impressum`);
    expect(absolut(metadata.openGraph?.url, baseUrl)).toBe(`${PRODUCTION_URL}/impressum`);
  });

  it('serves the English page under /en', async () => {
    const metadata = await createPageMetadata({
      locale: 'en',
      href: '/datenschutz',
      title: 'Privacy Policy',
    });

    expect(metadata.alternates?.canonical).toBe('/en/datenschutz');
    expect(metadata.openGraph?.locale).toBe('en_US');
  });

  it('falls back to the default locale for an unknown locale', async () => {
    const metadata = await createPageMetadata({
      locale: 'fr',
      href: '/impressum',
      title: 'Impressum',
    });

    expect(metadata.alternates?.canonical).toBe('/impressum');
    expect(metadata.openGraph?.locale).toBe('de_DE');
  });

  it('keeps every page without its own block open for indexing', async () => {
    const metadata = await createPageMetadata({ locale: 'de', href: '/', title: 'Start' });

    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it('excludes only the pages that set indexable: false', async () => {
    const metadata = await createPageMetadata({
      locale: 'de',
      href: '/termin-anfrage/bestaetigung',
      title: 'Anfrage eingegangen',
      indexable: false,
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('cross-references the language variants of the homepage', async () => {
    const metadata = await createPageMetadata({ locale: 'de', href: '/', title: 'Start' });

    // German without a prefix, English with `/en` in front; x-default follows the default locale.
    expect(metadata.alternates?.languages).toEqual({
      de: '/',
      en: '/en',
      'x-default': '/',
    });
  });

  it('lets the English page point at its own URL', async () => {
    const metadata = await createPageMetadata({
      locale: 'en',
      href: '/impressum',
      title: 'Imprint',
    });

    expect(metadata.alternates?.canonical).toBe('/en/impressum');
    expect(metadata.alternates?.languages).toEqual({
      de: '/impressum',
      en: '/en/impressum',
      'x-default': '/impressum',
    });
  });

  it('takes the description from the Metadata namespace when none is given', async () => {
    const withoutCustom = await createPageMetadata({ locale: 'de', href: '/', title: 'Start' });
    const withCustom = await createPageMetadata({
      locale: 'de',
      href: '/',
      title: 'Start',
      description: 'eigener Text',
    });

    expect(withoutCustom.description).toBe(messages.Metadata.description);
    expect(withCustom.description).toBe('eigener Text');
    expect(withCustom.openGraph?.description).toBe('eigener Text');
  });

  it('writes the website name into openGraph.siteName', async () => {
    const defaultMetadata = await createPageMetadata({ locale: 'de', href: '/', title: 'Start' });
    const eigen = await createPageMetadata({
      locale: 'de',
      href: '/',
      title: 'Start',
      siteName: 'anderer Name',
    });

    expect(defaultMetadata.openGraph?.siteName).toBe(messages.Metadata.title);
    expect(eigen.openGraph?.siteName).toBe('anderer Name');
  });

  it('appends the image to the base URL and not to localhost', async () => {
    const metadata = await createPageMetadata({ locale: 'de', href: '/', title: 'Start' });
    const image = (metadata.openGraph?.images as Array<{ url: string }>)[0];

    expect(image.url).toBe('/Heroimage.png');
    expect(absolut(image.url, SITE_URL)).toBe(`${SITE_URL}/Heroimage.png`);
    expect((metadata.twitter?.images as string[])[0]).toBe('/Heroimage.png');
    expect((metadata.twitter as unknown as { card: string }).card).toBe('summary_large_image');
  });

  it('builds the path through the routing delivery instead of page strings', async () => {
    await createPageMetadata({ locale: 'de', href: '/termin-anfrage', title: 'Terminanfrage' });

    expect(vi.mocked(getPathname)).toHaveBeenCalledWith({
      locale: 'de',
      href: '/termin-anfrage',
    });
  });
});
