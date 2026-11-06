# Bennis Garage

> Portfolio/demo project. The repair shop shown here no longer exists; this project exists solely
> to demonstrate frontend development skills. The site is excluded from search engine indexing
> (`noindex`, `robots.txt`).

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
    [locale]/        # Localized routes (layout, home page, impressum, appointment request)
    robots.ts         # robots.txt (disallow all — portfolio demo, not indexed)
    not-found.tsx      # Fallback 404 for invalid locale segments
  components/          # UI components
  i18n/                # next-intl routing, navigation & request config
  lib/
    appointment/       # Appointment flow: Zod schema, in-memory store, server actions, mail
    dates.ts           # Time-zone-safe calendar-date helpers
    services.ts        # Stable service IDs shared by dialog, form and validation
messages/
  de.json, en.json      # Translated content, per locale
e2e/                     # Playwright E2E tests
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

Three layers, ~120 unit tests and ~29 browser scenarios. Everything below runs unattended in
GitHub Actions — no manual clicking.

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
pipeline runs on:

1. GitHub → Actions → **CI** → **Run workflow** → tick `update_snapshots`.
2. Download the `playwright-snapshots` artifact and unpack it into `e2e/`.
3. Commit `e2e/visual.spec.ts-snapshots/*-linux-*.png` (or the `-chromium-linux.png` files).

Locally generated baselines (`*-win32.png`, `*-darwin.png`) are git-ignored on purpose; they make
`bun run test:e2e:visual` useful on your machine without polluting the repo. Until Linux baselines
exist, the CI job runs with `--ignore-snapshots` instead of reporting a false failure.

### Pipeline

`.github/workflows/ci.yml` runs in five stages, cheapest first — each stage only starts when the
previous one is green:

| Stage | Job | Duration | Catches |
| ----- | --- | -------- | ------- |
| 1 | Lint, Typen & Format | ~1 min | typos, broken types, formatting |
| 2 | Unit tests + coverage | ~1 min | logic and component regressions |
| 3 | Production build | ~2 min | anything that builds locally but not in production mode |
| 4 | E2E + axe | ~2 min | broken pages, forms, i18n, semantics |
| 5 | Visual regression | ~2 min | visible changes that role-based tests can't see |

Stages 1 and 2 run in parallel; stage 3 builds once and hands `.next` to stages 4 and 5 as an
artifact, so the app is built exactly once per run. `workflow_dispatch` exists to regenerate the
visual baselines (see above) and skips stages 1, 2 and 4.

### Local note: line endings

On Windows with `git config core.autocrlf true` the working copy gets CRLF while the repository stores LF, so
`bun run fmt:check` reports every file as unformatted although nothing is. The same check passes
in CI (Ubuntu checks out LF). If you want the local run to agree: `git config core.autocrlf input`
or add a `.gitattributes` with `* text=auto eol=lf`.

### One-time GitHub configuration (not in code)

1. **Settings → Branches → Add branch protection rule** for `main`:
   - *Require a pull request before merging*
   - *Require status checks to pass*: `Lint, Typen & Format`, `Unit-Tests & Abdeckung`,
     `Production Build`, `E2E & Barrierefreiheit`, `Visuelle Regression`
   - *Do not allow bypassing the above settings*
2. **Settings → Secrets and variables → Actions → Variables:** `NEXT_PUBLIC_SITE_URL` (used by the
   build).
3. **Secrets** (Environments or the deployment target, not the workflow file): `RESEND_API_KEY`,
   `MAIL_FROM`, `MAIL_REPLY_TO` — see “Email delivery” above.
4. Deploy is intentionally not part of this pipeline: connecting Vercel (or any other host) is a
   decision about where the site lives, not about code quality.

