import { describe, it, expect } from 'vitest';
import robots from '../robots';

/**
 * Die robots.txt ist der Gegenbeweis zur Nichtindexierung: Sie darf das Crawling nicht sperren,
 * sonst sieht ein Crawler `noindex` nie. Geprüft wird die Auslieferung selbst – die ausgelieferten
 * Header und Metaangaben prüft e2e/seo.spec.ts.
 */

describe('robots.txt', () => {
  it('erlaubt allen das Crawling der ganzen Seite', () => {
    expect(robots().rules).toEqual([{ userAgent: '*', allow: '/' }]);
  });

  it('enthält kein Disallow auf alles', () => {
    const regeln = robots().rules as Array<{ disallow?: string | string[] }>;
    const ausgeschlosseneRegeln = regeln.filter((regel) => {
      const wert = regel.disallow;
      const liste = Array.isArray(wert) ? wert : [wert];

      return liste.includes('/');
    });

    expect(ausgeschlosseneRegeln).toHaveLength(0);
  });

  it('verweist auf keine Sitemap – die Seite soll nicht gefunden werden', () => {
    expect(JSON.stringify(robots())).not.toMatch(/sitemap/i);
  });
});
