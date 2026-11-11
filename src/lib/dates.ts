/**
 * Small, timezone-safe date helpers for the appointment request.
 *
 * Rule of thumb: an appointment travels through the application as `YYYY-MM-DD` (date only –
 * no clock time, no timezone inside the value). Conversions therefore deliberately use the
 * *local* parts of a date; `toISOString()` would shift by a day depending on the server offset.
 */

/**
 * Workshop timezone – "today" means the calendar day in Europe/Berlin, not in UTC.
 * The site is written in German; a real location is not part of a fictional workshop.
 */
export const WORKSHOP_TIME_ZONE = 'Europe/Berlin';

/** A date as `YYYY-MM-DD` */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Date -> `YYYY-MM-DD`, counted by local calendar rules. */
export function toIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` -> date at local midnight, `null` for nonsense (e.g. 2027-02-31). */
export function fromIsoDate(value: string): Date | null {
  if (!isIsoDate(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const isRealDay =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return isRealDay ? date : null;
}

/**
 * Add days to a date without DST jumps: arithmetic runs in UTC and a plain calendar day
 * comes back out.
 */
export function addIsoDays(value: IsoDate, days: number): IsoDate {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Today's calendar day in the given timezone (independent of server or browser zone). */
export function todayIso(timeZone: string = WORKSHOP_TIME_ZONE, now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/**
 * Locale tag for `Intl`: the app ships `de`/`en` (next-intl) while `Intl` wants the full tag.
 * One place for it so the calendar, the summary and the email preview write the same date.
 */
export function intlLocaleFor(locale: string): string {
  return locale.startsWith('de') ? 'de-DE' : 'en-US';
}

/** `2027-05-08` -> `Sonntag, 8. Mai 2027` (or its English equivalent) – for UI and text. */
export function formatIsoDateLong(value: IsoDate, locale: string): string {
  const date = fromIsoDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
