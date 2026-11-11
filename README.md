# Autoservice Demontage

> Portfolio/demo project. The repair shop shown here is fictional — “Autoservice Demontage” is
> an invented brand that nobody operates; the project exists solely to demonstrate frontend
> development skills. A permanent notice above the header says so in words and links to the
> portfolio (<https://dakopo.vercel.app>), and the footer is copyrighted to DaKoPo.
>
> **Nothing invented anywhere on the site.** The workshop is a fiction, so it gets no address, no
> phone number and no owner. The legal pages carry only the details of the person who publishes
> this repository — name, address and email address, entered by hand in one file. A value that is
> missing renders as an unmistakable placeholder and nothing else stands out. Every open legal
> point lives in **[docs/LEGAL_SETUP.md](docs/LEGAL_SETUP.md)**, never on the pages.
>
> **Live:** <https://autoservice-demontage.vercel.app> — German at the root, English under `/en`.
> `main` deploys through Vercel; every pull request gets its own preview URL. The old
> `bennis-garage.vercel.app` address no longer serves this project (Vercel answers
> `404 DEPLOYMENT_NOT_FOUND`).
>
> **Not indexed:** `noindex, nofollow` travels in the metadata of every page *and* as an
> `X-Robots-Tag` response header, while `robots.txt` still allows crawling — a crawler can only
> honour `noindex` if it is allowed to read the page.

## Quality in numbers

| Aspect | Status of this branch |
| --- | --- |
| Unit tests | 195 in 26 files (Vitest + React Testing Library) |
| Browser scenarios | 75 — functional flows, axe-core on eleven views, responsive layout checks (no screenshot baselines) |
| Pipeline | four stages, ~90 s wall to wall, `main` protected by an active ruleset |
| Coverage | 87.52 % statements · 84.54 % branches · 89.43 % functions · 87.50 % lines, floor enforced in CI |
| Accessibility | axe on eleven pages/views with **no exceptions at all**, plus measured contrast specs |
| Legal pages | Impressum (§ 5 DDG) and privacy policy — as short as the site needs them, operator's details entered by hand |
| Deployment | Vercel: production on merge, preview per pull request |

## What the demo shows

- a “How the demo works” section that explains the frontend-only request flow in four steps
- service cards with an accessible Radix detail dialog per service
- service preselection carried into the form across the navigation
- an interactive appointment form with Zod validation and a react-day-picker calendar
- a summary view of the completed request, including a personalized email preview
- an Impressum built on § 5 DDG and a privacy policy written against what this code actually does
- German and English, dark and light mode, responsive from 360 px up
- keyboard operation, focus management and axe-core checks as part of the pipeline
- brand colour used where it passes WCAG AA — measured in the browser, not estimated
- one CI pipeline: lint, types, format, unit tests with coverage, production build, E2E,
  accessibility and responsive layout

Every string in that flow says what it is: a portfolio demo. Nothing is booked, nothing is sent.

## Technologies

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI-Primitives:** Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-popover`; accessible service detail dialog and date-picker popover)
- **i18n:** next-intl (German/English, locale-aware routing)
- **Validation:** Zod (one schema, used client-side by the appointment form)
- **Package Manager:** Bun
- **Linting:** ESLint 9 (Flat Config)
- **Formatting:** Prettier
- **Unit Testing:** Vitest + React Testing Library
- **E2E Testing:** Playwright
- **Accessibility Testing:** axe-core (`@axe-core/playwright`) inside the E2E run
- **CI:** GitHub Actions (lint, typecheck, format check, unit tests + coverage, production build, E2E, axe, responsive checks)

## Getting Started

### Install Bun

Bun needs to be installed once:

```bash
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

### Install Dependencies

```bash
bun install
```

### Start Development Server

```bash
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Script                        | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| `bun run dev`                 | Start the development server                                         |
| `bun run build`               | Create production build                                              |
| `bun run start`               | Start production server                                               |
| `bun run lint`                | Run ESLint                                                            |
| `bun run typecheck`           | Type-check the whole project (`tsc --noEmit`)                         |
| `bun run fmt`                 | Format code                                                           |
| `bun run fmt:check`           | Check code formatting                                                  |
| `bun run test`                | Run unit tests (Vitest)                                                |
| `bun run test:watch`          | Run unit tests in watch mode                                           |
| `bun run test:coverage`       | Run unit tests and fail below the coverage thresholds                  |
| `bun run test:e2e`            | Run all E2E tests (Playwright; builds & serves the app if needed)       |

## Project Structure

```
src/
  app/
    [locale]/         # Localized routes: layout, home, impressum, datenschutz, termin-anfrage
      impressum/      # § 5 DDG legal notice, built from the operator config
      datenschutz/    # Privacy policy written against this implementation
      termin-anfrage/ # Demo request form + summary (force-dynamic: the calendar needs “today”)
    global-error.tsx  # Error boundary outside the locale layout
    global-not-found.tsx  # 404 for paths without a locale
    robots.ts         # robots.txt — crawling allowed on purpose, indexing is off (see below)
  components/         # UI components (form, dialogs, footer, legal building blocks)
    __tests__/        # Specs for those components (jsdom)
  i18n/               # next-intl routing, navigation & request config
  lib/
    appointment/      # Appointment flow: Zod schema and the pure email-preview builder
    legal/            # operator.ts — the one file with the operator’s personal data
    __tests__/        # Date helpers, schema rules, email preview, metadata, legal report
    dates.ts          # Time-zone-safe calendar-date helpers
    metadata.ts       # One metadata factory: production URL, canonical, robots, OG images
    services.ts       # Stable service IDs shared by dialog, form and validation
    site.ts           # The production URL and the portfolio URL, in one place
messages/
  de.json, en.json    # Translated content, per locale
docs/
  LEGAL_SETUP.md      # Which legal details are missing and what only a human can decide
e2e/
  *.spec.ts           # Playwright: navigation, i18n, dialog, form, legal, SEO, header, responsive, axe
.github/workflows/ci.yml      # The four pipeline stages described below
playwright.config.ts          # Build & serve for the browser run, reporters, browser and viewport
vitest.config.ts              # Coverage scope, thresholds, reporters
```

## Internationalization

The site is available in German (default, no URL prefix) and English (`/en`), powered by
[next-intl](https://next-intl.dev). All page and UI copy lives in `messages/de.json` and
`messages/en.json`.

Language is chosen from the URL; when the delivered language is not the language the browser asked
for — in practice after using the language dropdown in the header or footer — next-intl also stores
it in a `NEXT_LOCALE` cookie, so the next request arrives in the chosen language. The cookie holds
nothing but `de` or `en`, has no expiry (session cookie), is scoped to the whole site and is sent
with `SameSite=Lax`. The privacy policy describes exactly that.

## Appointment request demo

The CTA in the service detail dialog stores the selected service and opens `/termin-anfrage`
(`BookingProvider` carries the selection across the navigation, the form preselects it). The form
collects a name, an optional phone number and email address, the requested service, a desired date
and optional notes; completing it switches to `/termin-anfrage/bestaetigung`, which summarises every
value and offers an **email preview** — the text a confirmation email would have carried. Both views
are localized and reachable in German and English.

**The request never leaves the browser. This is a deliberate architecture decision, not a stub.**
There is

- no real appointment booking,
- no email delivery, no email server, no SMTP or provider integration,
- no backend storage of appointment requests,
- no API route and no server action that receives the form values.

The form is validated client-side and the values live in React state for as long as the tab lives.

The homepage section **How the demo works** (`#demo`, `src/components/DemoFlow.tsx`) spells this same
flow out for visitors in four steps and took over the place of the old “Anfahrt” section: a fictional
workshop has no address to travel to, so `Map.tsx`, its consent gating, the directions link and the
header entry for directions were removed together with it. The header now navigates Start ·
Leistungen · Demo-Ablauf (`/#demo`).

**State architecture.** `BookingProvider` (`src/components/BookingProvider.tsx`) hangs in the locale
layout and holds exactly two values: `serviceId` (the preselection from the dialog) and `request`
(the completed request that the confirmation view renders). React context plus React state — no
state-management library for two values, no `localStorage`, no `sessionStorage`, no cookie, no
request data in the URL and nothing on the server. Client-side navigation between the two routes
keeps the state; a full reload drops it. That is intentional: the confirmation view then shows a
translated notice that the request is gone and links back to the form, instead of pretending that
something was restored.

**Validation.** One Zod schema (`src/lib/appointment/schema.ts`) is the single source of rules, and
the form is its only caller — nothing validates the same field twice:

- name, service and date are required; email, phone number and notes are optional
- an optional field that stays empty produces no error, but whatever is typed in still has to pass
- name: 2–60 characters, letters (incl. umlauts and accented Latin), spaces, `., -` and apostrophes
- phone: 6–15 digits with an optional leading `+` and the usual separators
- email: a single address, RFC-shaped
- service: one of the stable IDs in `src/lib/services.ts` — free text can never arrive as a service
- date: real calendar date, today or later, at most 12 months ahead
- notes: max 1000 characters, line breaks allowed, no markup, control characters or
  `javascript:`-style schemes
- invisible characters (zero-width, bidi overrides) are stripped from single-line fields

The earliest selectable day is today's calendar day in the workshop's time zone
(`todayIso()` in `src/lib/dates.ts`, `Europe/Berlin`), so "today" does not drift with the visitor's
clock, and the date picker (react-day-picker in a Radix popover) disables every day outside that
window. Values that fail validation stay in the form and get translated, per-field messages plus a
summary with `role="alert"`.

**Email preview.** `buildDemoEmailPreview(appointment, { locale, translate })`
(`src/lib/appointment/email-preview.ts`) is a pure function: sender, recipient, subject and a
`text/plain` body, built from the entries and the active locale — no network call, no environment
variable, no side effect. The dialog renders that body as text (never as HTML), scrolls when the
notes are long and breaks long inputs instead of overflowing. It has a title, a close button, closes
on Escape and returns the focus to the button that opened it. There is deliberately no "send"
button, no fake loading state and no booking number anywhere in the flow.

**Note:** filling the form requires JavaScript, since the date is supplied by the calendar
component rather than by a plain text field.

## Legal pages and the operator's details

Two pages, one source of personal data, and both as short as a portfolio site needs them.

- **`src/lib/legal/operator.ts`** — the only file holding personal data, and the only place where
  it is ever typed by hand. `name`, `strasse`, `ort` and `email` carry the details § 5 Abs. 1 Nr. 1
  and Nr. 2 DDG asks for; `telefon` and `ustIdNr` are rendered only when filled in. Details that
  would need a real business (register entry, legal representation, supervisory authority,
  § 18 Abs. 2 MStV) are not part of the page at all — `docs/LEGAL_SETUP.md` says when they would
  have to be added.
- **`src/app/[locale]/impressum/page.tsx`** — one sentence about the fictional project, the
  operator's address and the contact email. Nothing else: no warnings, no counters, no explanations
  of legal cases that do not apply here, no liability sections carried over from the repealed TMG.
- **`src/app/[locale]/datenschutz/page.tsx`** — five short sections that match what this build
  actually does: the controller (same person, with contact), hosting at Vercel including the access
  data that delivery requires and Art. 6(1)(f) GDPR as its basis, the language cookie and the
  `theme` entry in local storage, the request form that never leaves the browser, and the data
  subject's rights (Art. 15–21 and 77 GDPR). Fonts are mentioned where they belong: fetched at
  build time, served from the same origin.
- **`src/components/LegalAngabe.tsx`** — two small building blocks: `Angabe` (a value, or a
  placeholder) and `Anschrift` (the address block in an `<address>` element, used by both pages so
  they cannot drift apart).

What an empty field does, automatically:

1. it renders as an unmistakable placeholder — `[noch eintragen: Name]`, italic and muted, marked
   with `data-rechts-platzhalter="true"` for the specs — never as an invented value
2. an optional field with no value renders not at all
3. the specs cover both states — every legal test names the state it expects and starts from
   there, so entering, changing or removing a value cannot break the suite

Entered in the file right now: name, street, city and email address of the person publishing this
repository; `telefon` and `ustIdNr` are open and therefore absent from the pages.

Everything that is still open — the data-processing agreement with the host, log retention and
region, third-country transfer, the § 25 Abs. 1 TDDDG assessment for the language cookie, the
§ 18 Abs. 2 MStV question, the not-legally-reviewed status of the texts — lives in
[docs/LEGAL_SETUP.md](docs/LEGAL_SETUP.md). None of it appears in the public prose: the specs assert
that the rendered legal texts contain no file paths, no counters and no open-item lists.

## Not indexed — and still crawlable

`noindex, nofollow` would be useless if a crawler were not allowed to read it. So the three carriers
are consistent:

| Carrier | Value | File |
| --- | --- | --- |
| Metadata of every page | `noindex, nofollow, nocache` (+ `googlebot` incl. `noimageindex`) | `src/lib/metadata.ts` |
| HTTP header of every response | `X-Robots-Tag: noindex, nofollow` | `next.config.js` |
| robots.txt | `User-Agent: *`, `Allow: /`, no sitemap entry | `src/app/robots.ts` |

Metadata is assembled once in `seitenMetadaten()` (`src/lib/metadata.ts`), which also pins
`metadataBase`, canonical and `og:url` to the single production URL in `src/lib/site.ts`. A page
that forgets its metadata now inherits the correct robots behaviour from the layout instead of
defaulting to “index me”. `e2e/seo.spec.ts` asserts all of this against a production build,
including that no page mentions the old address any more.

## Brand colour and contrast

The brand green `#59a305` is loud: white text on it measures **3.15:1**, below the 4.5:1 of
WCAG 1.4.3. Instead of an exception in the accessibility run, the surfaces were separated by role
(`src/app/globals.css`):

| Token | Light scheme | Dark scheme | Used for | Contrast |
| --- | --- | --- | --- | --- |
| `--color-brand` | `#59a305` | `#3f6b0b` | accents and decorative fills, never a surface under text | unchanged |
| `--color-brand-strong` | `#3f6b0b` | `#3f6b0b` | every surface that carries white text: header, footer, primary buttons | **6.33:1** with white |
| `--color-brand-line` | `#4a8805` | `#7fc11b` | borders, focus rings, links — against the page surface, not under white text | **4.36:1** on white (large text / UI component) |

In the dark scheme the brand surface and the text surface are the same colour (already dark enough
for white text), and the line tone gets lighter because it needs contrast on the dark page ground
(`#0f1511`).

`e2e/a11y.spec.ts` runs axe with **no rule exceptions**, and `e2e/header.spec.ts` measures the brand
surfaces directly: it reads the computed text colour and the computed surface from the browser,
composites translucent text over it and asserts ≥ 4.5:1 in the light **and** the dark scheme. It also
asserts that the logo is rendered undistorted — the file measures 2172 × 724 (exactly 3:1), the
`next/image` attributes carry those real dimensions, and `h-auto` plus `sizes` keep the rendered box
in the same ratio at desktop and at 375 px.

## Privacy by scope

Nothing is sent, so little can leak — and what does happen is described on the privacy policy page
instead of being denied:

- the appointment values never leave the browser context; they are not written to storage, do not
  appear in the URL and there is no server that could log them
- the hosting provider processes technical access data when a page is delivered; that is the only
  processing that happens while someone just reads
- stored in the browser are exactly two things: the chosen language (`NEXT_LOCALE` cookie) and the
  chosen colour scheme (`theme` in local storage)
- fonts are downloaded at build time and served from the same origin; reading a page opens no
  connection to a font provider
- there are no analytics, advertising or social-media embeds, no embedded video, no map and no
  third-party script. The only external address on the page is the portfolio link above the header,
  and that is a plain `<a>`: nothing loads until someone activates it
- the Google Maps embed left together with the directions it belonged to, so the page no longer asks
  for cookie consent anywhere

Whether the language cookie and the local theme entry need a consent banner (§ 25 Abs. 1 TDDDG) is
an open legal item; it is worked off in `docs/LEGAL_SETUP.md` and deliberately absent from the
public texts.

## Testing

Three layers: 195 unit tests and 75 browser scenarios — functional flows, axe-core over eleven
views and responsive layout checks, every one of them against a real production build. Everything
below runs unattended in GitHub Actions, no manual clicking.

- **Unit tests** (`src/lib/__tests__`, `src/components/__tests__`) cover presentational components,
  the Header's navigation/scroll logic and its logo geometry, the date helpers (time zones,
  daylight-saving boundaries), the language switcher, theme toggle, footer, the demo-flow section,
  the Zod schema of the demo request (optional fields, injection attempts, calendar boundaries),
  the email-preview builder in both locales, the metadata factory (canonical, `og:url`, robots,
  OG image), the operator configuration, the robots.txt and the loading state. The client-side state
  is covered too: `BookingProvider` keeps a
  request across remounts and touches no storage, no cookie and no `fetch` — the same rule asserted
  for the form.
