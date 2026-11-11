import { hasLocale } from 'next-intl';
import { routing, type Locale } from './routing';

/**
 * Validates a value from the `[locale]` segment and returns a locale that certainly has a file
 * in `messages/`.
 *
 * Browsers and extensions request path names that sit at the root: `/.well-known/change-password`,
 * `/.well-known/security-contact.txt`, `/favicon.ico`. No middleware filters such paths for this
 * app, so the `[locale]` segment picks them up – `locale` then reads `.well-known`. request.ts
 * would turn that unchecked into `../../messages/.well-known.json` and throw MODULE_NOT_FOUND
 * before the 404 decision can even be made. The message shows up during startup because browsers
 * request these paths on their own.
 *
 * layout.tsx still decides the 404 through `hasLocale`; this is only about keeping the metadata of
 * a request that is rejected anyway translatable instead of throwing this error.
 */
export function toLocale(value: string | undefined): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
