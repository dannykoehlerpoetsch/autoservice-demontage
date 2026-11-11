/**
 * Public base URL – feeds `metadataBase` and therefore `og:url`, `og:image` and the Twitter images.
 * The site is publicly indexable (only the demo request confirmation view is not); this URL also
 * backs the canonical links, the hreflang alternates, the sitemap and the robots.txt reference.
 *
 * The production URL is a constant, not an environment value: it is known, and a missing variable
 * must not make a public page serve `localhost` or – as after the first rename – the old Vercel
 * host as `og:url`. `NEXT_PUBLIC_SITE_URL` overrides it for preview deployments and local builds.
 * It is a plain variable, not a secret: `NEXT_PUBLIC_*` is inlined into the client bundle.
 */
export const PRODUCTION_URL = 'https://autoservice-demontage.vercel.app';

/**
 * Base URL as read from the environment, normalised.
 *
 * Three real-world cases are corrected here: a missing or empty value (fall back to the
 * production URL), a value without a scheme (the GitHub Actions variable stores the bare host,
 * which would make `new URL()` throw and break a build that only assembles an address) and a
 * value carrying a path or trailing slash (only the origin is usable for `og:url` and canonical,
 * anything else would build canonical links with a duplicated path segment).
 *
 * Invalid input returns the production URL – never `localhost` or an old host.
 */
function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured) {
    return new URL(PRODUCTION_URL).origin;
  }

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return new URL(PRODUCTION_URL).origin;
  }
}

export const SITE_URL = resolveBaseUrl();

// Target of the demo notice: the portfolio site. A fixed external URL, not an environment value.
export const PORTFOLIO_URL = 'https://dakopo.vercel.app/';
