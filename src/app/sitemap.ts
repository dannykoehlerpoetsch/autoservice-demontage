import type { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

/**
 * Sitemap of the public pages: every route in both language variants, each entry carrying the
 * references to the other variant – the same URLs that also appear as hreflang in the page head
 * (`createPageMetadata` in `src/lib/metadata.ts`).
 *
 * Entries are built through the routing rather than by pasting path pieces together: German needs
 * no prefix, English puts `/en` in front of the path. The references to the other language
 * variants are written as absolute URLs – a crawler cannot evaluate a sitemap whose hreflang
 * points at `/en`.
 *
 * The demo request confirmation view is deliberately missing – it is marked `noindex`.
 *
 * No `lastModified`: these contents carry no modification date that could honestly be reported,
 * and an invented timestamp would be worse than none.
 */
const ROUTES = ['/', '/impressum', '/datenschutz', '/termin-anfrage'];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.flatMap((href) => {
    // The same route in every served language variant, e.g. `/` and `/en/impressum`.
    const localePaths = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${SITE_URL}${getPathname({ locale, href })}`])
    );

    return routing.locales.map((locale) => ({
      url: localePaths[locale],
      alternates: {
        languages: { ...localePaths, 'x-default': localePaths[routing.defaultLocale] },
      },
    }));
  });
}