- **Legal page tests** (`src/components/__tests__/Rechtsseiten.test.tsx`) render both pages as
  server components in both locales and cover the state that a browser run cannot produce: with test
  values entered, every placeholder disappears and the optional phone and VAT lines appear.
- **E2E tests** (`e2e/`) verify cross-page navigation, language switching, the service detail dialog
  (opens with the clicked service, closes via button/Escape), the whole demo request flow
  (dialog → form → summary → email preview) including validation messages, the notice after a
  reload, mobile viewports, dark mode, keyboard operation and the English locale — all against a
  real production build. One spec listens on every request and fails if completing a request
  triggers a POST or carries a typed value anywhere on the wire.
- **Responsive checks** (`e2e/responsive.spec.ts`) measure both widths in the DOM: at 375 px the
  menu button takes over the navigation, opens on click, closes on a link and on a press outside
  it, and the footer still reaches both legal pages; at 1280 px the link chain needs no click at
  all. Neither width may run past the viewport edge, and the hero image keeps the proportions of
  its file (1686×346) — the header logo is measured the same way in `e2e/header.spec.ts`.
- **Legal & SEO specs** (`e2e/legal.spec.ts`, `e2e/seo.spec.ts`) walk from the footer to both legal
  pages in both languages, check that placeholders are marked as placeholders, that the policy
  names the technology actually used, that the language switch really produces a session cookie —
  and that noindex, `X-Robots-Tag`, robots.txt, canonical and `og:url` agree on the new address.
