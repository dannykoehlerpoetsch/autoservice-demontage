# Bennis Garage

> Portfolio/demo project. The repair shop shown here no longer exists; this project exists solely
> to demonstrate frontend development skills. The site is excluded from search engine indexing
> (`noindex`, `robots.txt`).
>
> **Live:** <https://bennis-garage.vercel.app> — German at the root, English under `/en`.
> `main` deploys through Vercel; every pull request gets its own preview URL.

## Quality in numbers

| Aspect | Status of `main` |
| --- | --- |
| Unit tests | 118 (Vitest + React Testing Library) |
| Browser scenarios | 29 — 22 functional incl. axe-core, 7 screenshot comparisons |
| Pipeline | five stages, ~90 s wall to wall, `main` protected by an active ruleset |
| Coverage | 77.8 % statements · 67.0 % branches · 77.7 % functions, floor enforced in CI |
| Accessibility | axe on seven pages/views, exactly one documented colour exception |
| Deployment | Vercel: production on merge, preview per pull request |

## Technologies

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI-Primitives:** Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-popover`; accessible service detail dialog and date-picker popover)
- **i18n:** next-intl (German/English, locale-aware routing)
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
  components/         # UI components; __tests__/ holds their Vitest specs
  i18n/               # next-intl routing, navigation & request config
  lib/
    appointment/      # Appointment flow: Zod schema, in-memory store, server actions, mail
    __tests__/        # Date helpers, appointment store and server actions
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

## Appointment requests

The CTA in the service detail dialog stores the selected service and opens `/termin-anfrage`
(`BookingProvider` carries the selection across the navigation, the form preselects it). The form
collects name, phone number, email, requested service, notes and a desired date; submitting stores
the request and redirects to `/termin-anfrage/bestaetigung?id=<uuid>`, which shows every value
again and offers to send a copy of the request to the email address on file. Both pages are
localized and reachable in German and English.

**Validation.** The form is only a collector — every field is validated by one Zod schema on the
server (`src/lib/appointment/schema.ts`), so the rules cannot be bypassed by editing the DOM or by
submitting without JavaScript. That schema is the single place that decides what is allowed:

- name, phone, email, service and date are required; notes are optional
- name: 2–60 characters, letters (incl. umlauts and accented Latin), spaces, `., -` and apostrophes
- phone: 6–15 digits with an optional leading `+` and the usual separators
- email: single address, RFC-shaped, normalized to lowercase
- service: one of the stable IDs in `src/lib/services.ts` — free text can never arrive as a service
- date: real calendar date, today or later, at most 12 months ahead
- notes: max 1000 characters, line breaks allowed, no markup, control characters or
  `javascript:`-style schemes
- invisible characters (zero-width, bidi overrides) are stripped from single-line fields

The date picker (react-day-picker in a Radix popover) already disables every day outside that
window, and the earliest selectable day comes from the server so that "today" does not depend on
the visitor's clock or time zone. Values that fail validation are echoed back with translated,
per-field messages.

**How submissions are stored.** Requests are kept in a server-side in-memory store
(`src/lib/appointment/store.ts`): 24 hours, at most 500 entries, cleared on every restart. This is
deliberately not a database — the demo never books anything. It is also what makes the email
proposal safe: the confirmation page only carries the request's random UUID, and the mail action
re-reads the stored request instead of trusting anything from the client, which would otherwise
turn the endpoint into an open mail relay. Each request can be mailed at most once, and it requires
an explicit opt-in in the form.

### Email delivery (optional)

Without configuration the page says so openly ("no email delivery configured") and logs the
message instead of pretending it was sent. To actually send mail, set environment variables —
Resend wins if both are present:

| Provider | Variables                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| Resend   | `RESEND_API_KEY`, `MAIL_FROM` (`Angaben <antwort@example.com>`), optional `MAIL_REPLY_TO`                      |
| SMTP     | `SMTP_URL` **or** `SMTP_HOST` (+ `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`), optional `MAIL_FROM`, `MAIL_REPLY_TO` |

Copy `.env.example` to `.env.local` and fill in what you need. Messages are sent as `text/plain`
only — user input never becomes HTML — and always to the address from the stored request.

**Note:** filling the form requires JavaScript, since the date is supplied by the calendar
component rather than by a plain text field.

## Testing

Three layers: 118 unit tests and 29 browser scenarios — 22 functional and accessibility specs, 7
screenshot comparisons. Everything below runs unattended in GitHub Actions, no manual clicking.

- **Unit tests** (`src/lib/__tests__`, `src/components/__tests__`) cover presentational components,
  the Header's navigation/scroll logic, the date helpers (time zones, daylight-saving boundaries),
  the language switcher, theme toggle, footer, the consent-gated map embed and the Zod schema of
  the appointment request, including injection attempts and the calendar boundaries of the date
  picker. The appointment server actions and the in-memory store are covered too: only the random
  ID of the stored copy grants access, and every request can be mailed exactly once.
- **E2E tests** (`e2e/`) verify cross-page navigation (e.g. clicking a section link from the
  Impressum page correctly lands on the homepage section), language switching, the service detail
  dialog (opens with the clicked service, closes via button/Escape) and the whole appointment
  request flow (dialog → form → confirmation → email proposal, including validation messages and
  the English locale) against a real production build.
- **Accessibility tests** (`e2e/a11y.spec.ts`) run axe-core over the homepage in both locales, the
  open service dialog, the appointment form, the open calendar popover, the impressum page and the
  404 page. Any *new* violation fails the pipeline.
- **Visual regression** (`e2e/visual.spec.ts`, tagged `@visual`) compares one screenshot per core
  view (home in both locales and both themes, dialog, form, impressum, 404).

### Coverage

`bun run test:coverage` fails when coverage drops below the thresholds in `vitest.config.ts`
(current floor: 75 % statements/lines/functions, 65 % branches). The floor is today's measurement,
not a wish — Server Component pages (`layout.tsx`, `page.tsx`, `impressum`, `termin-anfrage`,
`bestaetigung`) are exercised by the E2E specs in a real browser, so they contribute 0 % to the
jsdom number. Raise the thresholds when you add tests, never lower them to green.

Measured on `main`: **77.8 % statements, 67.0 % branches, 77.7 % functions**. Where to read it
without digging through logs: the *Unit-Tests & Abdeckung* check shows a summary table on the run
page, `coverage/index.html` (artifact of every run) gives the line-by-line view, and the job log
prints the per-file table. Reporters are `text`, `html` and `json-summary`; output lands in
`coverage/`, which is git-ignored like `.next/` and cleaned on every run.

### Accessibility: one deliberate exception

The brand green `#59a305` is the brand colour and stays. White text on it measures **3.15:1**,
`text-white/70` measures **2.29:1**, while WCAG 1.4.3 asks for 4.5:1 — so axe reports 7–10
`color-contrast` findings per page (header navigation, language select, phone button, dialog CTA,
footer).

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
pipeline runs on. Seven of them are committed as `*-chromium-linux.png` (home in de/en/light/dark,
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
- **Actions variable** `NEXT_PUBLIC_SITE_URL = https://bennis-garage.vercel.app`
  (Settings → Secrets and variables → Actions → **Variables**). A *variable*, not a secret:
  `NEXT_PUBLIC_*` is inlined at build time and ends up publicly in `og:url`.
- **Vercel** builds the repository: production on merge to `main`, one preview deployment per pull
  request, `NEXT_PUBLIC_SITE_URL` set as a Config variable for Production/Preview/Development.
- **Mail is deliberately unconfigured** — no `RESEND_API_KEY`, no `SMTP_*`: the app states openly
  that delivery is off and logs the message instead of pretending to send (see “Email delivery”).
- **No deploy step in this pipeline.** Vercel pulls from GitHub, so deployment stays a hosting
  decision rather than a code-quality gate.

