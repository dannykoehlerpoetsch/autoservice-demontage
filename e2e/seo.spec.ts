import { test, expect } from '@playwright/test';

/** How the run types the `playwright` fixture the request contexts come from. */
type PlaywrightApi = typeof import('playwright-core');

/**
 * The production page wants to be found. Checked is the whole chain of indexing: meta tag,
 * response header, robots.txt, sitemap, canonical and hreflang – and the other way round, that the
 * demo request confirmation view stays excluded.
 *
 * The run goes against the built production server and therefore without the host: preview
 * deployments at Vercel receive their own `X-Robots-Tag: noindex`, and this file does not check that
 * – it checks that the application itself does not lock anyone out.
 */

const PRODUCTION = 'https://autoservice-demontage.vercel.app';

/** The same route in both languages – German without a prefix, English with `/en` in front. */
const ROUTE_PAIRS: Array<[de: string, en: string]> = [
  ['/', '/en'],
  ['/impressum', '/en/impressum'],
  ['/datenschutz', '/en/datenschutz'],
  ['/termin-anfrage', '/en/termin-anfrage'],
];

const PUBLIC_PAGES = ROUTE_PAIRS.flat();

/** The one exception from indexing: only shows the demo request just placed. */
const EXCLUDED_PAGES = ['/termin-anfrage/bestaetigung', '/en/termin-anfrage/bestaetigung'];

/** The URL as it stands in canonical and in the HTML hreflang. */
function absoluteUrl(pathname: string): string {
  return pathname === '/' ? PRODUCTION : `${PRODUCTION}${pathname}`;
}

/** Compares URLs without the slash the sitemap appends to the root. */
function sameUrl(firstUrl: string, secondUrl: string): boolean {
  return firstUrl.replace(/\/$/, '') === secondUrl.replace(/\/$/, '');
}

/**
 * The hreflang references of a document – in HTML as a `<link>`, in the sitemap as an
 * `<xhtml:link>` with an empty tail, which is why both shapes are covered.
 */
function hreflangLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {};

  for (const [, hreflang, href] of html.matchAll(
    /<(?:xhtml:)?link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/>/gi
  )) {
    links[hreflang] = href;
  }

  return links;
}

/** Turns a served absolute URL into the local path – for requests against the build. */
function toPathname(url: string): string {
  return new URL(url).pathname;
}

/** The answers the specs need – read before the context is closed. */
type PageResponse = {
  status: () => number;
  headers: () => Record<string, string>;
  text: () => string;
};

/**
 * Request in its own context.
 *
 * The site's language cookie travels along through a shared request context: whoever calls `/en`
 * first is then served `/impressum` as the English page and ends up holding the canonical of the
 * wrong locale. A fresh context per request checks each locale on its own.
 */
async function fetchPage(playwrightApi: PlaywrightApi, pathname: string): Promise<PageResponse> {
  const baseUrl = test.info().project.use?.baseURL;

  if (!baseUrl) {
    throw new Error('the URL cannot be resolved without baseURL from playwright.config.ts');
  }

  const requestContext = await playwrightApi.request.newContext({ baseURL: baseUrl });

  try {
    const response = await requestContext.get(pathname);
    const text = await response.text();
    const header = response.headers();
    const status = response.status();

    return { status: () => status, headers: () => header, text: () => text };
  } finally {
    await requestContext.dispose();
  }
}

test.describe('Indexable production pages', () => {
  for (const pathname of PUBLIC_PAGES) {
    test(`hält ${pathname} für die Indexierung offen`, async ({ playwright }) => {
      const response = await fetchPage(playwright, pathname);

      expect(response.status()).toBe(200);
      const html = response.text();

      expect(html).toContain('name="robots" content="index, follow"');
      expect(html).not.toMatch(/name="(?:robots|googlebot)"[^>]*(?:noindex|nofollow)/i);
    });
  }

  test('sets no X-Robots-Tag that would block indexing', async ({ playwright }) => {
    for (const pathname of [...PUBLIC_PAGES, ...EXCLUDED_PAGES]) {
      const response = await fetchPage(playwright, pathname);
      const value = response.headers()['x-robots-tag'];

      // The application itself does not send this header (no `headers()` in next.config.js).
      // A bare `noindex` comes from Vercel's preview protection and is not a block of the page.
      expect(value === undefined || value === 'noindex', `${pathname}: ${value}`).toBe(true);
    }
  });

  for (const pathname of EXCLUDED_PAGES) {
    test(`hält ${pathname} getargett aus der Indexierung heraus`, async ({ playwright }) => {
      const response = await fetchPage(playwright, pathname);

      expect(response.status()).toBe(200);
      expect(response.text()).toContain('name="robots" content="noindex, nofollow"');
    });
  }
});

test.describe('robots.txt', () => {
  test('allows crawling and points at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');

    expect(response.status()).toBe(200);
    const text = await response.text();

    expect(text).toMatch(/allow:\s*\//i);
    expect(text).not.toMatch(/disallow:\s*\//i);
    expect(text).toContain(`Sitemap: ${PRODUCTION}/sitemap.xml`);
  });
});

