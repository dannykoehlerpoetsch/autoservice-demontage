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
- **CI:** GitHub Actions (lint, typecheck, format check, unit & E2E tests)

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

| Script               | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `bun run build`      | Create production build                                           |
| `bun run start`      | Start production server                                           |
| `bun run lint`       | Run ESLint                                                        |
| `bun run fmt`        | Format code                                                       |
| `bun run fmt:check`  | Check code formatting                                             |
| `bun run test`       | Run unit tests (Vitest)                                           |
| `bun run test:watch` | Run unit tests in watch mode                                      |
| `bun run test:e2e`   | Run E2E tests (Playwright, builds & serves the app automatically) |

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

- **Unit tests** (`src/lib/__tests__`, `src/components/__tests__`) cover presentational components,
  the Header's navigation/scroll logic, the date helpers (time zones, daylight-saving boundaries)
  and the Zod schema of the appointment request, including injection attempts and the
  calendar boundaries of the date picker.
- **E2E tests** (`e2e/`) verify cross-page navigation (e.g. clicking a section link from the
  Impressum page correctly lands on the homepage section), language switching, the service detail
  dialog (opens with the clicked service, closes via button/Escape) and the whole appointment
  request flow (dialog → form → confirmation → email proposal, including validation messages and
  the English locale) against a real production build.