- **Accessibility tests** (`e2e/a11y.spec.ts`) run axe-core over the homepage in both locales, the
  open service dialog, the appointment form, the open calendar popover, the summary, the open email
  preview, the notice shown without a request, **Impressum, Datenschutzerklärung** and the 404 page.
  Any violation fails the pipeline; there is no exception list.

### Coverage

`bun run test:coverage` fails when coverage drops below the thresholds in `vitest.config.ts`
(current floor: 87 % statements/lines, 88 % functions, 84 % branches). The floor is today's measurement,
not a wish — Server Component pages (`layout.tsx`, `page.tsx`, `termin-anfrage`, `bestaetigung`)
are still exercised by the E2E specs in a real browser, so they contribute 0 % to the jsdom number.
Raise the thresholds when you add tests, never lower them to green.

Measured now: **87.52 % statements, 84.54 % branches, 89.43 % functions, 87.50 % lines.** Where to
read it without digging through logs: the *Unit-Tests & Abdeckung* check shows a summary table on
the run page, `coverage/index.html` (artifact of every run) gives the line-by-line view, and the job
log prints the per-file table. Reporters are `text`, `html` and `json-summary`; output lands in
`coverage/`, which is git-ignored like `.next/` and cleaned on every run.

### Accessibility: no exceptions

