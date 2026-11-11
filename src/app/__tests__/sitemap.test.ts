import { describe, it, expect, vi } from 'vitest';

/**
 * `next/navigation` cannot be resolved in the unit tests (see `metadata.test.ts`), which is why the
 * routing is rebuilt here: German without a prefix, English with `/en` in front of the path – the
 * homepage ends after `/en`. Which URLs are really served is checked by e2e/seo.spec.ts against the
 * built server.
 */
vi.mock('@/i18n/navigation', () => ({
  getPathname: vi.fn(({ locale, href }: { locale: string; href: string }) => {
    if (locale === 'de') {
      return href;
    }

    return href === '/' ? `/${locale}` : `/${locale}${href}`;
  }),
  Link: ({ children }: { children: unknown }) => children,
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  redirect: vi.fn(),
}));

import sitemap from '../sitemap';
import { SITE_URL } from '@/lib/site';

/**
 * The sitemap is the invitation to fetch: it may only name pages that really exist, that are public
 * and that should be indexed. The delivery as XML is checked by e2e/seo.spec.ts against the built
 * server.
 */

const ERWARTET = [
  `${SITE_URL}/`,
  `${SITE_URL}/en`,
  `${SITE_URL}/impressum`,
  `${SITE_URL}/en/impressum`,
  `${SITE_URL}/datenschutz`,
  `${SITE_URL}/en/datenschutz`,
  `${SITE_URL}/termin-anfrage`,
  `${SITE_URL}/en/termin-anfrage`,
];

describe('sitemap.xml', () => {
  const entries = sitemap();

  it('names every public page in both language variants', () => {
    expect(entries.map((entry) => entry.url)).toEqual(ERWARTET);
  });

  it('keeps every URL absolute under the production URL', () => {
    for (const { url } of entries) {
      expect(url.startsWith(`${SITE_URL}/`), url).toBe(true);
      expect(() => new URL(url), url).not.toThrow();
    }
  });

  it('does not list the demo request confirmation view', () => {
    expect(JSON.stringify(entries)).not.toMatch(/bestaetigung/i);
  });

  it('does not invent modification dates', () => {
    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
    }
  });

  it('points each entry at both language variants of the same page', () => {
    const locations = new Set(entries.map((entry) => entry.url));

    for (const entry of entries) {
      const languages = entry.alternates?.languages ?? {};

      expect(Object.keys(languages).sort()).toEqual(['de', 'en', 'x-default']);

      // Every hreflang reference must itself be a URL of the sitemap, and absolute at that.
      const references = Object.entries(languages).filter(
        (reference): reference is [string, string] => Boolean(reference[1])
      );

      for (const [language, value] of references) {
        expect(locations.has(value), `${language}: ${value}`).toBe(true);
      }
    }
  });
});
