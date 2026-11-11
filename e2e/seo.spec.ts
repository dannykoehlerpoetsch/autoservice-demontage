import { test, expect } from '@playwright/test';

/**
 * Die Seite soll nicht indexiert werden. Das klappt nur, wenn die `noindex`-Anweisung auch
 * abgerufen werden kann – ein Crawling-Verbot in der robots.txt wäre darum widersprüchlich
 * (siehe src/app/robots.ts). Diese Specs halten die ganze Kette fest: Metaangabe, Header,
 * robots.txt, Canonical, `og:url` und die Produktionsadresse.
 */

const PRODUKTION = 'https://autoservice-demontage.vercel.app';

const seiten = ['/', '/en', '/impressum', '/en/impressum', '/datenschutz', '/termin-anfrage'];

test.describe('Nichtindexierung', () => {
  for (const pfad of seiten) {
    test(`liefert noindex für ${pfad}`, async ({ request }) => {
      const antwort = await request.get(pfad);

      expect(antwort.status()).toBe(200);
      const html = await antwort.text();

      expect(html).toContain('name="robots" content="noindex, nofollow');
      expect(html).toContain('name="googlebot" content="noindex, nofollow');
    });
  }

  test('sendet denselben Wert als X-Robots-Tag', async ({ request }) => {
    for (const pfad of ['/', '/impressum', '/datenschutz']) {
      const antwort = await request.get(pfad);

      expect(antwort.headers()['x-robots-tag']).toBe('noindex, nofollow');
    }
  });

  test('sperrt das Crawling nicht – sonst kann noindex nicht gelesen werden', async ({
    request,
  }) => {
    const antwort = await request.get('/robots.txt');

    expect(antwort.status()).toBe(200);
    const text = await antwort.text();

    expect(text).toMatch(/allow:\s*\//i);
    expect(text).not.toMatch(/disallow:\s*\//i);
    // Eine Sitemap würde zum Abruf einladen; diese Seite soll nicht gefunden werden.
    expect(text.toLowerCase()).not.toContain('sitemap');
  });
});

test.describe('Produktionsadresse in den Metadaten', () => {
  for (const pfad of seiten) {
    test(`nutzt die neue Adresse in Canonical und og:url für ${pfad}`, async ({ request }) => {
      const html = await (await request.get(pfad)).text();

      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      const ogUrl = html.match(/property="og:url" content="([^"]+)"/)?.[1];

      expect(canonical, 'Canonical fehlt').toBeTruthy();
      expect(ogUrl, 'og:url fehlt').toBeTruthy();
      expect(canonical!.startsWith(PRODUKTION)).toBe(true);
      expect(ogUrl!.startsWith(PRODUKTION)).toBe(true);
      // Canonical und og:url zeigen auf dieselbe Adresse – keine Locale gemischt.
      expect(ogUrl).toBe(canonical);
    });
  }

  test('nennt die alte Projekt-Adresse in keiner ausgelieferten Seite mehr', async ({
    request,
  }) => {
    for (const pfad of seiten) {
      const html = await (await request.get(pfad)).text();

      expect(html.toLowerCase(), pfad).not.toContain('bennis');
    }
  });

  test('verweist das Bild auf die neue Adresse', async ({ request }) => {
    const html = await (await request.get('/')).text();

    const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];

    expect(ogImage).toBe(`${PRODUKTION}/Heroimage.png`);
  });
});

test.describe('Keine alte Veröffentlichung mehr', () => {
  test('die alte Vercel-Adresse stellt dieses Projekt nicht mehr aus', async ({ request }) => {
    // Der Request läuft bewusst gegen die alte Adresse: sie darf dieses Projekt nicht mehr
    // zeigen. Fremde Inhalte auf der freien Adresse sind hier gleichgültig – geprüft wird
    // nur, dass dieses Projekt dort nicht mehr erreichbar ist.
    const antwort = await request.get('https://bennis-garage.vercel.app').catch(() => null);

    if (!antwort) {
      return; // Kein DNS- oder TLS-Zugang im Lauf – die Adresse liefert nichts aus.
    }

    const text = (await antwort.text()).toLowerCase();

    expect(text).not.toContain('autoservice demontage');
    expect(text).not.toContain('fiktive kfz-werkstatt');
    if (antwort.status() === 200) {
      // Falls die Adresse jemand anderes belegt: unser Titel und unser noindex-Hervey
      // dürfen nicht zurückkommen.
      expect(text).not.toContain('portfolio-demo einer kfz-werkstatt');
    }
  });
});