Earlier revisions of this project documented one tolerated axe finding (white on the loud brand
green). That exception is gone: the surfaces that carry white text now use `--color-brand-strong`
(6.33:1 against white), thin brand-coloured elements use `--color-brand-line`, and the calendar's
today/selection markers moved to tones that clear the dark calendar surface. `e2e/a11y.spec.ts`
therefore configures no rule exclusions and no per-node tolerance — every finding fails the
pipeline, on all eleven views. The measured contrast of the brand surfaces is pinned separately in `e2e/header.spec.ts`, so the topic stays covered even where axe
would otherwise be silent about decorative surfaces.

### No screenshot comparison, on purpose

This project used to compare rendered pixels against committed baselines. That layer is gone,
deliberately: this is a portfolio site whose UI/UX keeps changing, and keeping reference images
current cost more than they found.

- baselines are platform specific, so they had to be generated in CI on Ubuntu while the work
  happens on Windows — every intended layout change meant a workflow run, a downloaded
  artifact and a commit of eight PNGs;
- the tolerance was a pixel ratio, insensitive exactly where this site changes most: text on
  short pages such as the legal ones stayed below it;
- nothing it found was out of reach for a DOM assertion.

What the screenshots were good for is asserted instead, without a reference image: the geometry
of the two large images (`e2e/header.spec.ts`, `e2e/responsive.spec.ts`), the measured contrast
of the brand surfaces (`e2e/header.spec.ts`), axe-core over eleven views (`e2e/a11y.spec.ts`),
dialog and form boxes staying inside the viewport at 360 px (`e2e/services-dialog.spec.ts`,
`e2e/termin-anfrage.spec.ts`) and the horizontal overflow check in `e2e/responsive.spec.ts`.
That last one is not hypothetical: it is how the 7 px overflow of the menu button was found.

