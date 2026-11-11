import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { SITE_URL } from './site';

/**
 * Metadata for a route, kept in one place so the production URL, canonical, hreflang and
 * indexing cannot be re-invented per page.
 *
 * Canonical and `og:url` deliberately follow the requested route (English with a leading `/en`),
 * not the homepage: a shared page should point at exactly the address it is.
 *
 * Hreflang: every route exists in both language variants, so they reference each other, with
 * `x-default` on the German one – the only variant served without a prefix.
 *
 * Each page returns its metadata in full rather than as a fragment: Next does not merge
 * `openGraph` and `twitter` field by field, so a partial object from a page would replace the
 * whole object coming from the layout.
 */
export async function createPageMetadata(props: {
  locale: string;
  href: string;
  title: string;
  /** Defaults to the site description from the `Metadata` namespace. */
  description?: string;
  /** Defaults to the site name from the `Metadata` namespace. */
  siteName?: string;
  /**
   * Defaults to indexable. Only pages that set this value opt out – so far the demo request
   * confirmation view, which shows nothing but the request just submitted and therefore has no
   * search content of its own.
   */
  indexable?: boolean;
}): Promise<Metadata> {
  const { locale, href, title } = props;
  const resolvedLocale: Locale = (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;
  const pathname = getPathname({ locale: resolvedLocale, href });
  // The same route in every served language variant – the basis of the hreflang alternates.
  const localePaths = Object.fromEntries(
    routing.locales.map((otherLocale) => [otherLocale, getPathname({ locale: otherLocale, href })])
  );
  const translate = await getTranslations({ locale: resolvedLocale, namespace: 'Metadata' });
  const description = props.description ?? translate('description');
  const siteName = props.siteName ?? translate('title');

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: pathname,
      languages: { ...localePaths, 'x-default': localePaths[routing.defaultLocale] },
    },
    openGraph: {
      title,
      description,
      url: pathname,
      siteName,
      images: [{ url: '/Heroimage.png' }],
      locale: resolvedLocale === 'de' ? 'de_DE' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/Heroimage.png'],
    },
    /*
     * Public pages are indexable; only pages that set `indexable: false` are blocked. There is no
     * global block any more – neither here nor as a header (the former `X-Robots-Tag: noindex,
     * nofollow` on every response is gone). Vercel keeps preview deployments out of the index on
     * its own by serving `X-Robots-Tag: noindex` there.
     */
    robots:
      props.indexable === false ? { index: false, follow: false } : { index: true, follow: true },
  };
}
