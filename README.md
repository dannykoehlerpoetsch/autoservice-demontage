# Autoservice Demontage

Bilingual single-page website for a car workshop, built as a frontend portfolio project. The
workshop, its services and every appointment flow on the site are **fictional** – the site is a
demo of frontend engineering, not a real business presence.

- **Live demo:** https://autoservice-demontage.vercel.app
- **Portfolio / operator:** https://dakopo.vercel.app/
- **Detailed documentation:** [docs/README.md](docs/README.md)

## Tech stack

| Area          | Choice                                                              |
| ------------- | ------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), React 19                                   |
| Language      | TypeScript (strict)                                                 |
| Styling       | Tailwind CSS 4, class-based dark mode                               |
| i18n          | next-intl – German (default, no prefix) and English (`/en`)         |
| UI primitives | Radix UI, lucide-react icons                                        |
| Validation    | Zod schema for the appointment form                                 |
| Unit tests    | Vitest + React Testing Library + axe-core (jsdom)                   |
| E2E tests     | Playwright (chromium), axe-core injected via `@axe-core/playwright` |
| Quality gates | ESLint, Prettier, `tsc --noEmit`, Vitest coverage thresholds        |
| Runtime       | Bun scripts (works with npm as well)                                |

## Key features

- Demo appointment request: service dialog → form → summary → email **preview** (nothing is sent,
  nothing is stored server-side)
- Client-side state only (`BookingProvider`), survives in-app navigation, gone after a reload
- Language switch that keeps the current page, persisted in a session cookie
- Dark mode without flash of the wrong theme (inline theme script before hydration)
- German/English legal pages (legal notice, privacy policy) describing what the site actually does
- Metadata, canonical, hreflang, `robots.txt` and `sitemap.xml` for public indexability; only the
  demo request confirmation page stays out of the index

## Architecture highlights

- `src/lib/metadata.ts` centralises title, canonical, hreflang, Open Graph/Twitter and indexing, so
  no page can invent its own SEO behaviour
- `src/app/sitemap.ts` and `src/app/robots.ts` use the Next Metadata API and derive URLs from the
  routing rather than hand-written path strings
- `src/lib/appointment/schema.ts` is the single validation point; messages are translation keys, so
  the schema stays language-free
- `src/lib/appointment/email-preview.ts` is a pure text factory – no endpoint, no network, no
  environment variables
- `src/lib/legal/operator.ts` is the only place where real operator data would be entered; empty
  fields render as explicit placeholders instead of invented data

## Quality (measured locally on the current tree)

- Unit: **210 tests** in 28 files, all passing
- Coverage: **88.04 %** statements, **84.95 %** branches, **89.86 %** functions, **88.02 %** lines
  (thresholds: 85 / 75 / 85 / 85)
- E2E: **83 tests** in 9 specs (chromium) including axe-core scans, measured brand-surface contrast,
  responsive checks and the full demo flow
- SEO: Lighthouse reports **100 / 100** for `/` and `/en` against a production build
- Lint, Prettier check and `tsc --noEmit` are clean

```bash
bun install
bun run dev          # http://localhost:3000
bun run test         # unit tests
bun run test:e2e     # Playwright (builds and serves the app itself)
bun run test:coverage
bun run build
```

## Documentation

- [docs/README.md](docs/README.md) – setup, project structure, architecture, i18n, the demo
  appointment flow, testing, CI/CD, SEO, deployment and known limitations
- [.github/workflows/ci.yml](.github/workflows/ci.yml) – the four CI jobs enforced by the branch
  protection rulesets

## Disclaimer

This is a fictional project by DaKoPo for portfolio purposes. The workshop, its address, contact
data, prices and appointments do not exist; no request ever leaves the browser. The site links to
the DaKoPo portfolio site as an external demo target.