Playwright still records traces, screenshots and the HTML report for **failed** functional
tests; `playwright-report/` and `test-results/` stay git-ignored and stay uploaded as CI
artifacts. Gone is the committed reference image, not the failure diagnostics.

### Pipeline

`.github/workflows/ci.yml` runs four jobs, cheapest first. Job names are written exactly as GitHub
shows them, because the ruleset matches on those strings; durations are the measured wall times of
recent runs on `main`:

| Stage | Job | Measured | Catches |
| ----- | --- | -------- | ------- |
| 1 | `Lint, Typen & Format` | ~15 s | typos, broken types, formatting |
| 1 | `Unit-Tests & Abdeckung` | ~20 s | logic and component behaviour |
| 2 | `Production Build` | ~30 s | anything that builds locally but not in production mode |
| 3 | `E2E & Barrierefreiheit` | ~50 s | broken pages, forms, i18n, semantics |

The first three jobs start together; the browser stage waits for the build and reuses it through an
artifact, so the app is built exactly once per run and the whole pipeline is done in about 90
seconds. `workflow_dispatch` has no inputs and runs the same four jobs on demand — useful for
walking the whole sequence on a branch without opening a pull request.

Current action versions: `actions/checkout@v7`, `actions/upload-artifact@v7` and
`actions/download-artifact@v7` (the v4 line still runs on the deprecated Node 20 runner), and
`oven-sh/setup-bun@v2` **without** a `cache` input — that action has none, and passing one makes the
step fail. It caches the Bun binary itself; the dependencies install uncached from `bun.lock`
(`bun install --frozen-lockfile`), which keeps the whole pipeline near its ~90 seconds.

