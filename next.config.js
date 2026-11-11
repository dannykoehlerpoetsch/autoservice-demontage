const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * No own `headers()` configuration: the production page should stay indexable, and own rules would
 * only override Vercel's protection of preview deployments (`X-Robots-Tag: noindex` on every preview
 * response). Indexing is steered solely by the metadata delivery in `src/lib/metadata.ts`, crawling
 * by `src/app/robots.ts`.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 100],
  },
  experimental: {
    globalNotFound: true,
  },
};

module.exports = withNextIntl(nextConfig);
