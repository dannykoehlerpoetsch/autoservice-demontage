# Autoservice Demontage – Technical Documentation

Detailed technical documentation for the project. The short introduction, the live demo link and
the disclaimer live in the [root README](../README.md); this file covers how the code works and how
to verify it.

- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Internationalisation](#internationalisation)
- [The appointment demo flow](#the-appointment-demo-flow)
- [Testing](#testing)
- [CI/CD](#cicd)
- [SEO and indexability](#seo-and-indexability)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)

## Getting started

Requirements: Bun (or npm) and Node 20+ on the toolchain, plus a Chromium browser for the E2E run
(`bunx playwright install chromium` once).

```bash
bun install
bun run dev              # http://localhost:3000 – dev server with hot reload
bun run build            # production build into .next/
bun run start            # serve the built app (used by the E2E web server on port 3100)
```

Optional, for looking at the loading skeletons locally:

```bash
SLOW_CONTENT_MS=1500 bun run dev
```

`src/lib/debug-delay.ts` is a no-op when `SLOW_CONTENT_MS` is not set.

Environment variables: **none required**. The only one the app reads is
`NEXT_PUBLIC_SITE_URL`, which overrides the production URL for preview deployments and local
builds. It is a plain variable, not a secret (`NEXT_PUBLIC_*` is inlined into the client bundle),
and it may be written with or without the `https://` scheme – a missing or broken value falls back
to the constant in `src/lib/site.ts` instead of failing the build.

## Project structure

```
src/
  app/
    [locale]/                 locale segment: de without prefix, en under /en
      layout.tsx              html/body, fonts, theme script, BookingProvider, banner, header, footer
      page.tsx                homepage (hero, USP, services, demo flow)
      loading.tsx             Suspense boundary for a locale page
      not-found.tsx           locale 404
      error.tsx               locale error page (with translations)
      termin-anfrage/         appointment request page
        bestaetigung/         confirmation view – the only page with noindex
      impressum/page.tsx      legal notice (§ 5 para. 1 DDG)
      datenschutz/page.tsx    privacy policy
    global-error.tsx          emergency page without router and without next-intl
    global-not-found.tsx      404 without a locale
    robots.ts                 robots.txt (allows crawling, references the sitemap)
    sitemap.ts                sitemap.xml with hreflang alternates per entry
    __tests__/                robots and sitemap unit tests
  components/                 client and server components (header, services, form, calendar,
                              confirmation, email preview, legal building blocks, theme, skeleton)
    __tests__/                React Testing Library specs
  i18n/                       routing.ts, navigation.ts, request.ts, locale.ts
  lib/
    metadata.ts               createPageMetadata – canonical, hreflang, OG/Twitter, robots
    site.ts                   production URL, base URL resolution, portfolio URL
    services.ts               stable service ids and translated heading lookup
    dates.ts                  timezone-safe date helpers (Europe/Berlin as business timezone)
    theme-script.ts           inline theme script (no flash, no wrong colour scheme)
    legal/operator.ts         operator details – the only place real personal data would stand
    appointment/schema.ts     Zod schema, the single validation point
    appointment/email-preview.ts  pure text factory for the email preview
    __tests__/                unit tests per module
  test-utils.ts               matchMedia stub, real-message translator for tests
e2e/                          Playwright specs (see Testing)
messages/                     de.json and en.json – all user-visible texts
public/                       Headerlogo.png, Heroimage.png, icons
```

## Architecture

**Server first, client only where interaction needs it.** The homepage, the legal pages and the
metadata come from server components; `"use client"` appears on the header (mobile menu), the
service dialog, the form, the calendar, the theme toggle, the language switcher and the booking
provider.

**One state rail.** `src/components/BookingProvider.tsx` holds exactly two values in React state:
the service chosen in the detail dialog and the finished request. It sits in the locale layout, so
it survives client-side navigation, and it deliberately uses no storage, no cookie and no server –
a reload or a direct call of the confirmation page therefore shows the "state is gone" message
instead of pretending data came back.

**One validator.** `src/lib/appointment/schema.ts` is the only place that checks user input, and it
runs in the browser: `AppointmentForm` calls `parseAppointmentRequest` before anything is handed on,
and nothing crosses a network boundary afterwards. Error values are keys of `Appointment.errors.*`,
so the schema carries no message text and stays language-free. It also normalises input (NFC, line
breaks, invisible characters) and refuses markup characters before the data reaches the DOM.

**No sending at all.** There is no server action, no API route and no outgoing request. The email
preview is produced by `src/lib/appointment/email-preview.ts`, a pure function that returns strings;
`DemoEmailPreviewDialog` renders them as text (no `dangerouslySetInnerHTML`) and offers no send
button. An E2E test listens on every request and asserts that finishing sends nothing.

**Rendering and hydration agree on "today".** `todayIso()` computes the current day in the business
timezone (`Europe/Berlin`) and is used both while rendering and in the browser, so the calendar's
date window cannot differ between server HTML and hydration.

**Theme without a flash.** `src/lib/theme-script.ts` is injected inline before hydration and sets the
`dark` class from the stored value or the system preference; `ThemeInit` removes the script node after
mounting.

## Internationalisation

`next-intl` with two locales: `de` is served without a prefix, `en` under `/en`
(`src/i18n/routing.ts`). Route names are German because the URLs stay published
(`/termin-anfrage`, `/impressum`, `/datenschutz`); `getPathname()` maps them per locale, so no
component pastes locale prefixes together by hand.

`src/i18n/request.ts` loads `messages/<locale>.json` after `src/i18n/locale.ts` validated the
`[locale]` segment – a request for `/.well-known/change-password` would otherwise be turned into
`messages/.well-known.json` and throw during startup. The 404 decision itself still happens in
`layout.tsx` through `hasLocale`.

Keys of both files are checked for parity by `src/lib/__tests__/messages.test.ts`, including the
interpolation placeholders of every key, so a missing translation cannot slip in silently. The brand
name is identical in both languages and is never translated.

## The appointment demo flow

1. A service card opens `ServiceDetailDialog`; its CTA writes the service id into the
   `BookingProvider` and navigates to the appointment page.
2. `AppointmentForm` opens as a dialog (uncontrolled fields, `noValidate`), preselecting that
   service. The date arrives through `AppointmentDatePicker`, whose Radix popover is portalised
   while a `hidden` input carries the actual `YYYY-MM-DD` form value.
3. Submit runs the Zod schema. Empty required fields are reported through translated messages,
   optional fields stay silent, invalid contact data is only reported once filled in.
4. A valid request goes into the provider and the client routes to `/termin-anfrage/bestaetigung`,
   which summarises the request with the translated field names. The page carries `noindex` and is
   excluded from the sitemap.
5. "Email preview" opens `DemoEmailPreviewDialog`, showing sender, recipient, subject and body as
   they _would_ be – nothing is sent, no booking number is invented, and "new request" resets the
   state.

## Testing

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `bun run test`          | Vitest unit tests (`src/**/*.test.{ts,tsx}`) in jsdom          |
| `bun run test:watch`    | same, in watch mode                                            |
| `bun run test:coverage` | coverage with the thresholds from `vitest.config.ts`           |
| `bun run test:e2e`      | Playwright against a self-built production server on port 3100 |
| `bun run lint`          | ESLint over the whole repository                               |
| `bun run typecheck`     | `tsc --noEmit`                                                 |
| `bun run fmt:check`     | Prettier check (CI-enforced)                                   |

**Unit suite: 210 tests in 28 files, all passing.** They cover the schema (raw values, injection
attempts, date windows, E.164, single email address), the date helpers (local calendar rules, DST
and leap edges, business timezone), the email preview in both languages, the metadata factory
(canonical, hreflang, indexable default, opt-out), the sitemap and robots.txt, the operator
configuration, the booking provider, the form, the confirmation view, the theme toggle and the
initialisation script, the language switcher, the header geometry attributes, the legal pages in
jsdom and the error/404 pages. Tests that need translations read the real `messages/*.json`
(`src/test-utils.ts`), so nobody measures against an invented second text. Accessibility assertions
run through axe-core inside jsdom.

Coverage on the current tree: **88.04 % statements, 84.95 % branches, 89.86 % functions,
88.02 % lines**; the thresholds in `vitest.config.ts` sit just below that (87 / 84 / 89 / 87) and
are meant to be raised, never lowered to go green. Server pages contribute 0 % here on purpose –
they are verified in a real browser by the E2E specs.

**E2E suite: 83 tests in 9 specs, all passing (chromium).**

| Spec                      | Covers                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y.spec.ts`            | axe-core scans of both locales, service dialog, calendar popover, form, confirmation, language switch; failed rules are reported per node and the run fails on new violations |
| `header.spec.ts`          | real rendered logo ratio (2172×724 = 3:1), measured contrast on the brand surfaces in both colour schemes (>= 4.5:1), mobile menu behaviour                                   |
| `i18n.spec.ts`            | switching keeps the page and proves the switch through translated texts                                                                                                       |
| `legal.spec.ts`           | legal pages reachable from every page, placeholders vs entered operator values, no phone/map/contact links, no third-party claims, session cookie for the language            |
| `navigation.spec.ts`      | in-page anchors, section links from other pages, external portfolio link                                                                                                      |
| `responsive.spec.ts`      | 375 px and 1440 px: menu instead of link chain, no horizontal overflow, hero keeps its ratio                                                                                  |
| `seo.spec.ts`             | indexable pages, robots.txt, sitemap XML, canonical/og:url per locale, hreflang resolution, the excluded confirmation page, no old host                                       |
| `services-dialog.spec.ts` | one dialog per card, dialog geometry and scroll lock, CTA stores the service                                                                                                  |
| `termin-anfrage.spec.ts`  | the full demo flow in both languages, validation, network silence, reload behaviour, keyboard operability, dark mode                                                          |

## CI/CD

`.github/workflows/ci.yml` runs on pushes and pull requests against `main` and provides four jobs.
Their names are part of the GitHub rulesets (`protect-main`, `protect-main-branch`) that require all
four before merging, so they must not be renamed:

| Job                      | Step that decides                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `Lint, Typen & Format`   | `bun run lint`, `bun run typecheck`, `bun run fmt:check`                                                 |
| `Unit-Tests & Abdeckung` | `bun run test:coverage`, plus the coverage summary written into the run output and the coverage artefact |
| `Production Build`       | `bun run build` and the `.next` artefact                                                                 |
| `E2E & Barrierefreiheit` | `bun run test:e2e` after `Production Build`, with the Playwright HTML report as an artefact              |

Vercel watches the same repository separately, so a successful pipeline can still be followed by a
deployment failure – the two do not block each other.

## SEO and indexability

The site is public and indexable:

- `src/lib/metadata.ts` returns the complete metadata per page (Next does not merge `openGraph` or
  `twitter` field by field). Public pages get `{ index: true, follow: true }`; only the demo request
  confirmation view sets `indexable: false` and therefore receives `noindex, nofollow`.
- Canonical and `og:url` follow the requested route, so the English variant keeps its `/en`.
- Every page emits hreflang links for `de`, `en` and `x-default` (German, the variant without a
  prefix).
- `src/app/robots.ts` allows crawling for everyone – a crawler that cannot read a page cannot read
  its `noindex` either – and references the sitemap.
- `src/app/sitemap.ts` lists the eight indexable URLs (four routes in two languages) with absolute
  hreflang alternates and deliberately **no** `lastModified`: these contents carry no modification
  date that could be reported honestly.
- There is no application-level `X-Robots-Tag` any more; the former global `noindex, nofollow`
  header rule was removed from `next.config.js` so that Vercel's own preview protection
  (`X-Robots-Tag: noindex` on preview deployments) is not overridden.

`e2e/seo.spec.ts` checks the chain on the built server: indexable pages contain no `noindex`, the
application sends no blocking header, the confirmation page does, robots.txt allows crawling and
names the sitemap, the sitemap is valid XML containing only indexable URLs whose hreflang targets
answer with 200, and canonical equals `og:url` per locale. Lighthouse reports 100/100 for SEO on `/`
and `/en` when measured against a production build whose `NEXT_PUBLIC_SITE_URL` matches the audited
origin.

## Deployment

- Host: Vercel, production branch `main`, production URL
  `https://autoservice-demontage.vercel.app` (the project was renamed from `bennis-garage`; nothing
  on the site references the old host any more).
- `PRODUCTION_URL` in `src/lib/site.ts` is a constant, so a deployment without environment values
  still emits correct canonical, Open Graph and sitemap URLs.
- `NEXT_PUBLIC_SITE_URL` exists as a GitHub Actions variable and may exist as a Vercel _config_
  variable for previews; if it is set for production it must read
  `autoservice-demontage.vercel.app`, otherwise it should stay unset.
- Preview deployments keep their `X-Robots-Tag: noindex` from Vercel itself.
- No secrets are needed: the demo sends no email and calls no third-party API.

## Known limitations

- **Only two routes plus two legal pages exist.** There is no blog, no booking backend and no
  content management; that is the scope of the portfolio demo.
- **The demo sends nothing.** Requests live in memory only, so a reload loses them by design.
- **Legal pages depend on the operator configuration.** `src/lib/legal/operator.ts` is meant for
  personal data of the person publishing the repository; empty fields render as explicit
  placeholders, which is intentional for a public repository and would have to be filled before a
  real launch.
- **Server pages are not covered by unit-test coverage** (they are covered by the E2E specs).
- **E2E runs on chromium only**, the only browser configured in `playwright.config.ts`.
- **Deployment lags the code.** As of the current tree, the code and the tests are in good shape,
  but the running production deployment still has to be redeployed from `main` to pick up the
  indexing change, the sitemap and the corrected metadata host. Until that happens the live site
  shows the previous behaviour; see the notes in the deployment section.