### Line endings

`.gitattributes` pins `* text=auto eol=lf`, so repository, CI and every clone agree on LF and
`bun run fmt:check` answers the same on Windows as on Ubuntu. Without it, a working copy with
`core.autocrlf=true` reports every file as unformatted although nothing changed — and it is a good
way to mangle keys such as `runs-on` into `runs_on` while “fixing” line endings by hand.

### Set up on the hosted side (not visible in the code)

- **Rulesets `protect-main` and `protect-main-branch`** — Settings → Rules → Rulesets, status
  *Active*, empty bypass list: pull request required, force pushes and branch deletion blocked,
  and all four jobs above must be green before a merge. Names are matched exactly, so renaming a
  job updates the gate.

  > **Manual step: the removed job is still a required status check.** Read from the GitHub API
  > on 2026-11-11, both rulesets (ids 26696972 and 26697354, with
  > `strict_required_status_checks_policy: false`) still require a check named
  > `Visuelle Regression`. That job no longer exists, so the check never reports — and GitHub
  > holds a required check that never runs at *Expected*, which blocks every pull request.
  >
  > Remove it in the UI: **Settings → Rules → Rulesets → each of the two → Status checks →**
  > delete `Visuelle Regression` → **Save**. Nothing in this repository can do it, rulesets are
  > hosted settings. With the CLI (needs `gh` and `jq`):
  >
  > ```bash
  > for id in 26696972 26697354; do
  >   gh api repos/dannykoehlerpoetsch/autoservice-demontage/rulesets/$id \
  >     | jq "{name, enforcement, target, conditions, rules}
  >       | .rules.required_status_checks.parameters.required_status_checks =
  >         [.rules.required_status_checks.parameters.required_status_checks[]
  >          | select(.context != \"Visuelle Regression\")]" > ruleset.json
  >   gh api -X PUT repos/dannykoehlerpoetsch/autoservice-demontage/rulesets/$id --input ruleset.json
  > done
  > ```
  >
  > Afterwards `E2E & Barrierefreiheit` is the only browser check in the gate, and the three
  > remaining jobs plus it make the four required checks.