test.describe('sitemap.xml', () => {
  test('lists exactly the indexable pages of both languages', async ({ playwright, request }) => {
    const text = await (await request.get('/sitemap.xml')).text();
    const locations = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);

    expect(locations.map((url) => url.replace(/\/$/, '')).sort()).toEqual(
      ROUTE_PAIRS.flatMap(([de, en]) => [absoluteUrl(de), absoluteUrl(en)]).sort()
    );

    // No entry leads to the confirmation view, and every one stays under the domain.
    expect(text).not.toMatch(/bestaetigung/i);

    for (const url of locations) {
      expect(() => new URL(url), url).not.toThrow();
      expect(new URL(url).origin, url).toBe(PRODUCTION);
      expect((await fetchPage(playwright, toPathname(url))).status(), url).toBe(200);
    }
  });

  test('points each entry at both language variants', async ({ playwright, request }) => {
    const text = await (await request.get('/sitemap.xml')).text();
    const entries = [...text.matchAll(/<loc>([^<]+)<\/loc>\n([\s\S]*?)<\/url>/g)];

    expect(entries).toHaveLength(ROUTE_PAIRS.length * 2);

    for (const [, loc, block] of entries) {
      const pair = ROUTE_PAIRS.find(
        ([de, en]) => sameUrl(loc, absoluteUrl(de)) || sameUrl(loc, absoluteUrl(en))
      );

      expect(pair, loc).toBeTruthy();

      const [de, en] = pair!;
      const languages = hreflangLinks(block);

      expect(Object.keys(languages).sort(), loc).toEqual(['de', 'en', 'x-default']);
      expect(sameUrl(languages.de ?? '', absoluteUrl(de)), `${loc} -> de`).toBe(true);
      expect(sameUrl(languages.en ?? '', absoluteUrl(en)), `${loc} -> en`).toBe(true);
      expect(sameUrl(languages['x-default'] ?? '', absoluteUrl(de)), `${loc} -> x-default`).toBe(
        true
      );

      for (const [language, href] of Object.entries(languages)) {
        expect(new URL(href).origin, `${language}: ${href}`).toBe(PRODUCTION);
        expect(
          (await fetchPage(playwright, toPathname(href))).status(),
          `${language}: ${href}`
        ).toBe(200);
      }
    }
  });
});

test.describe('Canonical and hreflang', () => {
  for (const [de, en] of ROUTE_PAIRS) {
    test(`zeigt für ${de} und ${en} auf je eigene Adresse`, async ({ playwright }) => {
      const erwartete: Array<[pfad: string, target: string]> = [
        [de, absoluteUrl(de)],
        [en, absoluteUrl(en)],
      ];

      for (const [pathname, target] of erwartete) {
        const html = (await fetchPage(playwright, pathname)).text();

        const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
        const ogUrl = html.match(/property="og:url" content="([^"]+)"/)?.[1];

        expect(canonical, `canonical missing on ${pathname}`).toBeTruthy();
        expect(ogUrl, `og:url missing on ${pathname}`).toBeTruthy();
        expect(sameUrl(canonical!, target), pathname).toBe(true);
        // Canonical and og:url point at the same URL – no locale mixed in.
        expect(sameUrl(ogUrl!, target), pathname).toBe(true);
      }
    });

    test(`references ${de} and ${en} through hreflang and back`, async ({ playwright }) => {
      for (const pathname of [de, en]) {
        const languages = hreflangLinks((await fetchPage(playwright, pathname)).text());

        expect(languages, `${pathname} without hreflang references`).not.toEqual({});
        expect(sameUrl(languages.de ?? '', absoluteUrl(de)), `${pathname} -> de`).toBe(true);
        expect(sameUrl(languages.en ?? '', absoluteUrl(en)), `${pathname} -> en`).toBe(true);
        expect(
          sameUrl(languages['x-default'] ?? '', absoluteUrl(de)),
          `${pathname} -> x-default`
        ).toBe(true);

        // Both references lead to routes that really exist.
        for (const href of Object.values(languages)) {
          expect((await fetchPage(playwright, toPathname(href))).status(), href).toBe(200);
        }
      }
    });
  }
});
// Both references lead to routes that really exist.
test.describe('Production URL in the metadata', () => {
  test('no longer names the old project URL on any delivered page', async ({ playwright }) => {
    for (const pathname of [...PUBLIC_PAGES, ...EXCLUDED_PAGES]) {
      const html = (await fetchPage(playwright, pathname)).text();

      expect(html.toLowerCase(), pathname).not.toContain('bennis');
    }
  });

  test('points the image at the new URL', async ({ playwright }) => {
    const html = (await fetchPage(playwright, '/')).text();

    const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];

    expect(ogImage).toBe(`${PRODUCTION}/Heroimage.png`);
  });
});

test.describe('No old deployment anymore', () => {
  test('the old Vercel URL no longer serves this project', async ({ request }) => {
    // The request deliberately goes against the old URL: it may no longer point at this
    // project. Foreign content on the free URL is indifferent – all that is checked is that
    // this project can no longer be reached there.
    const response = await request.get('https://bennis-garage.vercel.app').catch(() => null);

    if (!response) {
      // No DNS or TLS access during the run – the URL serves nothing.
      return;
    }

    const text = (await response.text()).toLowerCase();

    expect(text).not.toContain('autoservice demontage');
    expect(text).not.toContain('fiktive kfz-werkstatt');

    if (response.status() === 200) {
      // In case somebody else occupies the URL: our title may not come back.
      expect(text).not.toContain('portfolio-demo einer kfz-werkstatt');
    }
  });
});
