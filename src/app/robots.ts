import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * robots.txt: crawling is allowed for everyone, otherwise no crawler could read the `noindex`
 * directive that individual pages set for themselves (see `createPageMetadata` in
 * `src/lib/metadata.ts`).
 *
 * This application no longer sends its own header block – the former `X-Robots-Tag: noindex,
 * nofollow` rule on every response is gone. Vercel keeps preview deployments out of the index by
 * setting `X-Robots-Tag: noindex` on that host itself.
 *
 * The sitemap (see `src/app/sitemap.ts`) lists the pages meant for search; the demo request
 * confirmation view is missing there because it is not indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