- **Actions variable** `NEXT_PUBLIC_SITE_URL = https://autoservice-demontage.vercel.app`
  (Settings → Secrets and variables → Actions → **Variables**). A *variable*, not a secret:
  `NEXT_PUBLIC_*` is inlined at build time and ends up publicly in `og:url`. The same value is now
  also the compiled-in default in `src/lib/site.ts`, so a missing variable can no longer make a
  page publish `localhost` or an old address as its canonical URL.
- **Vercel** builds the repository: production on merge to `main`, one preview deployment per pull
  request, `NEXT_PUBLIC_SITE_URL` set as a Config variable for Production/Preview/Development.
- **No deploy step in this pipeline.** Vercel pulls from GitHub, so deployment stays a hosting
  decision rather than a code-quality gate.

## Renaming: done, and what is left

The rename from the old workshop project to `autoservice-demontage` is finished; this repository is
the single source of truth.

| Where | State |
| --- | --- |
| GitHub repository | `dannykoehlerpoetsch/autoservice-demontage`, website field points at the live URL |
| Local clone | branch `quality-improvement`; `origin` already carries the new slug (`git remote -v`) |
| Code & metadata | brand, `package.json` (`name`, `repository`, `bugs`, `homepage`), copy in `messages/*.json` |
| Vercel | project answers on <https://autoservice-demontage.vercel.app> |
| Old `*.vercel.app` address | answers `404 DEPLOYMENT_NOT_FOUND`; nothing of this project is served there any more |
| Git history | deliberately untouched — the commits that show the old workshop stay visible |

Nothing on the old address needs cleaning up: it belongs to Vercel, not to this project, and it
serves no content of its own. Two things to check if the address ever changes again:

1. `PRODUKTIONS_URL` in `src/lib/site.ts`, the Actions variable, the Vercel Config variable and the
   domain in Vercel → Domains (aliases and deploy hooks do not follow a rename automatically).
2. `e2e/seo.spec.ts` reads the production URL from `src/lib/site.ts` and asserts canonical,
   `og:url`, `og:image` and the old-address guard against a built page.

Indexing stays off either way: `noindex` in metadata, `X-Robots-Tag` on every response, crawling
allowed in `robots.txt`. This project is a portfolio piece, not a search result.
