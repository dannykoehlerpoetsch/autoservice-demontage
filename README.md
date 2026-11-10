# Autoservice Demontage

> Portfolio/demo project. The repair shop shown here is fictional — “Autoservice Demontage” is
> an invented brand that nobody operates; the project exists solely to demonstrate frontend
> development skills. A permanent notice above the header says so in words and links to the
> portfolio (<https://dakopo.vercel.app>), and the footer is copyrighted to DaKoPo. Every word on
> the site stays free of real contact data: no address, no phone number, no email address, no
> hours, no directions. The site is excluded from search engine indexing (`noindex`,
> `robots.txt`).
>
> **Live:** the Vercel deployment of this repository, target address once the project is renamed:
> <https://autoservice-demontage.vercel.app> — German at the root, English under `/en`. Until
> the rename the address the project carries today keeps working. `main` deploys through Vercel;
> every pull request gets its own preview URL.

## Quality in numbers

| Aspect | Status of `main` |
| --- | --- |
| Unit tests | 152 (Vitest + React Testing Library) |
| Browser scenarios | 43 — 35 functional incl. axe-core, 8 screenshot comparisons |
| Pipeline | five stages, ~90 s wall to wall, `main` protected by an active ruleset |
| Coverage | 83.2 % statements · 80.2 % branches · 80.3 % functions, floor enforced in CI |
| Accessibility | axe on ten pages/views, exactly one documented colour exception |
| Deployment | Vercel: production on merge, preview per pull request |

## What the demo shows

- a “How the demo works” section that explains the frontend-only request flow in four steps
- service cards with an accessible Radix detail dialog per service
- service preselection carried into the form across the navigation
- an interactive appointment form with Zod validation and a react-day-picker calendar
- a summary view of the completed request, including a personalized email preview
- German and English, dark and light mode, responsive from 360 px up
- keyboard operation, focus management and axe-core checks as part of the pipeline
- one CI pipeline: lint, types, format, unit tests with coverage, production build, E2E,
  accessibility and visual regression

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
- **Visual Regression:** Playwright screenshot comparison with committed baselines
- **CI:** GitHub Actions (lint, typecheck, format check, unit tests + coverage, production build, E2E, axe, visual regression)

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

| Script                    | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `bun run build`           | Create production build                                              |
| `bun run start`           | Start production server                                              |
| `bun run lint`            | Run ESLint                                                           |
| `bun run typecheck`       | Type-check the whole project (`tsc --noEmit`)                        |
| `bun run fmt`             | Format code                                                          |
| `bun run fmt:check`       | Check code formatting                                                |
| `bun run test`            | Run unit tests (Vitest)                                              |
| `bun run test:watch`      | Run unit tests in watch mode                                         |
| `bun run test:coverage`   | Run unit tests and fail below the coverage thresholds                |
| `bun run test:e2e`        | Run all E2E tests (Playwright; builds & serves the app if needed)     |
| `bun run test:e2e:functional` | E2E functional + axe tests, skipping the screenshot specs           |
| `bun run test:e2e:visual` | Screenshot specs only                                                |

## Project Structure

```
src/
  app/
    [locale]/         # Localized routes (layout, home page, impressum, appointment request)
    robots.ts         # robots.txt (disallow all — portfolio demo, not indexed)
    not-found.tsx     # Fallback 404 for invalid locale segments
  components/         # UI components (form, confirmation view, dialogs); __tests__/ holds specs
  i18n/               # next-intl routing, navigation & request config
  lib/
    appointment/      # Appointment flow: Zod schema and the pure email-preview builder
    __tests__/        # Date helpers, schema rules and email preview
    dates.ts          # Time-zone-safe calendar-date helpers
    services.ts       # Stable service IDs shared by dialog, form and validation
messages/
  de.json, en.json    # Translated content, per locale
e2e/
  *.spec.ts           # Playwright: navigation, i18n, dialog, appointment form, axe, screenshots
  visual.spec.ts-snapshots/   # Committed Linux baselines (see “Visual regression baselines”)
.github/workflows/ci.yml      # The five pipeline stages described below
playwright.config.ts          # Build & serve for the browser run, reporters, screenshot tolerances
vitest.config.ts              # Coverage scope, thresholds, reporters
```

## Internationalization

The site is available in German (default, no URL prefix) and English (`/en`), powered by
[next-intl](https://next-intl.dev). Locale is persisted via cookie and switchable through the
language dropdown in the header. All page/UI copy lives in `messages/de.json` and `messages/en.json`.

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

## Privacy by scope

Because nothing is sent, nothing can leak: the appointment values never leave the browser context,
they are not written to storage and they do not appear in server logs (there are none). The only
third-party request left on the site is the portfolio link in the notice above the header, and
that one is a plain `<a>` — nothing loads until someone activates it. The Google Maps embed
that used to sit on the homepage left together with the directions it belonged to, so the page no
longer asks for cookie consent at all and no third party can learn anything from a visit.

## Testing

Three layers: 152 unit tests and 43 browser scenarios — 35 functional and accessibility specs, 8
screenshot comparisons. Everything below runs unattended in GitHub Actions, no manual clicking.

- **Unit tests** (`src/lib/__tests__`, `src/components/__tests__`) cover presentational components,
  the Header's navigation/scroll logic, the date helpers (time zones, daylight-saving boundaries),
  the language switcher, theme toggle, footer, the demo-flow section, the Zod schema of the
  demo request (optional fields, injection attempts, calendar boundaries) and the email-preview
  builder in both locales. The client-side state is covered too: `BookingProvider` keeps a request
  across remounts and touches no storage, no cookie and no `fetch` — the same rule asserted for
  the form.
- **E2E tests** (`e2e/`) verify cross-page navigation (e.g. clicking a section link from the
  Impressum page correctly lands on the homepage section), language switching, the service detail
  dialog (opens with the clicked service, closes via button/Escape) and the whole demo request flow
  (dialog → form → summary → email preview) including validation messages, the notice after a
  reload, mobile viewports, dark mode, keyboard operation and the English locale — all against a
  real production build. One spec listens on every request and fails if completing a request
  triggers a POST or carries a typed value anywhere on the wire.
- **Accessibility tests** (`e2e/a11y.spec.ts`) run axe-core over the homepage in both locales, the
  open service dialog, the appointment form, the open calendar popover, the summary, the open email
  preview, the notice shown without a request, the impressum page and the 404 page. Any *new*
  violation fails the pipeline.
- **Visual regression** (`e2e/visual.spec.ts`, tagged `@visual`) compares one screenshot per core
  view (home in both locales and both themes, dialog, form, the no-request notice, impressum,
  404).

### Coverage

`bun run test:coverage` fails when coverage drops below the thresholds in `vitest.config.ts`
(current floor: 80 % statements/lines/functions, 78 % branches). The floor is today's measurement,
not a wish — Server Component pages (`layout.tsx`, `page.tsx`, `impressum`, `termin-anfrage`,
`bestaetigung`) are exercised by the E2E specs in a real browser, so they contribute 0 % to the
jsdom number. Raise the thresholds when you add tests, never lower them to green.

Measured with the client-side demo flow: **83.2 % statements, 80.2 % branches, 80.3 % functions**. Where to read it
without digging through logs: the *Unit-Tests & Abdeckung* check shows a summary table on the run
page, `coverage/index.html` (artifact of every run) gives the line-by-line view, and the job log
prints the per-file table. Reporters are `text`, `html` and `json-summary`; output lands in
`coverage/`, which is git-ignored like `.next/` and cleaned on every run.

### Accessibility: one deliberate exception

The brand green `#59a305` is the brand colour and stays. White text on it measures **3.15:1**,
`text-white/70` measures **2.29:1**, while WCAG 1.4.3 asks for 4.5:1 — so axe reports 7–10
`color-contrast` findings per page (header navigation, language select, call-to-action buttons,
dialog CTA, footer).

`e2e/a11y.spec.ts` tolerates exactly one thing: a `color-contrast` finding whose measured
background is that brand colour, read from axe's own `bgColor` data per node. The comparison allows
12 units per channel, because axe samples *rendered* colours and the app's 90–180 ms entrance
animations shift the measurement slightly (`#59a305` may read as `#5aa207`) — before that the two
dialog tests were flaky. Grey surfaces stay far outside that window (`#bdbdbd` is 200 units away in
the blue channel). Each measurement also waits for `document.fonts.ready` and for running
animations to settle.

Everything else keeps failing the pipeline — grey on grey, a translucent overlay label, a new
surface in a new colour. If axe ever stops reporting the background, the findings stay in the list
and the pipeline goes red rather than silently waving them through. The tolerated count is printed
to the CI log on every run (`Kontrast auf Marke #59a305: 9 Stellen`), so the exception stays visible
instead of disappearing into a green tick.

### Visual regression baselines

Baselines are platform specific (font antialiasing), so they are generated on the same OS the
pipeline runs on. Eight of them are committed as `*-chromium-linux.png` (home in de/en/light/dark,
service dialog, appointment form, impressum, 404), so the pipeline compares real pixels on every
pull request. To regenerate them after an intended redesign:

1. Run the workflow **on the branch**, so the pull request goes green on its first try:
   `gh workflow run ci.yml --ref <branch> -f update_snapshots=true` — or on GitHub:
   Actions → **CI** → **Run workflow** → pick the branch, tick `update_snapshots`.
2. `gh run download <run-id> --name playwright-snapshots -D tmp-snaps` and copy the PNGs into
   `e2e/visual.spec.ts-snapshots/`.
3. Commit them in the same pull request that changes the layout.

Locally generated baselines (`*-win32.png`, `*-darwin.png`) are git-ignored on purpose; they make
`bun run test:e2e:visual` useful on your machine without fighting platform font rendering in CI. If
a run finds no committed baseline for its platform, that job runs with `--ignore-snapshots` rather
than reporting a false failure.

### Pipeline

`.github/workflows/ci.yml` runs five jobs, cheapest first. Job names are written exactly as GitHub
shows them, because the ruleset matches on those strings; durations are the measured wall times of
recent runs on `main`:

| Stage | Job | Measured | Catches |
| ----- | --- | -------- | ------- |
| 1 | `Lint, Typen & Format` | ~15 s | typos, broken types, formatting |
| 1 | `Unit-Tests & Abdeckung` | ~20 s | logic and component behaviour |
| 2 | `Production Build` | ~30 s | anything that builds locally but not in production mode |
| 3 | `E2E & Barrierefreiheit` | ~50 s | broken pages, forms, i18n, semantics |
| 3 | `Visuelle Regression` | ~35 s | visible changes that role-based tests cannot see |

The first three jobs start together; the two browser stages wait for the build and reuse it through
an artifact, so the app is built exactly once per run and the whole pipeline is done in about 90
seconds. `workflow_dispatch` exists to regenerate the visual baselines (see above) and runs only the
build and the screenshot job.

### Line endings

`.gitattributes` pins `* text=auto eol=lf`, so repository, CI and every clone agree on LF and
`bun run fmt:check` answers the same on Windows as on Ubuntu. Without it, a working copy with
`core.autocrlf=true` reports every file as unformatted although nothing changed — and it is a good
way to mangle keys such as `runs-on` into `runs_on` while “fixing” line endings by hand.

### Set up on the hosted side (not visible in the code)

- **Ruleset `protect-main`** — Settings → Rules → Rulesets, status *Active*, empty bypass list:
  pull request required, force pushes and branch deletion blocked, and all five jobs above must be
  green before a merge. Names are matched exactly, so renaming a job updates the gate.
- **Actions variable** `NEXT_PUBLIC_SITE_URL = https://autoservice-demontage.vercel.app`
  (Settings → Secrets and variables → Actions → **Variables**). A *variable*, not a secret:
  `NEXT_PUBLIC_*` is inlined at build time and ends up publicly in `og:url`. Same value as the
  Vercel Config variable below; both only become true after the rename described at the end of
  this file.
- **Vercel** builds the repository: production on merge to `main`, one preview deployment per pull
  request, `NEXT_PUBLIC_SITE_URL` set as a Config variable for Production/Preview/Development.
- **No deploy step in this pipeline.** Vercel pulls from GitHub, so deployment stays a hosting
  decision rather than a code-quality gate.

## Renaming the project (by hand)

The working copy already carries the new name everywhere: brand and copy in `messages/*.json`,
components, tests, `package.json`, `bun.lock` and the `.idea` module file. What is left lives
outside the code, and none of it happens on its own:

1. **GitHub** — Settings → General → Repository name → `autoservice-demontage`. Existing clones
   keep working: GitHub answers the old slug with a redirect until someone claims it.
2. **Local clone** — `git remote set-url origin git@github.com:dannykoehlerpoetsch/autoservice-demontage.git`
   (verify the address in the repository sidebar first), then rename the folder if you want to.
   `.idea/workspace.xml` is not tracked and keeps the old folder path until WebStorm rewrites it.
3. **Vercel** — Settings → General → rename the project. The `*.vercel.app` address follows the new
   slug; that new address is the value the next step needs.
4. **Both variables, same value** — set `NEXT_PUBLIC_SITE_URL` in Vercel (Config Variables, all
   three environments) *and* in GitHub (Settings → Secrets and variables → Actions → Variables).
   CI builds its own copy of the metadata, so two different values mean a silently wrong `og:url`.
5. **package.json** — `repository.url`, `bugs.url` and `homepage` are already on the new slug; keep
   them in step with any later rename.
6. **After the rename** — check Vercel → Domains: aliases, redirects and any deploy hook do not
   follow a rename automatically.
7. **Indexing stays off** — `noindex` and `robots.txt` remain, whatever the address is: this project
   is a portfolio piece, not a search result.

Git history is deliberately untouched: the commits that show the old workshop stay in the history,
so renaming a repository is not a way to erase it. Rewriting history (and forcing every clone and
branch protection to follow) would be a separate, deliberate decision.
