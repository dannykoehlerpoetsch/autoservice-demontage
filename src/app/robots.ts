import type { MetadataRoute } from 'next';

/**
 * robots.txt für eine Seite, die nicht indexiert werden soll.
 *
 * Ein Crawling-Verbot wäre hier der falsche Weg: Google kann eine `noindex`-Anweisung nur
 * berücksichtigen, wenn die Seite dafür abrufbar ist. Wer `Disallow: /` schreibt und
 * trotzdem `noindex` sendet, erreicht am Ende eher die Indexierung als weniger – die
 * Anweisung wird nie gelesen.
 *
 * Die Nichtindexierung steht deshalb an zwei Stellen, die ein Crawling nicht blockieren:
 * im `<meta name="robots">` der Metadaten (`layout.tsx`) und als `X-Robots-Tag` im Response-
 * Header (siehe `next.config.js`). Eine Sitemap wird bewusst nicht ausgeliefert und nicht
 * referenziert: Diese Portfolio-Seite soll nicht gefunden werden.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
  };
}
