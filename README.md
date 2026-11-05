# Bennis Garage

> Portfolio/demo project. The repair shop shown here no longer exists; this project exists solely
> to demonstrate frontend development skills. The site is excluded from search engine indexing
> (`noindex`, `robots.txt`).

## Technologies

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI-Primitives:** Radix UI (`@radix-ui/react-dialog`, accessible service detail dialog)
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

| Script | Description |
|--------|-------------|
| `bun run build` | Create production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run fmt` | Format code |
| `bun run fmt:check` | Check code formatting |
| `bun run test` | Run unit tests (Vitest) |
| `bun run test:watch` | Run unit tests in watch mode |
| `bun run test:e2e` | Run E2E tests (Playwright, builds & serves the app automatically) |

## Project Structure

```
src/
  app/
    [locale]/        # Localized routes (layout, home page, impressum)
    robots.ts         # robots.txt (disallow all — portfolio demo, not indexed)
    not-found.tsx      # Fallback 404 for invalid locale segments
  components/          # UI components
  i18n/                # next-intl routing, navigation & request config
messages/
  de.json, en.json      # Translated content, per locale
e2e/                     # Playwright E2E tests
```

## Internationalization

The site is available in German (default, no URL prefix) and English (`/en`), powered by
[next-intl](https://next-intl.dev). Locale is persisted via cookie and switchable through the
language dropdown in the header. All page/UI copy lives in `messages/de.json` and `messages/en.json`.

## Testing

- **Unit tests** (`src/components/__tests__`) cover presentational components and the Header's
  navigation/scroll logic in isolation.
- **E2E tests** (`e2e/`) verify cross-page navigation (e.g. clicking a section link from the
  Impressum page correctly lands on the homepage section), language switching and the service
  detail dialog (opens with the clicked service, closes via button/Escape) against a real
  production build.