const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const NO_INDEX_HEADER = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 100],
  },
  experimental: {
    globalNotFound: true,
  },
  /**
   * Zweiter Träger der Nichtindexierung, neben dem `<meta name="robots">` der Metadaten.
   *
   * Der Header wirkt auch dort, wo Metadaten nicht ankommen: bei Weiterleitungen, bei
   * Auslieferungen über Caches und für Crawler, die nur Header auswerten. Die robots.txt
   * hält das Crawling bewusst frei, sonst könnte keine der beiden Anweisungen gelesen
   * werden – siehe `src/app/robots.ts`.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [NO_INDEX_HEADER],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
